import { seed, store, resetFirestore } from '@/lib/fakeFirestore'
import { dayKey } from '@/lib/time'
import { createMilestone, deleteMilestone, listMilestones, updateMilestone } from './api'

vi.mock('firebase/firestore', () => import('@/lib/fakeFirestore'))
vi.unmock('@/features/milestones/api')

const M = 'projects/p1/milestones'

beforeEach(resetFirestore)

it('lists milestones by due date, defaulting completedOn', async () => {
  seed(`${M}/b`, { name: 'B', description: '', startOn: '', dueOn: '2026-12-01', isCompleted: false })
  seed(`${M}/a`, { name: 'A', description: '', startOn: '', dueOn: '2026-11-15', isCompleted: true, completedOn: '2026-11-10' })
  expect(await listMilestones('p1')).toEqual([
    { id: 'a', name: 'A', description: '', startOn: '', dueOn: '2026-11-15', isCompleted: true, completedOn: '2026-11-10' },
    { id: 'b', name: 'B', description: '', startOn: '', dueOn: '2026-12-01', isCompleted: false, completedOn: '' },
  ])
})

it('creates an open milestone with a trimmed name', async () => {
  await createMilestone('u1', 'p1', { name: '  v1.0 ', description: 'd', startOn: '2026-11-01', dueOn: '2026-11-30' })
  const m = [...store.values()][0]
  expect(m).toMatchObject({ name: 'v1.0', description: 'd', isCompleted: false, completedOn: '', createdBy: 'u1', updatedBy: 'u1' })
})

describe('updateMilestone', () => {
  beforeEach(() => seed(`${M}/a`, { name: 'A', isCompleted: false, completedOn: '' }))

  it('stamps completedOn today when completed and clears it when reopened', async () => {
    await updateMilestone('u2', 'p1', 'a', { isCompleted: true })
    expect(store.get(`${M}/a`)).toMatchObject({ name: 'A', isCompleted: true, completedOn: dayKey(new Date()), updatedBy: 'u2' })
    await updateMilestone('u2', 'p1', 'a', { isCompleted: false })
    expect(store.get(`${M}/a`)).toMatchObject({ isCompleted: false, completedOn: '' })
  })

  it('trims a new name without touching completion', async () => {
    await updateMilestone('u2', 'p1', 'a', { name: ' B ' })
    expect(store.get(`${M}/a`)).toMatchObject({ name: 'B', completedOn: '' })
  })
})

describe('deleteMilestone', () => {
  it('deletes an unused milestone', async () => {
    seed(`${M}/a`, {})
    seed('projects/p1/runs/r1', { milestoneId: 'other' })
    await deleteMilestone('p1', 'a')
    expect(store.has(`${M}/a`)).toBe(false)
  })

  it('refuses while a run still points at it', async () => {
    seed(`${M}/a`, {})
    seed('projects/p1/runs/r1', { milestoneId: 'a' })
    await expect(deleteMilestone('p1', 'a')).rejects.toThrow('milestone-in-use')
    expect(store.has(`${M}/a`)).toBe(true)
  })
})
