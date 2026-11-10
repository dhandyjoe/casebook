import type { TestCase } from '@/features/cases/domain'
import {
  countTests, createRunTests, deriveRunStatus,
  type Evidence, type Plan, type Result, type ResultStatus, type Run, type RunTest, type TestStatus,
} from './domain'

// Data contoh dari canvas (artboard Test Runs & Test Run). Test dibuat dari case Approved yang ada,
// jadi jumlahnya mengikuti repository, bukan angka tetap di canvas. Diganti Firestore di fase backend.

const MIN = 60_000
const DAY = 24 * 60

export const PLANS: Plan[] = [{ id: 'reg', name: 'Regression Release 3.2', milestoneId: 'm1' }]

export interface PastRun { id: string; name: string; doneAt: string; passPct: number }
export const PAST_RUNS_TOTAL = 18

// Peta persentase kumulatif [passed, failed, blocked, retest]; sisanya Untested.
type Profile = readonly [number, number, number, number]
const statusAt = (i: number, profile: Profile, offset: number): TestStatus => {
  const r = (i * 37 + offset) % 100
  return r < profile[0] ? 'passed' : r < profile[1] ? 'failed' : r < profile[2] ? 'blocked' : r < profile[3] ? 'retest' : 'untested'
}

const NOTE: Record<ResultStatus, string> = {
  passed: 'Matches expected.',
  failed: 'Does not match the expected result.',
  blocked: 'Blocked by a missing dependency.',
  retest: 'Needs a retest after the next build.',
}

const shot = (name: string, kb: number, mock: Evidence['mock']): Evidence => ({ name, size: kb * 1024, mock })

interface RunDef {
  id: string; name: string; description: string; milestoneId: string; planId: string | null
  who: string[]; cases: TestCase[]; profile: Profile | 'draft'; offset: number; createdMinutesAgo: number
}

export function buildRunsSeed(now: Date, cases: TestCase[]) {
  const ago = (minutes: number) => new Date(now.getTime() - minutes * MIN).toISOString()
  const approved = cases.filter((c) => c.status === 'active').sort((a, b) => a.number - b.number)
  let nextTest = 2001

  const defs: RunDef[] = [
    { id: 'r-chrome', name: 'Regression 3.2 — Chrome', description: 'Chrome 130 · Windows 11 · build 3.2.0-rc2', milestoneId: 'm1', planId: 'reg', who: ['DP', 'SW', 'RS'], cases: approved, profile: [75, 80, 82, 85], offset: 11, createdMinutesAgo: 4 * DAY },
    { id: 'r-firefox', name: 'Regression 3.2 — Firefox', description: 'Firefox 132 · Windows 11 · build 3.2.0-rc2', milestoneId: 'm1', planId: 'reg', who: ['SW', 'BS'], cases: approved, profile: [66, 69, 70, 73], offset: 29, createdMinutesAgo: 4 * DAY },
    { id: 'r-safari', name: 'Regression 3.2 — Safari', description: 'Safari 18 · macOS 15 · build 3.2.0-rc2', milestoneId: 'm1', planId: 'reg', who: ['BS'], cases: approved.filter((_, i) => i % 4 !== 3).slice(0, 54), profile: [70, 83, 85, 92], offset: 5, createdMinutesAgo: 3 * DAY },
    { id: 'r-smoke', name: 'Smoke build 3.2.0-rc2', description: 'Smoke test · build 3.2.0-rc2', milestoneId: 'm1', planId: null, who: ['RS'], cases: approved.filter((c) => c.priority === 'High').slice(0, 40), profile: [100, 100, 100, 100], offset: 0, createdMinutesAgo: 2 * DAY },
    { id: 'r-wishlist', name: 'Wishlist feature exploration', description: '', milestoneId: 'm2', planId: null, who: ['SW'], cases: approved.filter((_, i) => i % 6 === 0).slice(0, 32), profile: 'draft', offset: 0, createdMinutesAgo: DAY },
  ]

  const tests: Record<string, RunTest[]> = {}
  const runs: Run[] = defs.map((d) => {
    const list = createRunTests({ runId: d.id, cases: d.cases, assignee: d.who[0]!, firstNumber: nextTest })
    nextTest += list.length

    list.forEach((t, i) => {
      t.assignee = d.who[i % d.who.length]!
      if (d.profile === 'draft') return
      const status = statusAt(i, d.profile, d.offset)
      if (status === 'untested') return
      t.status = status
      t.results = [{ who: t.assignee, status, at: ago(d.createdMinutesAgo / 2 - (i % 90) * 7), comment: NOTE[status], evidence: [] }]
    })

    // Case Payment di run Chrome: persis seperti di canvas (hasil, komentar, dan bukti gambar).
    if (d.id === 'r-chrome') {
      const set = (caseId: string, assignee: string, results: Result[]) => {
        const t = list.find((x) => x.caseId === caseId)
        if (!t) return
        t.assignee = assignee
        t.results = results
        t.status = results[0]?.status ?? 'untested'
      }
      set('C1041', 'DP', [{ who: 'DP', status: 'passed', at: ago(100), comment: 'Matches expected.', evidence: [shot('card-success.webp', 211, 'page')] }])
      set('C1042', 'DP', [{ who: 'DP', status: 'failed', at: ago(18), comment: 'Step 2: no error message appears; the page just returns to the order summary.\nDefect: JIRA-530', evidence: [shot('summary-no-error.webp', 312, 'error'), shot('console-log.webp', 148, 'console')] }])
      set('C1043', 'DP', [])
      set('C1045', 'SW', [
        { who: 'SW', status: 'retest', at: ago(35), comment: 'Needs a retest once the JIRA-521 fix is in the next build.', evidence: [] },
        { who: 'SW', status: 'failed', at: ago(DAY), comment: 'Confirmation email was not sent.', evidence: [shot('empty-inbox.webp', 96, 'page')] },
      ])
      set('C1049', 'SW', [{ who: 'SW', status: 'passed', at: ago(130), comment: 'Matches expected.', evidence: [] }])
    }

    tests[d.id] = list
    const counts = countTests(list)
    const draft = d.profile === 'draft'
    const status = draft ? 'draft' : deriveRunStatus('active', counts)
    return {
      id: d.id, name: d.name, milestoneId: d.milestoneId, planId: d.planId, assignee: d.who[0]!, description: d.description,
      status, createdAt: ago(d.createdMinutesAgo), createdBy: 'RS', counts,
      ...(draft ? {} : { startedAt: ago(d.createdMinutesAgo - 30) }),
      ...(status === 'done' ? { doneAt: ago(60) } : {}),
    }
  })

  const pastRuns: PastRun[] = [
    { id: 'p1', name: 'Smoke 3.1.4', doneAt: ago(DAY + 90), passPct: 100 },
    { id: 'p2', name: 'Regression 3.1 — Chrome', doneAt: '2026-10-28T09:30:00.000Z', passPct: 96 },
    { id: 'p3', name: 'Regression 3.1 — Firefox', doneAt: '2026-10-28T10:10:00.000Z', passPct: 94 },
  ]

  return { plans: PLANS, runs, tests, pastRuns, nextTestNumber: nextTest, nextRunNumber: 6 }
}
