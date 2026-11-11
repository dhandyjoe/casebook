import type { TestCase } from '@/features/cases/domain'
import { countTests, createRunTests, deriveRunStatus, emptyCounts, type Plan, type Run, type RunTest } from './domain'
import type { RunInput } from './api'

// Pengganti features/runs/api di test: data di memori per project.
let byProject: Record<string, Run[]> = {}
let testsOf: Record<string, RunTest[]> = {}
let plansOf: Record<string, Plan[]> = {}

export const resetFakeRuns = () => { byProject = {}; testsOf = {}; plansOf = {} }

export const fakeApi = {
  getRun: async (projectId: string, id: string) => byProject[projectId]?.find((r) => r.id === id) ?? null,
  listTests: async (_projectId: string, runId: string) => testsOf[runId] ?? [],
  listResults: async () => [],
  listRecentTests: async (_projectId: string, runId: string, n: number) => (testsOf[runId] ?? []).filter((t) => t.results.length > 0).slice(0, n),
  listRuns: async (projectId: string) => [...(byProject[projectId] ?? [])],
  listPlans: async (projectId: string) => [...(plansOf[projectId] ?? [])],
  createRun: async (uid: string, projectId: string, input: RunInput & { cases: TestCase[]; start: boolean }) => {
    const id = `fr${Date.now().toString(36)}`
    const untested = input.cases.filter((c) => c.status === 'active').length
    ;(byProject[projectId] ??= []).push({
      id, name: input.name.trim(), description: input.description, milestoneId: input.milestoneId, planId: input.planId, assignee: input.assignee,
      status: input.start ? 'active' : 'draft', createdAt: new Date().toISOString(), createdBy: uid, counts: { ...emptyCounts(), untested },
    })
    testsOf[id] = createRunTests({ runId: id, cases: input.cases, assignee: input.assignee, firstNumber: 1 })
    return id
  },
  updateRun: async (_uid: string, projectId: string, id: string, patch: Partial<Run>) => { Object.assign(byProject[projectId]?.find((r) => r.id === id) ?? {}, patch) },
  setRunCases: async (_uid: string, projectId: string, runId: string, cases: TestCase[], chosenIds: ReadonlySet<string>) => {
    const kept = (testsOf[runId] ?? []).filter((t) => chosenIds.has(t.caseId))
    const have = new Set(kept.map((t) => t.caseId))
    const first = Math.max(0, ...(testsOf[runId] ?? []).map((t) => t.number)) + 1
    testsOf[runId] = [...kept, ...createRunTests({ runId, cases: cases.filter((c) => chosenIds.has(c.id) && !have.has(c.id)), assignee: 'u1', firstNumber: first })]
    refreshRun(projectId, runId)
  },
  removeCasesFromRuns: async (_uid: string, projectId: string, caseIds: string[]) => {
    for (const run of byProject[projectId] ?? []) {
      testsOf[run.id] = (testsOf[run.id] ?? []).filter((t) => !caseIds.includes(t.caseId))
      refreshRun(projectId, run.id)
    }
  },
}

function refreshRun(projectId: string, runId: string) {
  const run = byProject[projectId]?.find((r) => r.id === runId)
  if (!run) return
  run.counts = countTests(testsOf[runId] ?? [])
  run.status = deriveRunStatus(run.status, run.counts)
}

/** Plan siap pakai; plan baru tidak lagi dibuat dari UI, tapi plan lama tetap tampil. */
export const addFakePlan = (projectId: string, plan: Plan) => void (plansOf[projectId] ??= []).push(plan)

/** Run siap pakai untuk test layar yang membaca daftar run (mis. Milestones). */
export function addFakeRun(projectId: string, run: Partial<Run> & Pick<Run, 'id' | 'name'>) {
  ;(byProject[projectId] ??= []).push({
    description: '', milestoneId: null, planId: null, assignee: 'u1', status: 'active', createdAt: new Date().toISOString(), createdBy: 'u1', counts: emptyCounts(), ...run,
  })
}
