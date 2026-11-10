// Hitungan report (RPT-01..03). Fungsi murni; Test Plan sengaja tidak ada.
import { personOf } from '@/features/people/data'
import { emptyCounts, sumCounts, totalOf, type Counts, type Milestone, type Run, type RunTest } from '@/features/runs/domain'

export type Template = 'project' | 'milestone' | 'run'

export interface Kpis { total: number; executed: number; executedPct: number; passRate: number; failed: number; blocked: number }
/** `runs` hanya terisi di Summary Project; `name` kosong = run tanpa milestone. */
export interface Row { id: string; name: string; counts: Counts; runs?: number }
export interface IssueRow { id: string; testId: string; runId: string; title: string; run: string; status: 'failed' | 'blocked'; note: string; who: string }

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

export function kpisOf(c: Counts): Kpis {
  const total = totalOf(c)
  const executed = total - c.untested
  return { total, executed, executedPct: pct(executed, total), passRate: pct(c.passed, executed), failed: c.failed, blocked: c.blocked }
}

/** RPT-03: satu baris per milestone, ditambah run tanpa milestone. */
export function projectRows(milestones: Milestone[], runs: Run[]): Row[] {
  const rows = milestones.map((m) => {
    const mine = runs.filter((r) => r.milestoneId === m.id)
    return { id: m.id, name: m.name, counts: sumCounts(mine), runs: mine.length }
  })
  const loose = runs.filter((r) => !r.milestoneId || !milestones.some((m) => m.id === r.milestoneId))
  return loose.length ? [...rows, { id: '', name: '', counts: sumCounts(loose), runs: loose.length }] : rows
}

/** RPT-02 (tanpa plan): satu baris per run. */
export const runRows = (runs: Run[]): Row[] =>
  runs.map((r) => ({ id: r.id, name: r.name, counts: r.counts }))

/** RPT-01: satu baris per assignee. */
export function assigneeRows(tests: RunTest[]): Row[] {
  const by = new Map<string, Counts>()
  for (const t of tests) {
    const c = by.get(t.assignee) ?? emptyCounts()
    c[t.status]++
    by.set(t.assignee, c)
  }
  return [...by].map(([who, counts]) => ({ id: who, name: personOf(who).name, counts }))
}

/** Defect dari komentar hasil terakhir ("Defect: JIRA-530"); tanpa itu, baris pertama komentar. */
export function noteOf(t: RunTest): string {
  const comment = t.results[0]?.comment ?? ''
  return /Defect:\s*(\S+)/.exec(comment)?.[1] ?? comment.split('\n')[0] ?? ''
}

export function failedBlocked(tests: RunTest[], runs: Run[]): IssueRow[] {
  return tests
    .filter((t): t is RunTest & { status: 'failed' | 'blocked' } => t.status === 'failed' || t.status === 'blocked')
    .map((t) => ({
      id: `T-${t.number}`, testId: t.id, runId: t.runId, title: t.snapshot.title, status: t.status, note: noteOf(t),
      run: runs.find((r) => r.id === t.runId)?.name ?? '', who: personOf(t.assignee).short,
    }))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'failed' ? -1 : 1))
}
