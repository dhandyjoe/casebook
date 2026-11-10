import { auth } from './firebase'
import { apiGet } from './api'

vi.unmock('@/lib/api')

const setUser = (u: unknown) => { (auth as { currentUser: unknown }).currentUser = u }

beforeEach(() => vi.stubEnv('VITE_API_URL', 'https://api.test'))
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); setUser(undefined) })

it('sends the Firebase ID token as Bearer and returns the JSON body', async () => {
  setUser({ getIdToken: async () => 'tok' })
  const fetch = vi.fn(async () => Response.json([{ uid: 'u1' }]))
  vi.stubGlobal('fetch', fetch)
  expect(await apiGet('/v1/users')).toEqual([{ uid: 'u1' }])
  expect(fetch).toHaveBeenCalledWith('https://api.test/v1/users', { headers: { Authorization: 'Bearer tok' } })
})

it('throws with the status when the Worker refuses', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })))
  await expect(apiGet('/v1/users')).rejects.toThrow('GET /v1/users: 401')
})
