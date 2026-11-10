import { seed, stats, store, resetFirestore, ts } from '@/lib/fakeFirestore'
import type { TestCase } from '@/features/cases/domain'
import { emptyCounts } from './domain'
import { addResult, createPlan, createRun, listPlans, deleteRun, getRun, listRecentTests, listResults, listRuns, listTests, removeCasesFromRuns, setRunCases, updateRun } from './api'

vi.mock('firebase/firestore', () => import('@/lib/fakeFirestore'))
vi.unmock('@/features/runs/api')

const P = 'projects/p1'
const tc = (n: number, status: TestCase['status'] = 'active'): TestCase => ({
  id: `C${n}`, number: n, sectionId: 's1', title: `Case ${n}`, status, priority: 'High', type: 'Functional', refs: '', estimate: '',
  automation: 'Manual', preconditions: ['pre'], steps: ['step'], expected: ['exp'], author: 'u1', createdAt: '', updatedAt: '', history: [],
})
const runDoc = (id: string) => store.get(`${P}/runs/${id}`)!
const testsOf = (runId: string) => [...store.entries()].filter(([k]) => k.startsWith(`${P}/runs/${runId}/tests/`) && k.split('/').length === 6)
const input = { name: '  Sprint 1  ', description: ' desc ', milestoneId: 'm1', planId: null, assignee: 'u2' }

beforeEach(resetFirestore)

describe('createRun', () => {
  it('writes a draft run with a snapshot test for each approved case only', async () => {
    const id = await createRun('u1', 'p1', { ...input, cases: [tc(1001), tc(1002, 'draft'), tc(1003)], start: false })

    expect(runDoc(id)).toMatchObject({ name: 'Sprint 1', description: 'desc', milestoneId: 'm1', planId: null, status: 'draft', createdBy: 'u1', counts: { ...emptyCounts(), untested: 2 } })
    const tests = testsOf(id).map(([, t]) => t)
    expect(tests.map((t) => [t.number, t.caseId, t.status, t.assignee])).toEqual([[1, 'C1001', 'untested', 'u2'], [2, 'C1003', 'untested', 'u2']])
    expect(tests[0]!.snapshot).toEqual({ title: 'Case 1001', preconditions: ['pre'], steps: ['step'], expected: ['exp'], priority: 'High' })
  })

  it('starts the run when asked', async () => {
    const id = await createRun('u1', 'p1', { ...input, cases: [tc(1001)], start: true })
    expect(runDoc(id).status).toBe('active')
    expect(runDoc(id).startedAt).toBeDefined()
  })

  it('splits tests into batches of 500 writes', async () => {
    const cases = Array.from({ length: 501 }, (_, i) => tc(1001 + i))
    const id = await createRun('u1', 'p1', { ...input, cases, start: false })
    expect(testsOf(id)).toHaveLength(501)
    expect(stats.commits).toBe(2)
  })
})

describe('plans', () => {
  it('creates a trimmed plan and lists plans by name', async () => {
    const plan = await createPlan('u1', 'p1', { name: '  Smoke ', milestoneId: 'm1' })
    await createPlan('u1', 'p1', { name: 'Regression', milestoneId: 'm1' })
    expect(store.get(`${P}/plans/${plan.id}`)).toMatchObject({ name: 'Smoke', milestoneId: 'm1', createdBy: 'u1', updatedBy: 'u1' })
    expect((await listPlans('p1')).map((p) => p.name)).toEqual(['Regression', 'Smoke'])
  })

  it('stores the plan of a new run', async () => {
    const id = await createRun('u1', 'p1', { ...input, planId: 'pl1', cases: [], start: false })
    expect(runDoc(id).planId).toBe('pl1')
  })
})

