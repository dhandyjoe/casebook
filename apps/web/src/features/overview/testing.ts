import { lastDays } from '@/lib/time'
import type { Day } from './api'

// Pengganti features/overview/api di test: jumlah per hari diisi lewat fakeDaily.
export const fakeDaily: Record<string, Partial<Day>> = {}

export const fakeApi = {
  listDaily: async (_projectId: string, days: number): Promise<Day[]> =>
    lastDays(days).map((day) => ({ day, passed: 0, failed: 0, blocked: 0, retest: 0, ...fakeDaily[day] })),
}
