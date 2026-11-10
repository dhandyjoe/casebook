import { seed, stats, store, resetFirestore, ts } from '@/lib/fakeFirestore'
import type { TestCase } from './domain'
import { countCases, createCases, createSection, deleteCases, deleteSections, listCases, listRecentCases, listSections, listUnderReview, saveCases } from './api'

vi.mock('firebase/firestore', () => import('@/lib/fakeFirestore'))
vi.unmock('@/features/cases/api')

const P = 'projects/p1'
const tc = (n: number, patch: Partial<TestCase> = {}): TestCase => ({
  id: `C${n}`, number: n, sectionId: 's1', title: `Case ${n}`, status: 'draft', priority: 'High', type: 'Functional', refs: '', estimate: '',
  automation: 'Manual', preconditions: [], steps: [], expected: [], author: 'Rina', createdAt: '', updatedAt: '', history: [], ...patch,
})
const caseKeys = () => [...store.keys()].filter((k) => k.startsWith(`${P}/cases/`)).sort()

beforeEach(resetFirestore)

describe('createCases', () => {
  it('numbers from 1001 on a new project and advances the counter', async () => {
    seed(P, { name: 'Store' })
    const made = await createCases('u1', 'p1', (first) => [tc(first), tc(first + 1)])

    expect(made.map((c) => c.id)).toEqual(['C1001', 'C1002'])
    expect(store.get(P)!.nextCaseNumber).toBe(1003)
    expect(store.get(`${P}/cases/C1001`)).toMatchObject({ number: 1001, title: 'Case 1001', createdBy: 'u1', reviewer: null })
  })

  it('continues from the stored counter', async () => {
    seed(P, { nextCaseNumber: 1042 })
    const made = await createCases('u1', 'p1', (first) => [tc(first)])
    expect(made[0]!.number).toBe(1042)
    expect(store.get(P)!.nextCaseNumber).toBe(1043)
  })
})

describe('reads', () => {
  beforeEach(() => {
    seed(`${P}/cases/C1002`, { ...tc(1002, { status: 'under_review' }), updatedAt: ts('2026-11-03T00:00:00Z'), createdAt: ts('2026-11-01T00:00:00Z'), reviewer: null })
    // createdAt null = serverTimestamp() yang belum dikonfirmasi server (tulisan lokal)
    seed(`${P}/cases/C1001`, { ...tc(1001), updatedAt: ts('2026-11-02T00:00:00Z'), createdAt: null, reviewer: { uid: 'u2', name: 'Budi' } })
  })

  it('lists cases by number with ISO dates and an optional reviewer', async () => {
    const list = await listCases('p1')
    expect(list.map((c) => c.id)).toEqual(['C1001', 'C1002'])
    expect(list[0]).toMatchObject({ reviewer: { uid: 'u2', name: 'Budi' }, updatedAt: '2026-11-02T00:00:00.000Z', createdAt: '' })
    expect(list[1]!.reviewer).toBeUndefined()
  })

  it('counts, filters under review and lists recent changes', async () => {
    expect(await countCases('p1')).toBe(2)
    expect((await listUnderReview('p1')).map((c) => c.id)).toEqual(['C1002'])
    expect((await listRecentCases('p1', 1)).map((c) => c.id)).toEqual(['C1002'])
  })

  it('lists sections with null for root parents', async () => {
    seed(`${P}/sections/a`, { name: 'Root' })
    seed(`${P}/sections/b`, { name: 'Child', parentId: 'a' })
    expect(await listSections('p1')).toEqual([{ id: 'a', parentId: null, name: 'Root' }, { id: 'b', parentId: 'a', name: 'Child' }])
  })
})

describe('writes', () => {
  it('saves only editable fields, keeping number and creator', async () => {
    seed(`${P}/cases/C1001`, { number: 1001, createdBy: 'u1', title: 'Old' })
    await saveCases('p1', [tc(1001, { title: 'New', number: 9999 })])
    expect(store.get(`${P}/cases/C1001`)).toMatchObject({ number: 1001, createdBy: 'u1', title: 'New', reviewer: null })
  })

  it('fails when saving a case that no longer exists', async () => {
    await expect(saveCases('p1', [tc(1001)])).rejects.toThrow()
  })

  it('deletes in batches of 500', async () => {
    const ids = Array.from({ length: 501 }, (_, i) => `C${i}`)
    ids.forEach((id) => seed(`${P}/cases/${id}`, {}))
    seed(`${P}/cases/keep`, {})
    await deleteCases('p1', ids)
    expect(caseKeys()).toEqual([`${P}/cases/keep`])
    expect(stats.commits).toBe(2)
  })

  it('creates a trimmed section and deletes sections with their cases', async () => {
    const s = await createSection('p1', '  Checkout ', null)
    expect(s).toEqual({ id: expect.any(String), name: 'Checkout', parentId: null })
    expect(store.get(`${P}/sections/${s.id}`)).toEqual({ name: 'Checkout', parentId: null })

    seed(`${P}/cases/C1`, {})
    seed(`${P}/cases/C2`, {})
    await deleteSections('p1', [s.id], ['C1'])
    expect([...store.keys()]).toEqual([`${P}/cases/C2`])
  })
})