describe('reads', () => {
  it('maps a run with ISO timestamps, or null when missing', async () => {
    seed(`${P}/runs/r1`, { name: 'R', description: '', milestoneId: null, planId: null, assignee: 'u1', status: 'active', counts: emptyCounts(), createdBy: 'u1', createdAt: ts('2026-11-01T10:00:00Z'), startedAt: ts('2026-11-02T10:00:00Z') })
    expect(await getRun('p1', 'r1')).toMatchObject({ id: 'r1', createdAt: '2026-11-01T10:00:00.000Z', startedAt: '2026-11-02T10:00:00.000Z', doneAt: undefined })
    expect(await getRun('p1', 'nope')).toBeNull()
  })

  it('lists runs newest first, optionally per milestone or without one', async () => {
    seed(`${P}/runs/a`, { milestoneId: 'm1', createdAt: ts('2026-11-01T00:00:00Z') })
    seed(`${P}/runs/b`, { milestoneId: null, createdAt: ts('2026-11-03T00:00:00Z') })
    seed(`${P}/runs/c`, { milestoneId: 'm1', createdAt: ts('2026-11-02T00:00:00Z') })
    expect((await listRuns('p1')).map((r) => r.id)).toEqual(['b', 'c', 'a'])
    expect((await listRuns('p1', 'm1')).map((r) => r.id)).toEqual(['c', 'a'])
    expect((await listRuns('p1', null)).map((r) => r.id)).toEqual(['b'])
  })

  it('lists results newest first and recent tests by last result', async () => {
    seed(`${P}/runs/r1/tests/t1`, { number: 1, caseId: 'C1', status: 'failed', lastResultAt: ts('2026-11-01T00:00:00Z'), lastResultBy: 'u1' })
    seed(`${P}/runs/r1/tests/t2`, { number: 2, caseId: 'C2', status: 'passed', lastResultAt: ts('2026-11-02T00:00:00Z'), lastResultBy: 'u2' })
    seed(`${P}/runs/r1/tests/t3`, { number: 3, caseId: 'C3', status: 'untested' })
    seed(`${P}/runs/r1/tests/t1/results/x`, { status: 'passed', comment: 'old', createdBy: 'u1', createdAt: ts('2026-10-01T00:00:00Z') })
    seed(`${P}/runs/r1/tests/t1/results/y`, { status: 'failed', comment: 'new', createdBy: 'u1', createdAt: ts('2026-11-01T00:00:00Z') })

    expect((await listTests('p1', 'r1')).map((t) => [t.id, t.runId, t.results])).toEqual([['t1', 'r1', []], ['t2', 'r1', []], ['t3', 'r1', []]])
    expect((await listResults('p1', 'r1', 't1')).map((r) => r.comment)).toEqual(['new', 'old'])
    const recent = await listRecentTests('p1', 'r1', 5)
    expect(recent.map((t) => t.id)).toEqual(['t2', 't1']) // tanpa hasil tidak ikut
    expect(recent[0]!.results).toEqual([{ who: 'u2', status: 'passed', at: '2026-11-02T00:00:00.000Z', comment: '', evidence: [] }])
  })
})

describe('updateRun', () => {
  it('trims edited text and leaves other fields', async () => {
    seed(`${P}/runs/r1`, { name: 'Old', description: 'Keep', milestoneId: 'm1' })
    await updateRun('u9', 'p1', 'r1', { name: ' New ' })
    expect(runDoc('r1')).toMatchObject({ name: 'New', description: 'Keep', milestoneId: 'm1', updatedBy: 'u9' })
    await updateRun('u9', 'p1', 'r1', { description: ' D ', milestoneId: null })
    expect(runDoc('r1')).toMatchObject({ name: 'New', description: 'D', milestoneId: null })
  })
})

describe('addResult', () => {
  const open = (status: 'active' | 'done' | 'draft', counts = { ...emptyCounts(), untested: 1, passed: 1 }) => {
    seed(`${P}/runs/r1`, { status, counts })
    seed(`${P}/runs/r1/tests/t1`, { status: 'untested' })
  }

  it('records the result, moves the counts and bumps the daily tally', async () => {
    open('active')
    await addResult('u1', 'p1', 'r1', 't1', { status: 'failed', comment: '  broken  ' })

    expect(runDoc('r1')).toMatchObject({ status: 'done', counts: { ...emptyCounts(), passed: 1, failed: 1 }, updatedBy: 'u1' })
    expect(runDoc('r1').doneAt).toBeDefined()
    expect(store.get(`${P}/runs/r1/tests/t1`)).toMatchObject({ status: 'failed', lastResultBy: 'u1' })
    const [result] = [...store.entries()].filter(([k]) => k.includes('/results/'))
    expect(result![1]).toMatchObject({ status: 'failed', comment: 'broken', createdBy: 'u1' })
    const [daily] = [...store.entries()].filter(([k]) => k.startsWith(`${P}/daily/`))
    expect(daily![1]).toEqual({ failed: 1 })
  })

  it('reopens a done run on retest and drops doneAt', async () => {
    seed(`${P}/runs/r1`, { status: 'done', counts: { ...emptyCounts(), passed: 1 }, doneAt: ts('2026-11-01T00:00:00Z') })
    seed(`${P}/runs/r1/tests/t1`, { status: 'passed' })
    await addResult('u1', 'p1', 'r1', 't1', { status: 'retest', comment: '' })
    expect(runDoc('r1')).toMatchObject({ status: 'active', counts: { ...emptyCounts(), retest: 1 } })
    expect(runDoc('r1')).not.toHaveProperty('doneAt')
  })

  it('keeps the first doneAt when a done run stays done', async () => {
    const doneAt = ts('2026-11-01T00:00:00Z')
    seed(`${P}/runs/r1`, { status: 'done', counts: { ...emptyCounts(), passed: 1 }, doneAt })
    seed(`${P}/runs/r1/tests/t1`, { status: 'passed' })
    await addResult('u1', 'p1', 'r1', 't1', { status: 'failed', comment: '' })
    expect(runDoc('r1').doneAt).toBe(doneAt)
  })

  it.each([
    ['a draft run', () => open('draft')],
    ['a missing run', () => seed(`${P}/runs/r1/tests/t1`, { status: 'untested' })],
    ['a missing test', () => seed(`${P}/runs/r1`, { status: 'active', counts: emptyCounts() })],
  ])('rejects %s without writing anything', async (_, arrange) => {
    arrange()
    const before = new Map(store)
    await expect(addResult('u1', 'p1', 'r1', 't1', { status: 'passed', comment: '' })).rejects.toThrow('run-not-open')
    expect(store).toEqual(before)
  })
})

