import { newCase, approve, submitForReview, type CaseEdit } from '@/features/cases/domain'
import { buildSeed } from '@/features/cases/seed'
import {
  countTests, createRunTests, deriveRunStatus, emptyCounts, planStatus, recordResult, startRun,
  type Run,
} from './domain'
import { buildRunsSeed } from './seed'

const now = new Date('2026-11-06T10:00:00Z')
const later = new Date('2026-11-06T11:00:00Z')
const fields: CaseEdit = { title: 'T', sectionId: 'pay', type: 'Functional', priority: 'High', refs: '', preconditions: ['pre'], steps: ['s1'], expected: ['e1'] }
const caseWith = (number: number, status: 'draft' | 'under_review' | 'active') => {
  const c = newCase({ ...fields, title: `Case ${number}`, number, status: 'draft' }, 'Sari', now)
  return status === 'draft' ? c : status === 'under_review' ? submitForReview(c, 'Sari', now) : approve(submitForReview(c, 'Sari', now), 'Budi', now)
}

const setup = (n: number, status: Run['status'] = 'active') => {
  const tests = createRunTests({ runId: 'r1', cases: Array.from({ length: n }, (_, i) => caseWith(1000 + i, 'active')), assignee: 'RS', firstNumber: 1 })
  const run: Run = { id: 'r1', name: 'Run', milestoneId: 'm1', planId: null, assignee: 'RS', description: '', status, createdAt: now.toISOString(), createdBy: 'RS', counts: countTests(tests) }
  return { run, tests }
}
const input = (status: 'passed' | 'failed' | 'blocked' | 'retest', comment = '') => ({ status, comment, evidence: [] })

describe('creating tests (RUN-02, APR-05)', () => {
  it('only Active cases enter a run, as untested snapshots', () => {
    const cases = [caseWith(1, 'active'), caseWith(2, 'draft'), caseWith(3, 'under_review'), caseWith(4, 'active')]
    const tests = createRunTests({ runId: 'r1', cases, assignee: 'DP', firstNumber: 2317 })
    expect(tests.map((t) => [t.id, t.caseId, t.status, t.assignee])).toEqual([['T-2317', 'C1', 'untested', 'DP'], ['T-2318', 'C4', 'untested', 'DP']])
    expect(tests[0]!.snapshot).toMatchObject({ title: 'Case 1', steps: ['s1'], expected: ['e1'], preconditions: ['pre'] })
  })
  it('the snapshot does not follow later edits of the case', () => {
    const c = caseWith(1, 'active')
    const [t] = createRunTests({ runId: 'r1', cases: [c], assignee: 'RS', firstNumber: 1 })
    c.title = 'Renamed later'
    expect(t!.snapshot.title).toBe('Case 1')
  })
})

describe('run status (RUN-10)', () => {
  it('Draft stays Draft until started; starting makes it Active', () => {
    const { run } = setup(3, 'draft')
    expect(deriveRunStatus('draft', run.counts)).toBe('draft')
    expect(startRun(run, later)).toMatchObject({ status: 'active', startedAt: later.toISOString() })
    expect(startRun(startRun(run, later), now).startedAt).toBe(later.toISOString())
  })
  it('becomes Done automatically once nothing is Untested or Retest', () => {
    let { run, tests } = setup(2)
    ;({ run, tests } = recordResult(run, tests, 'T-1', input('passed'), 'RS', now))
    expect(run.status).toBe('active')
    ;({ run, tests } = recordResult(run, tests, 'T-2', input('failed'), 'RS', later))
    expect(run).toMatchObject({ status: 'done', doneAt: later.toISOString(), counts: { passed: 1, failed: 1, untested: 0 } })
  })
  it('Blocked and Failed count as final; Retest does not', () => {
    let { run, tests } = setup(2)
    ;({ run, tests } = recordResult(run, tests, 'T-1', input('blocked'), 'RS', now))
    ;({ run, tests } = recordResult(run, tests, 'T-2', input('retest'), 'RS', now))
    expect(run.status).toBe('active')
  })
  it('a Retest on a Done run makes it Active again and clears doneAt', () => {
    let { run, tests } = setup(1)
    ;({ run, tests } = recordResult(run, tests, 'T-1', input('passed'), 'RS', now))
    expect(run.status).toBe('done')
    ;({ run, tests } = recordResult(run, tests, 'T-1', input('retest'), 'RS', later))
    expect(run.status).toBe('active')
    expect(run.doneAt).toBeUndefined()
    ;({ run } = recordResult(run, tests, 'T-1', input('passed'), 'RS', later))
    expect(run.status).toBe('done')
  })
})

