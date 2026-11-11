import { seed, store, resetFirestore } from '@/lib/fakeFirestore'
import { createProject, listProjects, setPinned } from './api'

vi.mock('firebase/firestore', () => import('@/lib/fakeFirestore'))
vi.unmock('@/features/projects/api')

beforeEach(resetFirestore)

it('lists only the workspace projects, sorted by name', async () => {
  seed('projects/b', { workspaceId: 'alpha-qa', name: 'Mobile', description: '', color: '#000' })
  seed('projects/a', { workspaceId: 'alpha-qa', name: 'Admin', description: 'x', color: '#111', pinned: true })
  seed('projects/c', { workspaceId: 'beta-squad', name: 'Other', description: '', color: '#222' })
  expect(await listProjects('alpha-qa')).toEqual([
    { id: 'a', name: 'Admin', description: 'x', color: '#111', pinned: true },
    { id: 'b', name: 'Mobile', description: '', color: '#000', pinned: false },
  ])
})

it('creates a project in the workspace with a palette color', async () => {
  await createProject('u1', 'alpha-qa', { name: 'Store', description: 'Shop' })
  const p = [...store.values()][0]
  expect(p).toMatchObject({ workspaceId: 'alpha-qa', name: 'Store', description: 'Shop', createdBy: 'u1' })
  expect(['#E08A00', '#0F766E', '#6D28D9', '#2B6CB0', '#C2410C']).toContain(p!.color)
})

it('pins on the project document, so the whole workspace sees it', async () => {
  seed('projects/a', { workspaceId: 'alpha-qa', name: 'Admin', description: '', color: '#111' })
  await setPinned('a', true)
  expect((await listProjects('alpha-qa'))[0]!.pinned).toBe(true)
  await setPinned('a', false)
  expect(store.get('projects/a')).toMatchObject({ name: 'Admin', pinned: false })
})