describe('deleteRun', () => {
  it('removes the run, its tests and their results', async () => {
    seed(`${P}/runs/r1`, { status: 'active' })
    seed(`${P}/runs/r1/tests/t1`, {})
    seed(`${P}/runs/r1/tests/t1/results/x`, {})
    seed(`${P}/runs/r2`, { status: 'active' })
    await deleteRun('p1', 'r1')
    expect([...store.keys()]).toEqual([`${P}/runs/r2`])
  })
})

describe('setRunCases / removeCasesFromRuns', () => {
  const run = (id: string, status: 'draft' | 'active' | 'done', tests: [string, string][], counts: Partial<ReturnType<typeof emptyCounts>>) => {
    seed(`${P}/runs/${id}`, { status, assignee: 'u2', counts: { ...emptyCounts(), ...counts }, createdAt: ts('2026-11-01T00:00:00Z') })
    tests.forEach(([caseId, status], i) => seed(`${P}/runs/${id}/tests/t${i + 1}`, { number: i + 1, caseId, status }))
  }

  it('adds new approved cases, drops unchosen ones with their results, and recounts', async () => {
    run('r1', 'active', [['C1', 'passed'], ['C2', 'untested']], { passed: 1, untested: 1 })
    seed(`${P}/runs/r1/tests/t2/results/x`, {})

    await setRunCases('u1', 'p1', 'r1', [tc(1), tc(3), tc(4, 'draft')], new Set(['C1', 'C3', 'C4']))

    expect(testsOf('r1').map(([, t]) => [t.caseId, t.number, t.status, t.assignee])).toEqual([['C1', 1, 'passed', undefined], ['C3', 3, 'untested', 'u2']])
    expect([...store.keys()].some((k) => k.includes('/results/'))).toBe(false)
    expect(runDoc('r1')).toMatchObject({ status: 'active', counts: { ...emptyCounts(), passed: 1, untested: 1 }, updatedBy: 'u1' })
  })

  it('marks the run done when only executed tests remain', async () => {
    run('r1', 'active', [['C1', 'passed'], ['C2', 'untested']], { passed: 1, untested: 1 })
    await setRunCases('u1', 'p1', 'r1', [tc(1)], new Set(['C1']))
    expect(runDoc('r1')).toMatchObject({ status: 'done', counts: { ...emptyCounts(), passed: 1 } })
    expect(runDoc('r1').doneAt).toBeDefined()
  })

  it('writes nothing when the selection did not change', async () => {
    run('r1', 'active', [['C1', 'passed']], { passed: 1 })
    const before = new Map(store)
    await setRunCases('u1', 'p1', 'r1', [tc(1)], new Set(['C1']))
    expect(store).toEqual(before)
  })

  it('removes deleted cases from every run and keeps draft runs draft', async () => {
    run('r1', 'draft', [['C1', 'untested'], ['C2', 'untested']], { untested: 2 })
    run('r2', 'active', [['C1', 'failed']], { failed: 1 })
    await removeCasesFromRuns('u1', 'p1', ['C1'])
    expect(runDoc('r1')).toMatchObject({ status: 'draft', counts: { ...emptyCounts(), untested: 1 } })
    expect(runDoc('r2')).toMatchObject({ status: 'active', counts: emptyCounts() })
    expect(testsOf('r2')).toHaveLength(0)
  })
})
