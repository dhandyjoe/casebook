import type { Project } from './api'

const row = (id: string, name: string, description: string, color: string, pinned = false): Project =>
  ({ id, name, description, color, pinned })

const SEED = [
  row('store', 'Online Store — Web', 'Checkout and payments for the web shop', '#E08A00', true),
  row('mobile', 'Mobile App', 'iOS and Android client', '#0F766E', true),
  row('admin', 'Admin Back-office', 'Internal tools', '#6D28D9', true),
  row('payments', 'Payments API', 'Smoke API v2', '#2B6CB0', true),
  row('seller', 'Seller Portal', 'Seller onboarding', '#0F766E'),
]

let projects: Project[] = []

export function resetFakeProjects() {
  projects = SEED.map((p) => ({ ...p }))
  fake.created = []
}

// Pengganti features/projects/api di test: data di memori, kegagalan bisa dipaksa lewat fake.failNext.
export const fake = {
  failNext: null as 'list' | 'create' | 'pin' | null,
  created: [] as { uid: string; name: string; description: string }[],
}
const maybeFail = (op: 'list' | 'create' | 'pin') => {
  if (fake.failNext !== op) return
  fake.failNext = null
  throw new Error(`${op} failed`)
}

export const fakeApi = {
  listProjects: async (_workspaceId: string) => { maybeFail('list'); return [...projects].sort((a, b) => a.name.localeCompare(b.name)) },
  createProject: async (uid: string, _workspaceId: string, input: { name: string; description: string }) => {
    maybeFail('create')
    fake.created.push({ uid, ...input })
    projects.push(row(`p${projects.length + 1}`, input.name, input.description, '#2B6CB0'))
  },
  setPinned: async (id: string, on: boolean) => {
    maybeFail('pin')
    projects = projects.map((p) => (p.id === id ? { ...p, pinned: on } : p))
  },
}
