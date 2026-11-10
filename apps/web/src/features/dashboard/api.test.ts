import { seed, resetFirestore, ts } from '@/lib/fakeFirestore'
import { emptyCounts } from '@/features/runs/domain'
import { SHOWN, loadDashboard } from './api'

vi.mock('firebase/firestore', () => import('@/lib/fakeFirestore'))
vi.unmock('@/features/cases/api')
vi.unmock('@/features/runs/api')

const store = { id: 'p1', name: 'Store', color: '#E08A00' }
const mobile = { id: 'p2', name: 'Mobile', color: '#0F766E' }
const kase = (title: string, status: string, history: { who: string; action: string; at: string }[], updatedAt: string) =>
  ({ title, status, history, number: 1, updatedAt: ts(updatedAt) })

beforeEach(resetFirestore)

it('returns zeroed stats for a project without data', async () => {
  expect(await loadDashboard([store])).toEqual({ stats: { p1: { cases: 0, activeRuns: 0, segs: [0, 0, 0, 0, 100] } }, review: [], activity: [] })
})

it('aggregates stats from started runs, review queue and activity across projects', async () => {
  seed('projects/p1/runs/draft', { status: 'draft', counts: { ...emptyCounts(), untested: 50 }, createdAt: ts('2026-11-05T00:00:00Z') })
  seed('projects/p1/runs/r1', { name: 'Sprint', status: 'active', counts: { ...emptyCounts(), passed: 1, failed: 1, untested: 2 }, createdAt: ts('2026-11-04T00:00:00Z') })
  seed('projects/p1/runs/r1/tests/t1', { number: 7, snapshot: { title: 'Pay' }, status: 'failed', lastResultBy: 'u2', lastResultAt: ts('2026-11-06T00:00:00Z') })
  seed('projects/p1/cases/C1', kase('Login', 'under_review', [{ who: 'Rina', action: 'submitted', at: '2026-11-02T00:00:00.000Z' }], '2026-11-02T00:00:00Z'))
  seed('projects/p2/cases/C9', kase('Cart', 'under_review', [], '2026-11-01T00:00:00Z'))

  const d = await loadDashboard([store, mobile])

  expect(d.stats.p1).toEqual({ cases: 1, activeRuns: 1, segs: [25, 25, 0, 0, 50] }) // run Draft tidak dihitung
  expect(d.stats.p2).toEqual({ cases: 1, activeRuns: 0, segs: [0, 0, 0, 0, 100] })
  // terlama dulu; case tanpa riwayat "submitted" memakai updatedAt
  expect(d.review.map((r) => [r.projectId, r.testCase.id, r.submittedAt])).toEqual([['p2', 'C9', '2026-11-01T00:00:00.000Z'], ['p1', 'C1', '2026-11-02T00:00:00.000Z']])
  expect(d.activity).toEqual([
    { kind: 'result', id: 'r1/t1', projectId: 'p1', projectName: 'Store', at: '2026-11-06T00:00:00.000Z', title: 'Pay', who: 'u2', status: 'failed', test: 7, runId: 'r1', runName: 'Sprint', testId: 't1' },
    { kind: 'case', id: 'C1/2026-11-02T00:00:00.000Z', projectId: 'p1', projectName: 'Store', at: '2026-11-02T00:00:00.000Z', title: 'Login', who: 'Rina', action: 'submitted', caseId: 'C1' },
  ])
})

it('keeps only the newest activity items', async () => {
  for (let i = 0; i < SHOWN + 2; i++) {
    const at = `2026-11-0${i + 1}T00:00:00.000Z`
    seed(`projects/p1/cases/C${i}`, kase(`Case ${i}`, 'draft', [{ who: 'Rina', action: 'edited', at }], at))
  }
  const { activity } = await loadDashboard([store])
  // per project hanya 5 case terbaru yang dibaca
  expect(activity.map((a) => a.title)).toEqual(['Case 7', 'Case 6', 'Case 5', 'Case 4', 'Case 3'])
})
