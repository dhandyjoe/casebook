import { emptyCounts, type Run, type RunTest } from '@/features/runs/domain'
import { assigneeRows, failedBlocked, kpisOf, noteOf, projectRows } from './domain'

const counts = (c: Partial<ReturnType<typeof emptyCounts>>) => ({ ...emptyCounts(), ...c })
const run = (id: string, milestoneId: string | null, c: Partial<ReturnType<typeof emptyCounts>>): Run =>
  ({ id, name: id, milestoneId, planId: null, assignee: 'RS', description: '', status: 'active', createdAt: '', createdBy: '', counts: counts(c) })
const test = (n: number, status: RunTest['status'], comment = ''): RunTest => ({
  id: `t${n}`, number: n, runId: 'r1', caseId: 'c', sectionId: 's', assignee: 'DP', status,
  snapshot: { title: `Case ${n}`, preconditions: [], steps: [], expected: [], priority: 'High' },
  results: comment ? [{ who: 'DP', status: 'failed', at: '', comment, evidence: [] }] : [],
})

describe('report domain', () => {
  it('computes KPIs and survives an empty run', () => {
    expect(kpisOf(counts({ passed: 463, failed: 31, blocked: 9, retest: 17, untested: 122 }))).toMatchObject({ total: 642, executed: 520, executedPct: 81, passRate: 89, failed: 31, blocked: 9 })
    expect(kpisOf(emptyCounts())).toMatchObject({ total: 0, executedPct: 0, passRate: 0 })
  })

  it('groups runs per milestone and keeps runs without a milestone', () => {
    const rows = projectRows([{ id: 'm1', name: 'R1', description: '', startOn: '', dueOn: '', isCompleted: false }], [run('a', 'm1', { passed: 2 }), run('b', 'm1', { failed: 1 }), run('c', null, { untested: 4 })])
    expect(rows.map((r) => [r.name, r.runs])).toEqual([['R1', 2], ['', 1]])
    expect(rows[0]!.counts).toMatchObject({ passed: 2, failed: 1 })
  })

  it('counts tests per assignee', () => {
    expect(assigneeRows([test(1, 'passed'), test(2, 'failed')])[0]).toMatchObject({ name: 'Dimas Pratama', counts: { passed: 1, failed: 1 } })
  })

  it('lists failed before blocked and reads the defect id from the comment', () => {
    const rows = failedBlocked([test(1, 'blocked'), test(2, 'passed'), test(3, 'failed', 'Boom.\nDefect: JIRA-530')], [run('r1', null, {})])
    expect(rows.map((r) => [r.id, r.status, r.note])).toEqual([['T-3', 'failed', 'JIRA-530'], ['T-1', 'blocked', '']])
    expect(noteOf(test(4, 'failed', 'Only a comment'))).toBe('Only a comment')
  })
})