describe('results are append-only (RUN-11)', () => {
  it('the newest result is the status and history keeps every result', () => {
    let { run, tests } = setup(1)
    ;({ run, tests } = recordResult(run, tests, 'T-1', input('failed', ' broke '), 'DP', now))
    ;({ run, tests } = recordResult(run, tests, 'T-1', input('passed', 'fixed'), 'SW', later))
    expect(tests[0]!.status).toBe('passed')
    expect(tests[0]!.results.map((r) => [r.status, r.comment, r.who])).toEqual([['passed', 'fixed', 'SW'], ['failed', 'broke', 'DP']])
    expect(run.counts).toMatchObject({ passed: 1, failed: 0 })
  })
  it('refuses results on a Draft run, for unknown tests and for Untested', () => {
    const draft = setup(1, 'draft')
    expect(recordResult(draft.run, draft.tests, 'T-1', input('passed'), 'RS', now).tests).toBe(draft.tests)
    const active = setup(1)
    expect(recordResult(active.run, active.tests, 'T-9', input('passed'), 'RS', now).tests).toBe(active.tests)
    expect(recordResult(active.run, active.tests, 'T-1', { status: 'untested' as never, comment: '', evidence: [] }, 'RS', now).tests).toBe(active.tests)
  })
})

describe('plan status (PLAN-04) and permissions', () => {
  const r = (status: Run['status']): Run => ({ ...setup(1).run, status })
  it('derives from its runs', () => {
    expect(planStatus([])).toBe('draft')
    expect(planStatus([r('draft'), r('draft')])).toBe('draft')
    expect(planStatus([r('done'), r('done')])).toBe('done')
    expect(planStatus([r('done'), r('draft')])).toBe('active')
    expect(planStatus([r('active'), r('done')])).toBe('active')
  })
})

describe('seed', () => {
  const seed = buildRunsSeed(now, buildSeed(now).cases)
  it('builds consistent runs: counts match tests, statuses follow the rule', () => {
    expect(seed.runs.map((r) => [r.id, r.status])).toEqual([['r-chrome', 'active'], ['r-firefox', 'active'], ['r-safari', 'active'], ['r-smoke', 'done'], ['r-wishlist', 'draft']])
    for (const run of seed.runs) {
      expect(run.counts).toEqual(countTests(seed.tests[run.id]!))
      expect(seed.tests[run.id]!.length).toBeGreaterThan(0)
    }
    expect(seed.runs.find((r) => r.id === 'r-wishlist')!.counts).toEqual({ ...emptyCounts(), untested: 32 })
  })
  it('keeps the Payment tests of the canvas, including evidence on the failed one', () => {
    const failed = seed.tests['r-chrome']!.find((t) => t.caseId === 'C1042')!
    expect(failed).toMatchObject({ status: 'failed', assignee: 'DP' })
    expect(failed.results[0]!.evidence.map((e) => e.name)).toEqual(['summary-no-error.webp', 'console-log.webp'])
    const retest = seed.tests['r-chrome']!.find((t) => t.caseId === 'C1045')!
    expect(retest.results.map((r) => r.status)).toEqual(['retest', 'failed'])
  })
  it('every test belongs to an Approved case and has unique ids', () => {
    const approved = new Set(buildSeed(now).cases.filter((c) => c.status === 'active').map((c) => c.id))
    const all = Object.values(seed.tests).flat()
    expect(all.every((t) => approved.has(t.caseId))).toBe(true)
    expect(new Set(all.map((t) => t.id)).size).toBe(all.length)
  })
})
