import { create } from 'zustand'
import type { TestCase } from '@/features/cases/domain'
import { useCasesStore } from '@/features/cases/store'
import {
  createRunTests, emptyCounts, recordResult, startRun,
  type Plan, type ResultInput, type Run, type RunTest,
} from './domain'
import { buildRunsSeed, type PastRun } from './seed'

export interface NewRun {
  name: string
  milestoneId: string | null
  planId: string | null
  assignee: string
  description: string
  cases: TestCase[]
  start: boolean
}

interface RunsState {
  plans: Plan[]
  runs: Run[]
  tests: Record<string, RunTest[]>
  pastRuns: PastRun[]
  nextTestNumber: number
  nextRunNumber: number
  createRun: (input: NewRun, who: string) => Run
  startRun: (runId: string) => void
  updateRun: (runId: string, patch: Pick<Run, 'name' | 'milestoneId' | 'planId' | 'description'>) => void
  createPlan: (input: { name: string; milestoneId: string }) => Plan
  addResult: (runId: string, testId: string, input: ResultInput, who: string) => void
}

const seed = () => buildRunsSeed(new Date(), useCasesStore.getState().cases)

// Data contoh project `store` (canvas), hanya di memori; project asli memakai features/runs/api.ts (Firestore).
export const useRunsStore = create<RunsState>()(
  (set, get) => ({
    ...seed(),
    createRun: (input, who) => {
      const { nextRunNumber, nextTestNumber } = get()
      const id = `r${nextRunNumber}`
      const tests = createRunTests({ runId: id, cases: input.cases, assignee: input.assignee, firstNumber: nextTestNumber })
      const draft: Run = {
        id, name: input.name.trim(), milestoneId: input.milestoneId, planId: input.planId, assignee: input.assignee,
        description: input.description.trim(), status: 'draft', createdAt: new Date().toISOString(), createdBy: who,
        counts: { ...emptyCounts(), untested: tests.length },
      }
      const run = input.start ? startRun(draft, new Date()) : draft
      set((s) => ({
        runs: [...s.runs, run],
        tests: { ...s.tests, [id]: tests },
        nextRunNumber: s.nextRunNumber + 1,
        nextTestNumber: s.nextTestNumber + tests.length,
      }))
      return run
    },
    startRun: (runId) => set((s) => ({ runs: s.runs.map((r) => (r.id === runId ? startRun(r, new Date()) : r)) })),
    updateRun: (runId, patch) =>
      set((s) => ({ runs: s.runs.map((r) => (r.id === runId ? { ...r, ...patch, name: patch.name.trim(), description: patch.description.trim() } : r)) })),
    createPlan: ({ name, milestoneId }) => {
      const plan: Plan = { id: `p${Date.now().toString(36)}`, name: name.trim(), milestoneId }
      set((s) => ({ plans: [...s.plans, plan] }))
      return plan
    },
    addResult: (runId, testId, input, who) => {
      const { runs, tests } = get()
      const run = runs.find((r) => r.id === runId)
      if (!run) return
      const out = recordResult(run, tests[runId] ?? [], testId, input, who, new Date())
      set({ runs: runs.map((r) => (r.id === runId ? out.run : r)), tests: { ...tests, [runId]: out.tests } })
    },
  }),
)

export function resetRunsStore() {
  useRunsStore.setState(seed())
}
