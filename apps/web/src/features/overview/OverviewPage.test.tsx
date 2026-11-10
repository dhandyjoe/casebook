import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test-utils'
import { useCasesStore } from '@/features/cases/store'
import { fakeApi as runsApi, resetFakeRuns } from '@/features/runs/testing'
import { dayKey, lastDays } from '@/lib/time'
import { fakeDaily } from './testing'

describe('Overview', () => {
  afterEach(() => { for (const k of Object.keys(fakeDaily)) delete fakeDaily[k] })

  it('keeps every block with empty labels before any run', async () => {
    const user = userEvent.setup()
    renderApp('/p/mobile/overview')
    expect(await screen.findByText('No runs are in progress.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Mobile/ , level: 1 })).toBeInTheDocument()
    expect(screen.getByText('No results recorded in this period.')).toBeInTheDocument()
    expect(screen.getByText('No open milestones yet.')).toBeInTheDocument()
    expect(screen.getByText('No results recorded yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pass rate/ })).toHaveTextContent('No results yet')
    await user.click(screen.getByRole('button', { name: /Add Test Run/i }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('summarises runs, the last 14 days and the latest results', async () => {
    resetFakeRuns()
    const cases = useCasesStore.getState().cases.filter((c) => c.status === 'active').slice(0, 3)
    const runId = await runsApi.createRun('u1', 'store', { name: 'Smoke', description: '', milestoneId: null, planId: null, assignee: 'u1', cases, start: true })
    const [first] = await runsApi.listTests('store', runId)
    first!.status = 'failed'
    first!.results = [{ who: 'u2', status: 'failed', at: new Date().toISOString(), comment: '', evidence: [] }]
    fakeDaily[dayKey(new Date())] = { passed: 2, failed: 1 }
    renderApp('/p/store/overview', { keepStorage: true })

    await waitFor(() => expect(screen.getByRole('link', { name: /Active runs/ })).toHaveTextContent(/Active runs1/))
    const chart = within(screen.getByRole('region', { name: 'Test results' }))
    expect(chart.getAllByRole('row')).toHaveLength(1 + lastDays(14).length)
    await userEvent.setup().click(chart.getByRole('radio', { name: '7 days' }))
    expect(chart.getAllByRole('row')).toHaveLength(1 + 7)
    expect(chart.getAllByRole('row').at(-1)).toHaveTextContent(/2\s*1\s*0\s*0$/)
    const recent = within(screen.getByRole('region', { name: 'Recent activity' }))
    expect(await recent.findByText(new RegExp(first!.snapshot.title))).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: /^Active runs/ })).getByText('Smoke')).toBeInTheDocument()
  })
})
