import { describe, expect, it } from 'vitest'
import { createApp } from './app'

const app = createApp(
  {
    verify: async (t) => { if (t !== 'good') throw new Error('bad'); return 'u1' },
    listWorkspaceUsers: async (uid) => [{ uid, name: 'Rina' }],
  },
  'http://localhost:5173',
)

describe('GET /v1/users', () => {
  it('rejects a missing or invalid token', async () => {
    expect((await app.request('/v1/users')).status).toBe(401)
    expect((await app.request('/v1/users', { headers: { Authorization: 'Bearer nope' } })).status).toBe(401)
  })

  it('returns the workspace users for a valid token', async () => {
    const res = await app.request('/v1/users', { headers: { Authorization: 'Bearer good' } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ uid: 'u1', name: 'Rina' }])
  })

  it('only allows the configured origin', async () => {
    const res = await app.request('/v1/users', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'GET' } })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
    const other = await app.request('/v1/users', { headers: { Origin: 'https://evil.example', Authorization: 'Bearer good' } })
    expect(other.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('answers 500 when the user lookup fails', async () => {
    const broken = createApp({ verify: async () => 'u1', listWorkspaceUsers: async () => { throw new Error('firestore: 503') } }, 'http://localhost:5173')
    expect((await broken.request('/v1/users', { headers: { Authorization: 'Bearer good' } })).status).toBe(500)
  })
})
