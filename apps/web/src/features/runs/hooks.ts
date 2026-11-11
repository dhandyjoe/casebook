import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAuth } from '@/features/auth/session'
import { useUsers } from '@/features/people/useUsers'
import type { TestCase } from '@/features/cases/domain'
import { addResult, createRun, getRun, listPlans, listResults, listRuns, listTests, removeCasesFromRuns, setRunCases, startRun, updateRun, type RunPatch } from './api'
import { initialsOf, type ResultInput, type RunTest } from './domain'
import { useRunsStore } from './store'

const key = (projectId: string) => ['runs', projectId]
const NONE: RunTest[] = []

export const useRuns = (projectId: string) =>
  useQuery({ queryKey: key(projectId), queryFn: () => listRuns(projectId) })

export function useCreateRun(projectId: string) {
  const uid = useAuth((s) => s.session!.uid)
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof createRun>[2]) => createRun(uid, projectId, input),
    onSuccess: () => client.invalidateQueries({ queryKey: key(projectId) }),
  })
}

export const usePlans = (projectId: string) =>
  useQuery({ queryKey: [...key(projectId), 'plans'], queryFn: () => listPlans(projectId) })

/** Case dihapus dari Test Cases: test-nya ikut lepas dari semua run project (project contoh `store` memakai store mock, tidak ikut). */
export function useRemoveCasesFromRuns(projectId: string) {
  const uid = useAuth((s) => s.session!.uid)
  const client = useQueryClient()
  return useMutation({
    mutationFn: (caseIds: string[]) => (projectId === 'store' ? Promise.resolve() : removeCasesFromRuns(uid, projectId, caseIds)),
    onSuccess: () => client.invalidateQueries({ queryKey: key(projectId) }),
  })
}

/** Riwayat hasil satu test (hanya project Firestore); `who` diubah jadi inisial untuk tampilan. */
export function useTestResults(projectId: string, runId: string, testId: string | undefined, enabled: boolean) {
  const users = useUsers(enabled).data
  return useQuery({
    queryKey: [...key(projectId), runId, 'results', testId],
    queryFn: () => listResults(projectId, runId, testId!),
    enabled: enabled && !!testId,
    select: (rs) => rs.map((r) => ({ ...r, who: initialsOf(users?.find((u) => u.uid === r.who)?.name ?? r.who) })),
  })
}

/** Satu pintu data layar Test Run: store contoh untuk project `store`, Firestore untuk project lain. */
export function useRunData(projectId: string, runId: string) {
  const mock = projectId === 'store'
  const store = useRunsStore()
  const uid = useAuth((s) => s.session!.uid)
  const client = useQueryClient()
  const base = [...key(projectId), runId]
  const users = useUsers(!mock).data
  const run = useQuery({ queryKey: [...base, 'run'], queryFn: () => getRun(projectId, runId), enabled: !mock })
  const tests = useQuery({ queryKey: [...base, 'tests'], queryFn: () => listTests(projectId, runId), enabled: !mock })
  // assignee tersimpan sebagai uid; layar memakai inisial (kunci personOf dan filter "mine").
  const named = useMemo(
    () => (tests.data ?? NONE).map((t) => ({ ...t, assignee: initialsOf(users?.find((u) => u.uid === t.assignee)?.name ?? '') })),
    [tests.data, users],
  )
  const refresh = () => client.invalidateQueries({ queryKey: key(projectId) })
  const record = useMutation({
    mutationFn: ({ testId, input }: { testId: string; input: ResultInput }) => addResult(uid, projectId, runId, testId, input),
    onSuccess: refresh,
  })
  const start = useMutation({ mutationFn: () => startRun(uid, projectId, runId), onSuccess: refresh })
  const update = useMutation({ mutationFn: (patch: RunPatch) => updateRun(uid, projectId, runId, patch), onSuccess: refresh })
  const setCases = useMutation({ mutationFn: ({ cases, ids }: { cases: TestCase[]; ids: Set<string> }) => setRunCases(uid, projectId, runId, cases, ids), onSuccess: refresh })

  if (mock) {
    const mine = store.runs.find((r) => r.id === runId)
    return {
      loading: false,
      run: mine,
      tests: store.tests[runId] ?? NONE,
      plan: store.plans.find((p) => p.id === mine?.planId),
      record: (testId: string, input: ResultInput, who: string) => store.addResult(runId, testId, input, who),
      start: () => store.startRun(runId),
      update: (patch: Parameters<typeof store.updateRun>[1]) => store.updateRun(runId, patch),
      setCases: undefined,
      saving: false,
      failed: false,
    }
  }
  return {
    loading: run.isPending || tests.isPending,
    run: run.data ?? undefined,
    tests: named,
    plan: undefined,
    record: (testId: string, input: ResultInput) => record.mutate({ testId, input }),
    start: () => start.mutate(),
    update: (patch: RunPatch) => update.mutate(patch),
    /** simpan patch + daftar case sekaligus; dialog tetap terbuka bila gagal */
    setCases: (patch: RunPatch, cases: TestCase[], ids: Set<string>, done: () => void) =>
      update.mutateAsync(patch).then(() => setCases.mutateAsync({ cases, ids })).then(done, () => undefined),
    saving: update.isPending || setCases.isPending,
    failed: update.isError || setCases.isError,
  }
}
