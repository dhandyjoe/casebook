import { seed, store, resetFirestore } from '@/lib/fakeFirestore'
import { importLegacyCases, legacyKey } from './legacy'

vi.mock('firebase/firestore', () => import('@/lib/fakeFirestore'))
vi.unmock('@/features/cases/api')

const P = 'projects/p1'
const old = {
  state: {
    sections: [{ id: 'sA', parentId: null, name: 'Login' }, { id: 'sB', parentId: 'sA', name: 'OTP' }],
    cases: [
      { id: 'C1', number: 1, sectionId: 'sB', title: 'Old approved', status: 'approved', priority: 'High', type: 'Functional', refs: '', estimate: '', automation: 'Manual', preconditions: 'Has account', steps: ['Open'], expected: ['Ok'], author: 'Rina', history: [] },
      { id: 'C2', number: 2, sectionId: 'sA', title: 'Draft', status: 'draft', priority: 'Low', type: 'UI', preconditions: '', steps: [], expected: [], author: 'Rina', history: [] },
    ],
    nextNumber: 3,
  },
  version: 2,
}

beforeEach(() => { resetFirestore(); localStorage.clear() })

it('moves sections and cases to Firestore, renumbering cases, then drops the local copy', async () => {
  seed(P, { nextCaseNumber: 1005 })
  localStorage.setItem(legacyKey('p1'), JSON.stringify(old))

  expect(await importLegacyCases('u1', 'p1')).toBe(true)

  expect(store.get(`${P}/sections/sA`)).toEqual({ name: 'Login', parentId: null })
  expect(store.get(`${P}/sections/sB`)).toEqual({ name: 'OTP', parentId: 'sA' })
  expect(store.get(`${P}/cases/C1005`)).toMatchObject({ number: 1005, sectionId: 'sB', title: 'Old approved', status: 'active', preconditions: ['Has account'], createdBy: 'u1' })
  expect(store.get(`${P}/cases/C1006`)).toMatchObject({ title: 'Draft', preconditions: [], refs: '', estimate: '', automation: 'Manual' })
  expect(store.get(P)!.nextCaseNumber).toBe(1007)
  expect(localStorage.getItem(legacyKey('p1'))).toBeNull()
})

it('does nothing without a local copy', async () => {
  expect(await importLegacyCases('u1', 'p1')).toBe(false)
  expect(store.size).toBe(0)
})

it('keeps the local copy when Firestore refuses, so the next visit retries', async () => {
  localStorage.setItem(legacyKey('p1'), JSON.stringify(old))
  const fs = await import('@/lib/fakeFirestore')
  vi.spyOn(fs, 'runTransaction').mockRejectedValueOnce(Object.assign(new Error('denied'), { code: 'permission-denied' }))
  await expect(importLegacyCases('u1', 'p1')).rejects.toThrow('denied')
  expect(localStorage.getItem(legacyKey('p1'))).not.toBeNull()
})

it('runs once when two screens open the project at the same time', async () => {
  seed(P, {})
  localStorage.setItem(legacyKey('p1'), JSON.stringify(old))
  const [a, b] = await Promise.all([importLegacyCases('u1', 'p1'), importLegacyCases('u1', 'p1')])
  expect([a, b]).toEqual([true, false])
  expect([...store.keys()].filter((k) => k.includes('/cases/'))).toHaveLength(2)
})
