import { createApp } from './app'
import { listWorkspaceUsers, verifyIdToken } from './google'

interface Env {
  FIREBASE_PROJECT_ID: string
  ALLOWED_ORIGIN: string
  SERVICE_ACCOUNT_JSON: string
}

export default {
  fetch: (req: Request, env: Env) =>
    createApp({ verify: (t) => verifyIdToken(env, t), listWorkspaceUsers: (uid) => listWorkspaceUsers(env, uid) }, env.ALLOWED_ORIGIN).fetch(req),
}
