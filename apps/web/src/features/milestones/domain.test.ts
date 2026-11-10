import { elapsed, stateOf } from './domain'
import type { Milestone } from '@/features/runs/domain'

const m = (o: Partial<Milestone>): Milestone => ({ id: 'm', name: 'R', description: '', startOn: '2026-10-27', dueOn: '2026-11-20', isCompleted: false, ...o })
const now = new Date('2026-11-05T12:00:00')

describe('milestone domain', () => {
  it('derives state', () => {
    expect(stateOf(m({}), now)).toBe('open')
    expect(stateOf(m({ startOn: '2026-11-21', dueOn: '2026-12-18' }), now)).toBe('upcoming')
    expect(stateOf(m({ startOn: '' }), now)).toBe('open')
    expect(stateOf(m({ isCompleted: true }), now)).toBe('completed')
  })

  it('computes elapsed time', () => {
    expect(elapsed(m({}), now)).toEqual({ pct: 38, spent: 9, total: 24 })
    expect(elapsed(m({ startOn: '' }), now)).toBeNull()
    expect(elapsed(m({ startOn: '2026-11-21', dueOn: '2026-12-18' }), now)?.pct).toBe(0)
    expect(elapsed(m({ isCompleted: true }), now)?.pct).toBe(100)
  })
})
