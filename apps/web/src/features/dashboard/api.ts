import { countCases, listRecentCases, listUnderReview } from '@/features/cases/api'
import type { HistoryAction, TestCase } from '@/features/cases/domain'
import type { Project, Segments } from '@/features/projects/api'
import { listRecentTests, listRuns } from '@/features/runs/api'
import { percentages, sumCounts, type ResultStatus } from '@/features/runs/domain'

export interface ProjectStats { cases: number; activeRuns: number; segs: Segments }
export interface ReviewItem { projectId: string; projectName: string; projectColor: string; testCase: TestCase; submittedAt: string }
export type Activity = { id: string; projectId: string; projectName: string; at: string; title: string } & (
  | { kind: 'result'; /** uid */ who: string; status: ResultStatus; test: number; runId: string; runName: string; testId: string }
  | { kind: 'case'; /** nama */ who: string; action: HistoryAction; caseId: string }
)
export interface DashboardData { stats: Record<string, ProjectStats>; review: ReviewItem[]; activity: Activity[] }

type Ref = Pick<Project, 'id' | 'name' | 'color'>
const RUNS_SCANNED = 3 // run non-Draft terbaru per project yang dicari hasil terbarunya
const PER_SOURCE = 5
export const SHOWN = 6

const submittedAt = (c: TestCase) => c.history.find((h) => h.action === 'submitted')?.at ?? c.updatedAt

/**
 * Semua angka Dashboard dari Firestore: jumlah case, run aktif, dan campuran status per project; case Under Review
 * se-workspace (terlama dulu); serta aktivitas terbaru (hasil test dan perubahan case, terbaru dulu).
 * Per project: 1 hitung case, 1 baca semua run, 1 query Under Review, ≤ 5 case terbaru, ≤ 15 test terbaru.
 */
export async function loadDashboard(projects: Ref[]): Promise<DashboardData> {
  const parts = await Promise.all(projects.map(async (p) => {
    const [cases, runs, under, recent] = await Promise.all([countCases(p.id), listRuns(p.id), listUnderReview(p.id), listRecentCases(p.id, PER_SOURCE)])
    const started = runs.filter((r) => r.status !== 'draft')
    const counts = sumCounts(started)
    const segs = (counts.passed + counts.failed + counts.blocked + counts.retest + counts.untested ? percentages(counts) : [0, 0, 0, 0, 100]) as Segments
    const tests = (await Promise.all(started.slice(0, RUNS_SCANNED).map((r) => listRecentTests(p.id, r.id, PER_SOURCE).then((ts) => ts.map((t) => [r, t] as const))))).flat()

    const results: Activity[] = tests.map(([r, t]) => ({
      kind: 'result', id: `${r.id}/${t.id}`, projectId: p.id, projectName: p.name, at: t.results[0]!.at, title: t.snapshot.title,
      who: t.results[0]!.who, status: t.results[0]!.status as ResultStatus, test: t.number, runId: r.id, runName: r.name, testId: t.id,
    }))
    const changes: Activity[] = recent.flatMap((c) => c.history[0] ? [{
      kind: 'case' as const, id: `${c.id}/${c.history[0].at}`, projectId: p.id, projectName: p.name, at: c.history[0].at, title: c.title,
      who: c.history[0].who, action: c.history[0].action, caseId: c.id,
    }] : [])
    const review: ReviewItem[] = under.map((c) => ({ projectId: p.id, projectName: p.name, projectColor: p.color, testCase: c, submittedAt: submittedAt(c) }))
    return { id: p.id, stats: { cases, activeRuns: runs.filter((r) => r.status === 'active').length, segs }, review, activity: [...results, ...changes] }
  }))

  return {
    stats: Object.fromEntries(parts.map((x) => [x.id, x.stats])),
    review: parts.flatMap((x) => x.review).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)),
    activity: parts.flatMap((x) => x.activity).sort((a, b) => b.at.localeCompare(a.at)).slice(0, SHOWN),
  }
}
