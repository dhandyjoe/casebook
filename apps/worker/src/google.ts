import { SignJWT, createRemoteJWKSet, importPKCS8, jwtVerify } from 'jose'
import type { User } from './app'

interface Env {
  FIREBASE_PROJECT_ID: string
  SERVICE_ACCOUNT_JSON: string
}

const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'))

export async function verifyIdToken(env: Env, token: string): Promise<string> {
  const { payload } = await jwtVerify(token, JWKS, { issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`, audience: env.FIREBASE_PROJECT_ID })
  if (!payload.sub) throw new Error('no sub')
  return payload.sub
}

async function accessToken(env: Env): Promise<string> {
  const sa = JSON.parse(env.SERVICE_ACCOUNT_JSON) as { client_email: string; private_key: string }
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/cloud-platform' })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(sa.client_email).setSubject(sa.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt().setExpirationTime('1h')
    .sign(await importPKCS8(sa.private_key, 'RS256'))
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!res.ok) throw new Error(`token: ${res.status}`)
  return ((await res.json()) as { access_token: string }).access_token
}

/** Anggota workspace = dokumen users/{uid} dengan workspaceId sama (lihat firebase/firestore.rules). */
export async function listWorkspaceUsers(env: Env, uid: string): Promise<User[]> {
  const headers = { Authorization: `Bearer ${await accessToken(env)}` }
  const fs = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`

  const me = await fetch(`${fs}/users/${uid}`, { headers })
  if (!me.ok) return []
  const workspaceId = ((await me.json()) as { fields?: { workspaceId?: { stringValue?: string } } }).fields?.workspaceId?.stringValue
  if (!workspaceId) return []

  const q = await fetch(`${fs}:runQuery`, {
    method: 'POST', headers,
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'users' }], where: { fieldFilter: { field: { fieldPath: 'workspaceId' }, op: 'EQUAL', value: { stringValue: workspaceId } } } } }),
  })
  if (!q.ok) throw new Error(`firestore: ${q.status}`)
  const members = new Set(((await q.json()) as { document?: { name: string } }[]).flatMap((r) => (r.document ? [r.document.name.split('/').pop()!] : [])))

  // shortcut: satu halaman (1000 akun), tambah nextPageToken bila Auth melewati itu.
  const auth = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts:batchGet?maxResults=1000`, { headers })
  if (!auth.ok) throw new Error(`auth: ${auth.status}`)
  const { users = [] } = (await auth.json()) as { users?: { localId: string; displayName?: string; email?: string }[] }
  return users
    .filter((u) => members.has(u.localId))
    .map((u) => ({ uid: u.localId, name: u.displayName || u.email || u.localId }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
