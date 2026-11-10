import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test-utils'
import { useCasesStore } from '@/features/cases/store'
import { seedFakeCases } from '@/features/cases/testing'
import { fakeApi as fakeMilestones } from '@/features/milestones/testing'
import { fakeApi as fakeRuns } from './testing'
import { useRunsStore } from './store'

const run = (name: string) => useRunsStore.getState().runs.find((r) => r.name === name)!

describe('Test Runs & Plans', () => {
  it('groups runs by milestone, with the plan row above its runs', async () => {
    renderApp('/p/store/runs')
    expect(await screen.findByText('3 Active · 1 Draft · 1 Done across 2 milestones')).toBeInTheDocument()
    const r32 = within(screen.getByRole('region', { name: 'Release 3.2' }))
    expect(r32.getByText('Regression Release 3.2')).toBeInTheDocument()
    expect(r32.getByText('Test Plan · 3 runs')).toBeInTheDocument()
    expect(r32.getAllByRole('link').map((l) => l.textContent?.split(/Active|Done|Draft/)[0])).toEqual([
      'Regression 3.2 — Chrome', 'Regression 3.2 — Firefox', 'Regression 3.2 — Safari', 'Smoke build 3.2.0-rc2',
    ])
    const r33 = within(screen.getByRole('region', { name: 'Release 3.3' }))
    expect(r33.getByText('Wishlist feature exploration')).toBeInTheDocument()
    expect(r33.getByText('Not started · 32 Active cases selected')).toBeInTheDocument()
  })

  it('shows executed % and counts for each run, and the milestone total', async () => {
    renderApp('/p/store/runs')
    const chrome = await screen.findByRole('link', { name: /Regression 3.2 — Chrome/ })
    const { counts } = run('Regression 3.2 — Chrome')
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    expect(chrome).toHaveTextContent(`${total - counts.untested} / ${total}`)
    expect(chrome).toHaveTextContent(`${Math.round(((total - counts.untested) / total) * 100)}%`)
    const m1 = useRunsStore.getState().runs.filter((r) => r.milestoneId === 'm1')
    const sum = (k: 'untested' | 'passed') => m1.reduce((n, r) => n + r.counts[k], 0)
    const all = m1.reduce((n, r) => n + Object.values(r.counts).reduce((a, b) => a + b, 0), 0)
    const milestone = within(screen.getByRole('region', { name: 'Release 3.2' }))
    expect(milestone.getByText(`${Math.round(((all - sum('untested')) / all) * 100)}% executed`, { selector: 'div > span' })).toBeInTheDocument()
    expect(milestone.getByText(`${Math.round((sum('passed') / (all - sum('untested'))) * 100)}% passed`)).toBeInTheDocument()
  })

  it('filters by run status and hides the past-runs list for Active/Draft', async () => {
    renderApp('/p/store/runs')
    await userEvent.click(await screen.findByRole('button', { name: /^Draft/ }))
    expect(screen.getByText('Wishlist feature exploration')).toBeInTheDocument()
    expect(screen.queryByText('Regression 3.2 — Chrome')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Release 3.2' })).not.toBeInTheDocument()
    expect(screen.queryByText('Done runs from earlier milestones')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Done/ }))
    expect(screen.getByText('Smoke build 3.2.0-rc2')).toBeInTheDocument()
    expect(screen.getByText('Done runs from earlier milestones')).toBeInTheDocument()
  })

  it('opens a run from the list', async () => {
    const { router } = renderApp('/p/store/runs')
    await userEvent.click(await screen.findByRole('link', { name: /Smoke build 3.2.0-rc2/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Smoke build 3.2.0-rc2' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/p/store/runs/r-smoke')
  })

  it('Add Test Run needs a name and at least one case, and only Active cases can be chosen', async () => {
    renderApp('/p/store/runs')
    await userEvent.click(await screen.findByRole('button', { name: 'Test Run' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add Test Run' })
    expect(within(dialog).getByText('Enter a run name to continue.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Create & start run' })).toBeDisabled()
    await userEvent.type(within(dialog).getByLabelText(/^Run name/), 'Regression 3.2 — Edge')
    expect(within(dialog).getByText('Select at least 1 case.')).toBeInTheDocument()

    const cases = useCasesStore.getState().cases
    const hidden = cases.filter((c) => c.status !== 'active').length
    expect(within(dialog).getByText(new RegExp(`${hidden} Draft or Under Review cases are hidden`))).toBeInTheDocument()
    // Payment di canvas: 5 Approved dari 10 case, sisanya disembunyikan
    expect(within(dialog).getAllByRole('checkbox', { name: /^C\d+/ })).toHaveLength(5)
    expect(within(dialog).queryByText('Use an expired promo code')).not.toBeInTheDocument()
  })

  it('tri-state: ticking a section selects all its Active cases; a partial pick shows mixed', async () => {
    renderApp('/p/store/runs')
    await userEvent.click(await screen.findByRole('button', { name: 'Test Run' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add Test Run' })
    const payment = within(dialog).getByRole('checkbox', { name: 'Select all Active cases in Payment' })
    const checkout = within(dialog).getByRole('checkbox', { name: 'Select all Active cases in Checkout' })
    expect(payment).toHaveAttribute('aria-checked', 'false')

    await userEvent.click(within(dialog).getByRole('checkbox', { name: /^C1041/ }))
    expect(payment).toHaveAttribute('aria-checked', 'mixed')
    expect(checkout).toHaveAttribute('aria-checked', 'mixed')

    await userEvent.click(payment)
    expect(payment).toHaveAttribute('aria-checked', 'true')
    expect(within(dialog).getByText('5 cases selected from 1 section')).toBeInTheDocument()
    await userEvent.click(payment)
    expect(payment).toHaveAttribute('aria-checked', 'false')
    expect(within(dialog).getByText(/No cases selected yet/)).toBeInTheDocument()
  })

  it('picks across sections, lets you drop one section chip, and filters by priority and search', async () => {
    renderApp('/p/store/runs')
    await userEvent.click(await screen.findByRole('button', { name: 'Test Run' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add Test Run' })
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Select all Active cases in Payment' }))
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Select all Active cases in Cart' }))
    expect(within(dialog).getByText(/cases selected from 4 sections/)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Clear selection from Payment' }))
    expect(within(dialog).getByText(/cases selected from 3 sections/)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'High' }))
    expect(within(dialog).getByRole('checkbox', { name: /Select all High priority/ })).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'All' }))
    await userEvent.type(within(dialog).getByRole('searchbox', { name: 'Search cases in all sections' }), 'C1049')
    expect(within(dialog).getAllByRole('checkbox', { name: /^C\d+/ })).toHaveLength(1)
    expect(within(dialog).getByText('1 search result')).toBeInTheDocument()
  })

  it('"All Active" lists the approved cases per top-level section', async () => {
    renderApp('/p/store/runs')
    await userEvent.click(await screen.findByRole('button', { name: 'Test Run' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add Test Run' })
    await userEvent.click(within(dialog).getByRole('radio', { name: /All Active/ }))
    const approved = useCasesStore.getState().cases.filter((c) => c.status === 'active').length
    expect(within(dialog).getByText(new RegExp(`${approved} Active cases from 6 sections`))).toBeInTheDocument()
    expect(within(dialog).getByText('Cases that become Active later are not added automatically')).toBeInTheDocument()
  })

  it('Create & start run makes an Active run with snapshots of the chosen cases; Save as Draft keeps it Draft', async () => {
    renderApp('/p/store/runs')
    await userEvent.click(await screen.findByRole('button', { name: 'Test Run' }))
    let dialog = await screen.findByRole('dialog', { name: 'Add Test Run' })
    await userEvent.type(within(dialog).getByLabelText(/^Run name/), 'Payment smoke')
    await userEvent.selectOptions(within(dialog).getByLabelText('Assign to'), 'Budi Santoso')
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Select all Active cases in Payment' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create & start run' }))

    const row = await screen.findByRole('link', { name: /Payment smoke/ })
    expect(row).toHaveTextContent('Active')
    expect(row).toHaveTextContent('Created just now · 5 Active cases from 1 section')
    expect(row).toHaveTextContent('0 / 5')
    const created = run('Payment smoke')
    const tests = useRunsStore.getState().tests[created.id]!
    expect(created).toMatchObject({ status: 'active', assignee: 'BS', counts: { untested: 5 } })
    expect(tests.map((t) => t.caseId)).toEqual(['C1041', 'C1042', 'C1043', 'C1045', 'C1049'])
    expect(tests.every((t) => t.assignee === 'BS' && t.status === 'untested')).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Test Run' }))
    dialog = await screen.findByRole('dialog', { name: 'Add Test Run' })
    await userEvent.type(within(dialog).getByLabelText(/^Run name/), 'Later run')
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /^C1041/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save as Draft' }))
    expect(await screen.findByRole('link', { name: /Later run/ })).toHaveTextContent('Draft')
    expect(run('Later run').status).toBe('draft')
  })

  it('Assign to lists the workspace users from the API, has no Test Plan field, and keeps the signed-in user as default', async () => {
    renderApp('/p/store/runs')
    await userEvent.click(await screen.findByRole('button', { name: 'Test Run' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add Test Run' })
    expect(within(dialog).queryByLabelText(/^Test Plan/)).not.toBeInTheDocument()
    const assign = within(dialog).getByLabelText(/^Assign/)
    expect(await within(assign).findByRole('option', { name: 'Budi Santoso' })).toBeInTheDocument()
    expect(assign).toHaveValue('u1')
  })

  it('a run can be created without a milestone and lands in the "No milestone" group', async () => {
    renderApp('/p/store/runs')
    await userEvent.click(await screen.findByRole('button', { name: 'Test Run' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add Test Run' })
    expect(within(dialog).getByLabelText(/^Milestone/)).toHaveValue('')
    await userEvent.type(within(dialog).getByLabelText(/^Run name/), 'Loose run')
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /^C1041/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save as Draft' }))
    const group = within(await screen.findByRole('region', { name: 'No milestone' }))
    expect(group.getByRole('link', { name: /Loose run/ })).toBeInTheDocument()
    expect(useRunsStore.getState().runs.find((r) => r.name === 'Loose run')?.milestoneId).toBeNull()
  })

  it('Add Test Plan creates a plan that shows even before it has runs', async () => {
    renderApp('/p/store/runs')
    await userEvent.click(await screen.findByRole('button', { name: 'Test Plan' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add Test Plan' })
    expect(within(dialog).getByRole('button', { name: 'Create plan' })).toBeDisabled()
    await userEvent.type(within(dialog).getByLabelText(/^Plan name/), 'Regression Release 3.3')
    await userEvent.selectOptions(within(dialog).getByLabelText('Milestone'), 'Release 3.3')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create plan' }))
    const r33 = within(await screen.findByRole('region', { name: 'Release 3.3' }))
    expect(r33.getByText('Regression Release 3.3')).toBeInTheDocument()
    expect(r33.getByText('No runs yet')).toBeInTheDocument()
  })

  it('a project without runs shows the empty state', async () => {
    renderApp('/p/mobile/runs')
    expect(await screen.findByRole('heading', { name: 'No test runs yet' })).toBeInTheDocument()
  })

  it('says why Save as Draft is disabled when a project has no Active cases', async () => {
    renderApp('/p/mobile/runs')
    await userEvent.click(await screen.findByRole('button', { name: 'Test Run' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add Test Run' })
    await userEvent.type(within(dialog).getByLabelText(/^Run name/), 'Loose run')
    expect(within(dialog).getByRole('button', { name: 'Save as Draft' })).toBeDisabled()
    expect(within(dialog).getByText(/No Active cases yet/)).toBeInTheDocument()
  })

  it('a project without runs can add a run, with or without a milestone', async () => {
    renderApp('/p/mobile/runs')
    const seeded = useCasesStore.getState().cases.find((c) => c.status === 'active')!
    seedFakeCases('mobile', { cases: [seeded], sections: useCasesStore.getState().sections })
    await userEvent.click(await screen.findByRole('button', { name: 'Test Run' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add Test Run' })
    await userEvent.type(within(dialog).getByLabelText(/^Run name/), 'Loose run')
    await userEvent.click(within(dialog).getByRole('checkbox', { name: new RegExp(`^${seeded.title.slice(0, 8)}|^C${seeded.number}`) }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save as Draft' }))
    const row = (await screen.findByText('Loose run')).closest('section')!
    expect(row).toHaveTextContent('No milestone')
    expect(row).toHaveTextContent('Draft')
  })

  it('opens a run of a non-sample project in its detail page', async () => {
    const { router } = renderApp('/p/mobile/runs')
    const seeded = useCasesStore.getState().cases.find((c) => c.status === 'active')!
    seedFakeCases('mobile', { cases: [seeded], sections: useCasesStore.getState().sections })
    await userEvent.click(await screen.findByRole('button', { name: 'Test Run' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add Test Run' })
    await userEvent.type(within(dialog).getByLabelText(/^Run name/), 'Loose run')
    await userEvent.click(within(dialog).getByRole('checkbox', { name: new RegExp(`^${seeded.title.slice(0, 8)}|^C${seeded.number}`) }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save as Draft' }))
    await userEvent.click(await screen.findByRole('link', { name: /Loose run/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Loose run' })).toBeInTheDocument()
    expect(router.state.location.pathname).toMatch(/^\/p\/mobile\/runs\/fr/)
    expect(await screen.findByRole('heading', { level: 2, name: seeded.title })).toBeInTheDocument()
  })

  it('a Firestore project saves a test plan and a run inside it', async () => {
    const { client } = renderApp('/p/mobile/runs')
    const seeded = useCasesStore.getState().cases.find((c) => c.status === 'active')!
    seedFakeCases('mobile', { cases: [seeded], sections: useCasesStore.getState().sections })
    await fakeMilestones.createMilestone('u1', 'mobile', { name: 'Sprint 9', description: '', startOn: '', dueOn: '2026-12-01' })
    await client.invalidateQueries()

    await userEvent.click(await screen.findByRole('button', { name: 'Test Plan' }))
    const planDialog = await screen.findByRole('dialog', { name: 'Add Test Plan' })
    await userEvent.type(within(planDialog).getByLabelText(/^Plan name/), 'Regression')
    await userEvent.click(within(planDialog).getByRole('button', { name: 'Create plan' }))
    const sprint = within(await screen.findByRole('region', { name: 'Sprint 9' }))
    expect(sprint.getByText('Regression')).toBeInTheDocument()
    expect(sprint.getByText('No runs yet')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Test Run' }))
    const runDialog = await screen.findByRole('dialog', { name: 'Add Test Run' })
    expect(within(runDialog).queryByLabelText(/^Test Plan/)).not.toBeInTheDocument() // plan butuh milestone dulu
    await userEvent.type(within(runDialog).getByLabelText(/^Run name/), 'Edge run')
    await userEvent.selectOptions(within(runDialog).getByLabelText(/^Milestone/), 'Sprint 9')
    await userEvent.selectOptions(within(runDialog).getByLabelText(/^Test Plan/), 'Regression')
    await userEvent.click(within(runDialog).getByRole('checkbox', { name: new RegExp(`^${seeded.title.slice(0, 8)}|^C${seeded.number}`) }))
    await userEvent.click(within(runDialog).getByRole('button', { name: 'Save as Draft' }))

    expect(await sprint.findByRole('link', { name: /Edge run/ })).toBeInTheDocument()
    const [plan] = await fakeRuns.listPlans('mobile')
    expect((await fakeRuns.listRuns('mobile'))[0]).toMatchObject({ name: 'Edge run', planId: plan!.id })
  })

  it('the project tab links to Test Runs & Results', async () => {
    renderApp('/p/store/cases')
    await userEvent.click(await screen.findByRole('link', { name: 'Test Runs & Results' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Test Runs & Results' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Test Runs & Results' })).toHaveAttribute('aria-current', 'page')
  })
})
