import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { queryClient } from '@/lib/queryClient'
import { loadWorkspaceId } from './api'
import { initAuth, useAuth } from './session'

vi.mock('firebase/auth', async (orig) => ({ ...(await orig<typeof import('firebase/auth')>()), onAuthStateChanged: vi.fn() }))
vi.mock('./api', async (orig) => ({ ...(await orig<typeof import('./api')>()), loadWorkspaceId: vi.fn() }))

const user = { uid: 'u1', displayName: 'Rina Saputra' } as User
const fire = async (u: User | null) => {
  initAuth()
  const listener = vi.mocked(onAuthStateChanged).mock.lastCall![1] as (u: User | null) => Promise<void>
  await listener(u)
}
const setCurrentUser = (u: User | null) => { (auth as { currentUser: User | null }).currentUser = u }

describe('initAuth', () => {
  beforeEach(() => useAuth.setState({ session: null, ready: false }))

  it('builds the session with the workspace stored in Firestore', async () => {
    setCurrentUser(user)
    vi.mocked(loadWorkspaceId).mockResolvedValue('alpha-qa')
    await fire(user)
    expect(useAuth.getState()).toMatchObject({ ready: true, session: { uid: 'u1', name: 'Rina Saputra', workspaceId: 'alpha-qa' } })
  })

  it('ignores the workspace when the user changed while it was loading', async () => {
    setCurrentUser(null)
    vi.mocked(loadWorkspaceId).mockResolvedValue('alpha-qa')
    await fire(user)
    expect(useAuth.getState()).toMatchObject({ ready: false, session: null })
  })

  it('keeps the session set by Register when the profile was not written yet', async () => {
    setCurrentUser(user)
    useAuth.setState({ session: { uid: 'u1', name: 'Rina Saputra', initials: 'RS', workspaceId: 'alpha-qa' } })
    vi.mocked(loadWorkspaceId).mockResolvedValue('')
    await fire(user)
    expect(useAuth.getState()).toMatchObject({ ready: true, session: { workspaceId: 'alpha-qa' } })
  })

  it('clears cached data on sign-out', async () => {
    queryClient.setQueryData(['projects', 'alpha-qa'], [])
    await fire(null)
    expect(queryClient.getQueryData(['projects', 'alpha-qa'])).toBeUndefined()
    expect(useAuth.getState()).toMatchObject({ ready: true, session: null })
  })
})
