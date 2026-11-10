import { describe, expect, it } from 'vitest'
import worker from './index'

const env = { FIREBASE_PROJECT_ID: 'demo-casebook', ALLOWED_ORIGIN: 'https://casebook.app', SERVICE_ACCOUNT_JSON: '{}' }

describe('worker entry', () => {
  it('wires the app with the env origin and real token check', async () => {
    const res = await worker.fetch(new Request('https://api.test/v1/users', { headers: { Origin: 'https://casebook.app', Authorization: 'Bearer not-a-jwt' } }), env)
    expect(res.status).toBe(401)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://casebook.app')
  })
})
