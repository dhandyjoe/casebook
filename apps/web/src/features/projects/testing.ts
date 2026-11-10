import type { Project } from './api'

const row = (id: string, name: string, description: string, color: string): Project =>
  ({ id, name, description, color })

const SEED = [
  row('store', 'Online Store — Web', 'Checkout and payments for the web shop', '#E08A00'),
  row('mobile', 'Mobile App', 'iOS and Android client', '#0F766E'),
  row('admin', 'Admin Back-office', 'Internal tools', '#6D28D9'),
  row('payments', 'Payments API', 'Smoke API v2', '#2B6CB0'),
  row('seller', 'Seller Portal', 'Seller onboarding', '#0F766E'),
]
const SEED_PINNED = ['store', 'mobile', 'admin', 'payments']

let projects: Project[] = []
let pinned: string[] = []

export function resetFakeProjects() {
  projects = [...SEED]
  pinned = [...SEED_PINNED]
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
  listPinned: async (_uid: string) => [...pinned],
  setPinned: async (_uid: string, id: string, on: boolean) => {
    maybeFail('pin')
    pinned = on ? [...pinned, id] : pinned.filter((x) => x !== id)
  },
}
