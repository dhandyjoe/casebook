import { seed, resetFirestore } from '@/lib/fakeFirestore'
import { listDaily } from './api'

vi.mock('firebase/firestore', () => import('@/lib/fakeFirestore'))
vi.unmock('@/features/overview/api')

beforeEach(resetFirestore)

it('returns one row per day, zero-filled, ignoring older days', async () => {
  seed('projects/p1/daily/2026-11-01', { passed: 9 })
  seed('projects/p1/daily/2026-11-09', { passed: 2, failed: 1 })
  seed('projects/p1/daily/2026-11-10', { retest: 3 })
  expect(await listDaily('p1', 3, new Date(2026, 10, 10, 12))).toEqual([
    { day: '2026-11-08', passed: 0, failed: 0, blocked: 0, retest: 0 },
    { day: '2026-11-09', passed: 2, failed: 1, blocked: 0, retest: 0 },
    { day: '2026-11-10', passed: 0, failed: 0, blocked: 0, retest: 3 },
  ])
})
