import { useQueries, useQuery } from '@tanstack/react-query'
import { useUsers } from '@/features/people/useUsers'
import { listRecentTests } from '@/features/runs/api'
import { initialsOf, type Run } from '@/features/runs/domain'
import { listDaily } from './api'

export const DAYS = 14
const RECENT = 6

// Kunci di bawah ['runs', projectId] supaya ikut di-refresh setiap hasil baru dicatat (runs/hooks.ts).
export const useDaily = (projectId: string) =>
  useQuery({ queryKey: ['runs', projectId, 'daily'], queryFn: () => listDaily(projectId, DAYS) })

/** Hasil terbaru dari maksimal 5 run non-Draft terbaru (≤ 30 baca). `who` diubah jadi inisial untuk avatar. */
export function useRecentResults(projectId: string, runs: Run[]) {
  const open = runs.filter((r) => r.status !== 'draft').slice(0, 5)
  const users = useUsers(open.length > 0).data
  const queries = useQueries({
    queries: open.map((r) => ({ queryKey: ['runs', projectId, r.id, 'recent'], queryFn: () => listRecentTests(projectId, r.id, RECENT) })),
  })
  return queries
    .flatMap((q) => q.data ?? [])
    .map((test) => {
      const result = test.results[0]!
      return { test, result: { ...result, who: initialsOf(users?.find((u) => u.uid === result.who)?.name ?? result.who) } }
    })
    .sort((a, b) => b.result.at.localeCompare(a.result.at))
    .slice(0, RECENT)
}
