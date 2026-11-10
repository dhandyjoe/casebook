import * as fbAuth from 'firebase/auth'
import { seed, store, resetFirestore } from '@/lib/fakeFirestore'
import { authErrorKey, loadWorkspaceId, register, signIn, toSession } from './api'

vi.mock('firebase/firestore', () => import('@/lib/fakeFirestore'))
vi.mock('firebase/auth', async (orig) => ({
  ...(await orig<typeof import('firebase/auth')>()),
  setPersistence: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
}))

const user = { uid: 'u1', displayName: 'rina saputra dewi', email: 'r@x.io' } as fbAuth.User

beforeEach(resetFirestore)

it('builds initials from the first two words, falling back to email', () => {
  expect(toSession(user, 'alpha-qa')).toEqual({ uid: 'u1', name: 'rina saputra dewi', initials: 'RS', workspaceId: 'alpha-qa' })
  expect(toSession({ uid: 'u2', displayName: null, email: 'b@x.io' } as fbAuth.User)).toEqual({ uid: 'u2', name: 'b@x.io', initials: 'B', workspaceId: '' })
})

it('loads the workspace from the profile, empty when missing or unreadable', async () => {
  seed('users/u1', { workspaceId: 'beta-squad' })
  expect(await loadWorkspaceId('u1')).toBe('beta-squad')
  expect(await loadWorkspaceId('u2')).toBe('')
  const fs = await import('@/lib/fakeFirestore')
  vi.spyOn(fs, 'getDoc').mockRejectedValueOnce(Object.assign(new Error('denied'), { code: 'permission-denied' }))
  expect(await loadWorkspaceId('u1')).toBe('')
})

it.each([[true, fbAuth.browserLocalPersistence], [false, fbAuth.browserSessionPersistence]])('signIn remember=%s picks the matching persistence', async (remember, persistence) => {
  await signIn('r@x.io', 'pw', remember)
  expect(fbAuth.setPersistence).toHaveBeenLastCalledWith(expect.anything(), persistence)
  expect(fbAuth.signInWithEmailAndPassword).toHaveBeenLastCalledWith(expect.anything(), 'r@x.io', 'pw')
})

it('registers the account, its display name and its workspace profile', async () => {
  vi.mocked(fbAuth.createUserWithEmailAndPassword).mockResolvedValue({ user } as fbAuth.UserCredential)
  const session = await register({ name: 'Rina Saputra', workspaceId: 'gamma-labs', email: 'r@x.io', password: 'secret1' })
  expect(fbAuth.updateProfile).toHaveBeenCalledWith(user, { displayName: 'Rina Saputra' })
  expect(store.get('users/u1')).toEqual({ name: 'Rina Saputra', workspaceId: 'gamma-labs' })
  expect(session.workspaceId).toBe('gamma-labs')
})

it.each([
  ['auth/invalid-credential', 'auth.errors.credentials'],
  ['auth/wrong-password', 'auth.errors.credentials'],
  ['auth/user-not-found', 'auth.errors.credentials'],
  ['auth/invalid-email', 'auth.errors.credentials'],
  ['auth/email-already-in-use', 'auth.errors.emailInUse'],
  ['auth/weak-password', 'auth.errors.weakPassword'],
  ['auth/too-many-requests', 'auth.errors.tooMany'],
  ['auth/network-request-failed', 'auth.errors.network'],
  ['permission-denied', 'auth.errors.workspace'],
  ['something-else', 'auth.errors.generic'],
])('maps %s to %s', (code, key) => {
  expect(authErrorKey({ code })).toBe(key)
})

it('maps a plain error to the generic message', () => {
  expect(authErrorKey(new Error('x'))).toBe('auth.errors.generic')
})
