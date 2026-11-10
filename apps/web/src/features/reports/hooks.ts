import { useQueries } from '@tanstack/react-query'
import { useMilestones } from '@/features/milestones/hooks'
import { useUsers } from '@/features/people/useUsers'
import { listTests } from '@/features/runs/api'
import { useRuns } from '@/features/runs/hooks'
import { useRunsStore } from '@/features/runs/store'
import type { RunTest } from '@/features/runs/domain'
import type { Template } from './domain'

const NONE: RunTest[] = []

/**
 * Data satu report. Project `store` membaca data contoh; project lain membaca Firestore.
 * Test hanya dibaca untuk template milestone/run (tabel Failed & Blocked); Summary Project cukup `runs.counts`.
 */
export function useReportData(projectId: string, template: Template, id: string | undefined) {
  const mock = projectId === 'store'
  const store = useRunsStore()
  const live = useRuns(projectId)
  const milestones = useMilestones(projectId)

  const allRuns = mock ? store.runs : (live.data ?? [])
  const scopeMilestone = template === 'milestone' ? (id ? milestones.data?.find((m) => m.id === id) : milestones.data?.[0]) : undefined
  const scopeRun = template === 'run' ? (id ? allRuns.find((r) => r.id === id) : allRuns[0]) : undefined
  const runs =
    template === 'project' ? allRuns
    : scopeRun ? [scopeRun]
    : scopeMilestone ? allRuns.filter((r) => r.milestoneId === scopeMilestone.id)
    : []

  const needTests = template !== 'project'
  const fetched = useQueries({
    queries: runs.map((r) => ({
      queryKey: ['runs', projectId, r.id, 'tests'],
      queryFn: () => listTests(projectId, r.id),
      enabled: !mock && needTests,
    })),
  })
  const users = useUsers(!mock && needTests).data
  // Di Firestore assignee tersimpan sebagai uid; report menampilkan nama.
  const named = fetched
    .flatMap((q) => q.data ?? NONE)
    .map((t) => ({ ...t, assignee: users?.find((u) => u.uid === t.assignee)?.name ?? '—' }))
  const tests = !needTests ? NONE : mock ? runs.flatMap((r) => store.tests[r.id] ?? NONE) : named

  return {
    loading: !mock && (live.isPending || milestones.isPending || (needTests && fetched.some((q) => q.isPending))),
    error: !mock && (live.isError || milestones.isError || fetched.some((q) => q.isError)),
    retry: () => { void live.refetch(); void milestones.refetch(); fetched.forEach((q) => void q.refetch()) },
    milestones: milestones.data ?? [],
    allRuns,
    runs,
    tests,
    scopeMilestone,
    scopeRun,
    asOf: new Date(),
  }
}
