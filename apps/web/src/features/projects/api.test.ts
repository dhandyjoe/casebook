import { seed, store, resetFirestore } from '@/lib/fakeFirestore'
import { createProject, listPinned, listProjects, setPinned } from './api'

vi.mock('firebase/firestore', () => import('@/lib/fakeFirestore'))
vi.unmock('@/features/projects/api')

beforeEach(resetFirestore)

it('lists only the workspace projects, sorted by name', async () => {
  seed('projects/b', { workspaceId: 'alpha-qa', name: 'Mobile', description: '', color: '#000' })
  seed('projects/a', { workspaceId: 'alpha-qa', name: 'Admin', description: 'x', color: '#111' })
  seed('projects/c', { workspaceId: 'beta-squad', name: 'Other', description: '', color: '#222' })
  expect(await listProjects('alpha-qa')).toEqual([
    { id: 'a', name: 'Admin', description: 'x', color: '#111' },
    { id: 'b', name: 'Mobile', description: '', color: '#000' },
  ])
})

it('creates a project in the workspace with a palette color', async () => {
  await createProject('u1', 'alpha-qa', { name: 'Store', description: 'Shop' })
  const p = [...store.values()][0]
  expect(p).toMatchObject({ workspaceId: 'alpha-qa', name: 'Store', description: 'Shop', createdBy: 'u1' })
  expect(['#E08A00', '#0F766E', '#6D28D9', '#2B6CB0', '#C2410C']).toContain(p!.color)
})

it('pins and unpins without touching the rest of the profile', async () => {
  expect(await listPinned('u1')).toEqual([])
  seed('users/u1', { name: 'Rina', workspaceId: 'alpha-qa' })
  await setPinned('u1', 'a', true)
  await setPinned('u1', 'b', true)
  await setPinned('u1', 'a', true)
  expect(await listPinned('u1')).toEqual(['a', 'b'])
  await setPinned('u1', 'a', false)
  expect(store.get('users/u1')).toEqual({ name: 'Rina', workspaceId: 'alpha-qa', pinnedProjectIds: ['b'] })
})
