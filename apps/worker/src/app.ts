import { Hono } from 'hono'
import { cors } from 'hono/cors'

export interface User {
  uid: string
  name: string
}

export interface Deps {
  /** uid dari ID token Firebase; melempar bila token tidak valid */
  verify: (token: string) => Promise<string>
  /** user Firebase Auth yang berada di workspace yang sama dengan uid */
  listWorkspaceUsers: (uid: string) => Promise<User[]>
}

export const createApp = (deps: Deps, allowedOrigin: string) => {
  const app = new Hono()
  app.use('*', cors({ origin: allowedOrigin }))
  app.get('/v1/users', async (c) => {
    const token = c.req.header('Authorization')?.replace(/^Bearer /, '')
    const uid = token ? await deps.verify(token).catch(() => null) : null
    if (!uid) return c.json({ error: 'unauthorized' }, 401)
    return c.json(await deps.listWorkspaceUsers(uid))
  })
  return app
}
