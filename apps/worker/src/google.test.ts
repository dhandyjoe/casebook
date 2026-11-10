import { SignJWT, exportJWK, exportPKCS8, generateKeyPair } from 'jose'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { listWorkspaceUsers, verifyIdToken } from './google'

const PROJECT = 'demo-casebook'
let env: { FIREBASE_PROJECT_ID: string; SERVICE_ACCOUNT_JSON: string }
let signer: CryptoKey

beforeAll(async () => {
  const google = await generateKeyPair('RS256', { extractable: true })
  signer = google.privateKey
  const jwk = { ...(await exportJWK(google.publicKey)), kid: 'k1', alg: 'RS256' }
  const sa = await generateKeyPair('RS256', { extractable: true })
  env = { FIREBASE_PROJECT_ID: PROJECT, SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'sa@x.iam', private_key: await exportPKCS8(sa.privateKey) }) }
  routes.jwks = () => Response.json({ keys: [jwk] })
})

const routes: Record<string, (req: Request) => Response | Promise<Response>> = {}
const route = (url: string) =>
  url.includes('/jwk/') ? 'jwks' : url.includes('oauth2') ? 'token' : url.includes(':runQuery') ? 'query' : url.includes('accounts:batchGet') ? 'auth' : 'user'
vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const req = new Request(input, init)
  return routes[route(req.url)]!(req)
}))
afterEach(() => { for (const k of ['token', 'query', 'auth', 'user']) delete routes[k] })

const idToken = (claims: { sub?: string; aud?: string; iss?: string } = {}) => {
  const jwt = new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'k1' }).setIssuedAt().setExpirationTime('1h')
    .setIssuer(claims.iss ?? `https://securetoken.google.com/${PROJECT}`).setAudience(claims.aud ?? PROJECT)
  return ('sub' in claims ? (claims.sub ? jwt.setSubject(claims.sub) : jwt) : jwt.setSubject('u1')).sign(signer)
}

describe('verifyIdToken', () => {
  it('returns the uid of a valid Firebase token', async () => {
    expect(await verifyIdToken(env, await idToken())).toBe('u1')
  })

  it.each([
    ['another project', { aud: 'other' }],
    ['another issuer', { iss: 'https://evil.example' }],
    ['no subject', { sub: '' }],
  ])('rejects a token for %s', async (_, claims) => {
    await expect(verifyIdToken(env, await idToken(claims))).rejects.toThrow()
  })

  it('rejects garbage', async () => {
    await expect(verifyIdToken(env, 'not-a-jwt')).rejects.toThrow()
  })
})

describe('listWorkspaceUsers', () => {
  const doc = (uid: string) => ({ document: { name: `projects/${PROJECT}/databases/(default)/documents/users/${uid}` } })
  const happy = () => {
    routes.token = () => Response.json({ access_token: 'at' })
    routes.user = () => Response.json({ fields: { workspaceId: { stringValue: 'alpha-qa' } } })
    routes.query = () => Response.json([doc('u1'), doc('u3'), { readTime: 'x' }])
    routes.auth = () => Response.json({ users: [
      { localId: 'u3', email: 'zed@x.io' }, { localId: 'u1', displayName: 'Rina' }, { localId: 'u2', displayName: 'Other WS' }, { localId: 'u4' },
    ] })
  }

  it('returns the Auth users of the same workspace, sorted by name', async () => {
    happy()
    let body: unknown
    let auth: string | null = null
    routes.query = async (req) => {
      auth = req.headers.get('Authorization')
      body = await req.json()
      return Response.json([doc('u1'), doc('u3'), doc('u4'), { readTime: 'x' }])
    }
    expect(await listWorkspaceUsers(env, 'u1')).toEqual([{ uid: 'u1', name: 'Rina' }, { uid: 'u4', name: 'u4' }, { uid: 'u3', name: 'zed@x.io' }])
    expect(auth).toBe('Bearer at')
    expect(JSON.stringify(body)).toContain('"stringValue":"alpha-qa"')
  })

  it('returns nobody when the caller has no profile or no workspace', async () => {
    happy()
    routes.user = () => new Response('', { status: 404 })
    expect(await listWorkspaceUsers(env, 'u1')).toEqual([])
    routes.user = () => Response.json({ fields: {} })
    expect(await listWorkspaceUsers(env, 'u1')).toEqual([])
  })

  it.each([
    ['token', 'token: 400'],
    ['query', 'firestore: 403'],
    ['auth', 'auth: 500'],
  ])('throws when the %s call fails', async (step, message) => {
    happy()
    routes[step] = () => new Response('', { status: Number(message.split(': ')[1]) })
    await expect(listWorkspaceUsers(env, 'u1')).rejects.toThrow(message)
  })
})
