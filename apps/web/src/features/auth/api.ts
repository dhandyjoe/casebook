import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  setPersistence,
  signInWithEmailAndPassword,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

export type Session = { uid: string; name: string; initials: string; workspaceId: string }

export function toSession(user: User, workspaceId = ''): Session {
  const name = user.displayName || user.email || ''
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
  return { uid: user.uid, name, initials, workspaceId }
}

// Workspace tersimpan di users/{uid} saat Register; kosong bila profil belum ada (rules lalu menolak semua data project).
export async function loadWorkspaceId(uid: string): Promise<string> {
  try {
    return (await getDoc(doc(db, 'users', uid))).data()?.workspaceId ?? ''
  } catch {
    return ''
  }
}

export async function signIn(email: string, password: string, remember: boolean) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
  await signInWithEmailAndPassword(auth, email, password)
}

export const signOut = () => firebaseSignOut(auth)

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email)

// AUTH-01 + WS-01: akun terikat ke salah satu workspace statis; rules hanya menerima id dari daftar itu.
export async function register(input: { name: string; workspaceId: string; email: string; password: string }): Promise<Session> {
  const { user } = await createUserWithEmailAndPassword(auth, input.email, input.password)
  await updateProfile(user, { displayName: input.name })
  await setDoc(doc(db, 'users', user.uid), { name: input.name, workspaceId: input.workspaceId })
  return toSession(user, input.workspaceId)
}

// Kode error Firebase → kunci teks UI. Login memakai satu pesan agar tidak membocorkan email terdaftar.
export function authErrorKey(e: unknown): string {
  switch ((e as { code?: string }).code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email': return 'auth.errors.credentials'
    case 'auth/email-already-in-use': return 'auth.errors.emailInUse'
    case 'auth/weak-password': return 'auth.errors.weakPassword'
    case 'auth/too-many-requests': return 'auth.errors.tooMany'
    case 'auth/network-request-failed': return 'auth.errors.network'
    case 'permission-denied': return 'auth.errors.workspace'
    default: return 'auth.errors.generic'
  }
}
