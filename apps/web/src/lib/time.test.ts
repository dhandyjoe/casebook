import { dayKey, lastDays } from './time'

describe('lastDays', () => {
  it('lists local dates oldest first and crosses month boundaries', () => {
    expect(lastDays(3, new Date(2026, 10, 1, 9))).toEqual(['2026-10-30', '2026-10-31', '2026-11-01'])
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})
