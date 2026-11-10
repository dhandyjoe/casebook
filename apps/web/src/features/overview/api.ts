import { collection, documentId, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { lastDays } from '@/lib/time'
import { RESULT_STATUSES, type ResultStatus } from '@/features/runs/domain'

export type Day = { day: string } & Record<ResultStatus, number>

/** Jumlah hasil per hari untuk `days` hari terakhir; hari tanpa dokumen bernilai 0. */
export async function listDaily(projectId: string, days: number, now = new Date()): Promise<Day[]> {
  const keys = lastDays(days, now)
  const snap = await getDocs(query(collection(db, 'projects', projectId, 'daily'), where(documentId(), '>=', keys[0])))
  const byDay = new Map(snap.docs.map((d) => [d.id, d.data()]))
  return keys.map((day) => {
    const d = byDay.get(day) ?? {}
    return { day, ...Object.fromEntries(RESULT_STATUSES.map((s) => [s, d[s] ?? 0])) } as Day
  })
}
