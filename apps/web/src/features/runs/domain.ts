// Aturan bisnis Test Run (PRD 4.1, 5.5, 5.6). Fungsi murni: nanti dipindah ke packages/shared
// dan disalin sebagai Firestore Security Rules di fase backend.
import type { Priority, TestCase } from '@/features/cases/domain'

export type TestStatus = 'passed' | 'failed' | 'blocked' | 'retest' | 'untested'
export type ResultStatus = Exclude<TestStatus, 'untested'>
export type RunStatus = 'draft' | 'active' | 'done'

/** Urutan tetap di seluruh app (design.md 2.4). */
export const STATUS_ORDER: TestStatus[] = ['passed', 'failed', 'blocked', 'retest', 'untested']
export const RESULT_STATUSES: ResultStatus[] = ['passed', 'failed', 'blocked', 'retest']
export const SHORTCUT: Record<ResultStatus, string> = { passed: 'P', failed: 'F', blocked: 'B', retest: 'R' }

export interface Evidence {
  name: string
  size: number
  /** gambar asli yang diunggah user; data contoh hanya punya `mock` */
  dataUrl?: string
  mock?: 'page' | 'error' | 'console'
}

export interface Result {
  who: string
  status: ResultStatus
  at: string
  comment: string
  evidence: Evidence[]
}

export interface CaseSnapshot {
  title: string
  preconditions: string[]
  steps: string[]
  expected: string[]
  priority: Priority
}

export interface RunTest {
  id: string
  number: number
  runId: string
  caseId: string
  sectionId: string
  assignee: string
  status: TestStatus
  snapshot: CaseSnapshot
  /** terbaru di depan; append-only */
  results: Result[]
}

export type Counts = Record<TestStatus, number>

export interface Run {
  id: string
  name: string
  /** null = run tidak terhubung ke milestone (opsional) */
  milestoneId: string | null
  planId: string | null
  assignee: string
  description: string
  status: RunStatus
  createdAt: string
  createdBy: string
  startedAt?: string
  doneAt?: string
  counts: Counts
}

/** Tanggal berformat YYYY-MM-DD; startOn kosong ('') berarti tidak diisi. Audit field hanya ada di Firestore. */
export interface Milestone { id: string; name: string; description: string; startOn: string; dueOn: string; isCompleted: boolean; /** YYYY-MM-DD saat ditandai selesai; '' atau kosong bila terbuka */ completedOn?: string }
export interface Plan { id: string; name: string; milestoneId: string }

export const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
export const emptyCounts = (): Counts => ({ passed: 0, failed: 0, blocked: 0, retest: 0, untested: 0 })
export const totalOf = (c: Counts) => STATUS_ORDER.reduce((sum, k) => sum + c[k], 0)

export function countTests(tests: RunTest[]): Counts {
  const counts = emptyCounts()
  for (const t of tests) counts[t.status]++
  return counts
}

export const sumCounts = (runs: Run[]): Counts =>
  runs.reduce((acc, r) => ({ passed: acc.passed + r.counts.passed, failed: acc.failed + r.counts.failed, blocked: acc.blocked + r.counts.blocked, retest: acc.retest + r.counts.retest, untested: acc.untested + r.counts.untested }), emptyCounts())
export const executedPct = (c: Counts) => (totalOf(c) ? Math.round(((totalOf(c) - c.untested) / totalOf(c)) * 100) : 0)

/** Persentase per status dalam urutan tetap; dipakai progress bar dan donut. */
export function percentages(c: Counts): number[] {
  const total = totalOf(c)
  return STATUS_ORDER.map((k) => (total ? (c[k] / total) * 100 : 0))
}

/** RUN-10: Done otomatis bila tidak ada test Untested maupun Retest; Retest membuat run Active lagi. */
export function deriveRunStatus(status: RunStatus, counts: Counts): RunStatus {
  if (status === 'draft') return 'draft'
  return totalOf(counts) > 0 && counts.untested === 0 && counts.retest === 0 ? 'done' : 'active'
}

/** PLAN-04: Done bila semua run Done, Draft bila semua Draft (atau kosong), selain itu Active. */
export function planStatus(runs: Run[]): RunStatus {
  if (runs.every((r) => r.status === 'draft')) return 'draft'
  return runs.every((r) => r.status === 'done') ? 'done' : 'active'
}

export function startRun(run: Run, now: Date): Run {
  if (run.status !== 'draft') return run
  const status = deriveRunStatus('active', run.counts)
  return { ...run, status, startedAt: now.toISOString(), ...(status === 'done' ? { doneAt: now.toISOString() } : {}) }
}

export const snapshotOf = (c: TestCase): CaseSnapshot => ({
  title: c.title, preconditions: c.preconditions, steps: c.steps, expected: c.expected, priority: c.priority,
})

/** RUN-02 / APR-05: hanya case Approved yang masuk run; isinya disalin sebagai snapshot. */
export function createRunTests(args: { runId: string; cases: TestCase[]; assignee: string; firstNumber: number }): RunTest[] {
  return args.cases
    .filter((c) => c.status === 'active')
    .map((c, i) => ({
      id: `T-${args.firstNumber + i}`,
      number: args.firstNumber + i,
      runId: args.runId,
      caseId: c.id,
      sectionId: c.sectionId,
      assignee: args.assignee,
      status: 'untested' as const,
      snapshot: snapshotOf(c),
      results: [],
    }))
}

export interface ResultInput { status: ResultStatus; comment: string; evidence: Evidence[] }

/**
 * Tambah hasil (append-only): status test = hasil terbaru, hitungan dan status run ikut diperbarui.
 * Ditolak (tidak berubah) bila run masih Draft atau test tidak ada.
 */
export function recordResult(run: Run, tests: RunTest[], testId: string, input: ResultInput, who: string, now: Date): { run: Run; tests: RunTest[] } {
  if (run.status === 'draft' || !tests.some((t) => t.id === testId) || !RESULT_STATUSES.includes(input.status)) return { run, tests }
  const result: Result = { who, status: input.status, at: now.toISOString(), comment: input.comment.trim(), evidence: input.evidence }
  const next = tests.map((t) => (t.id === testId ? { ...t, status: input.status, results: [result, ...t.results] } : t))
  const counts = countTests(next)
  const status = deriveRunStatus(run.status, counts)
  const { doneAt: _prev, ...rest } = run
  return { run: { ...rest, counts, status, ...(status === 'done' ? { doneAt: run.doneAt ?? now.toISOString() } : {}) }, tests: next }
}
