import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addFakeRun } from '@/features/runs/testing'
import { renderApp } from '@/test-utils'

const counts = (passed: number, untested: number) => ({ passed, failed: 0, blocked: 0, retest: 0, untested })

// renderApp mereset run palsu, jadi seed dipasang lewat langkah ini setelah render.
const withRuns = (url: string) => {
  const view = renderApp(url)
  addFakeRun('store', { id: 'r1', name: 'Regression 3.2 — Chrome', milestoneId: 'm1', counts: counts(8, 2) })
  addFakeRun('store', { id: 'r2', name: 'Wishlist exploration', milestoneId: 'm2', status: 'draft', counts: counts(0, 5) })
  return view
}
const list = () => within(screen.getByRole('region', { name: 'Milestones' }))
const detail = () => within(screen.getByRole('region', { name: 'Release 3.2' }))

describe('Milestones page', () => {
  it('has no To-do tab and links Overview and Milestones', async () => {
    renderApp('/p/store/milestones')
    const nav = await screen.findByRole('navigation', { name: 'Project menu' })
    expect(within(nav).queryByText('To-do')).not.toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/p/store/overview')
    expect(within(nav).getByRole('link', { name: 'Milestones' })).toHaveAttribute('aria-current', 'page')
  })

  it('lists milestones and shows the selected one with its runs', async () => {
    const user = userEvent.setup()
    withRuns('/p/store/milestones')
    await screen.findByRole('region', { name: 'Milestones' })
    await user.click(await list().findByRole('button', { name: /Release 3.3/ }))
    expect(await screen.findByRole('heading', { name: 'Release 3.3', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Wishlist exploration/ })).toHaveAttribute('href', '/p/store/runs/r2')
    await user.click(list().getByRole('button', { name: /Release 3.2/ }))
    expect(await screen.findByRole('link', { name: /Regression 3.2 — Chrome/ })).toBeInTheDocument()
    expect(detail().getByText('100%')).toBeInTheDocument()
  })

  it('keeps the layout with empty labels when there are no milestones', async () => {
    renderApp('/p/mobile/milestones')
    expect(await screen.findByText('No milestones yet')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No milestone selected', level: 2 })).toBeInTheDocument()
    expect(screen.getByText('No test runs yet. Add a run and link it to this milestone.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add milestone' })).toBeInTheDocument()
  })

  it('shows a milestone without runs as empty', async () => {
    renderApp('/p/store/milestones')
    expect(await screen.findByRole('heading', { name: 'Release 3.2', level: 2 })).toBeInTheDocument()
    expect(screen.getByText('No test runs yet. Add a run and link it to this milestone.')).toBeInTheDocument()
    expect(screen.getByText('No results yet')).toBeInTheDocument()
  })

  it('adds a milestone from the dialog', async () => {
    const user = userEvent.setup()
    renderApp('/p/store/milestones')
    await user.click(await screen.findByRole('button', { name: 'Add milestone' }))
    const create = screen.getByRole('button', { name: 'Create milestone' })
    expect(create).toBeDisabled()
    await user.type(screen.getByLabelText(/Milestone name/), 'Release 3.4')
    await user.type(screen.getByLabelText(/Due date/), '2027-01-15')
    await user.click(create)
    expect(await list().findByRole('button', { name: /Release 3.4/ })).toBeInTheDocument()
  })

  it('edits a milestone', async () => {
    const user = userEvent.setup()
    renderApp('/p/store/milestones')
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    const name = screen.getByLabelText(/Milestone name/)
    await user.clear(name)
    await user.type(name, 'Release 3.2.1')
    await user.type(screen.getByLabelText(/Description/), 'Hotfix train')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('heading', { name: 'Release 3.2.1', level: 2 })).toBeInTheDocument()
    expect(screen.getByText('Hotfix train')).toBeInTheDocument()
  })

  it('rejects a start date after the due date', async () => {
    const user = userEvent.setup()
    renderApp('/p/store/milestones')
    await user.click(await screen.findByRole('button', { name: 'Add milestone' }))
    await user.type(screen.getByLabelText(/Milestone name/), 'Release 4')
    await user.type(screen.getByLabelText(/Due date/), '2027-01-10')
    await user.type(screen.getByLabelText(/Start date/), '2027-02-01')
    expect(screen.getByRole('button', { name: 'Create milestone' })).toBeDisabled()
    expect(screen.getByText('Start date must be on or before the due date.')).toBeInTheDocument()
  })

  it('completes a milestone, locks it, and completed ones leave the run dialog', async () => {
    const user = userEvent.setup()
    renderApp('/p/store/milestones')
    await user.click(await screen.findByRole('button', { name: 'Mark as complete' }))
    // tab Open tidak lagi memuat Release 3.2, jadi pindah ke tab Completed
    await user.click(screen.getByRole('radio', { name: /Completed/ }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Release 3.2' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reopen' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as complete' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Test Runs & Results' }))
    await user.click(await screen.findByRole('button', { name: 'Test Run' }))
    const options = within(within(await screen.findByRole('dialog', { name: 'Add Test Run' })).getByLabelText(/^Milestone/)).getAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual(['No milestone', 'Release 3.3'])
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
  })

  it('opens the milestone given in ?m=, even when it is completed', async () => {
    renderApp("/p/store/milestones?m=m2")
    expect(await screen.findByRole('heading', { level: 2, name: 'Release 3.3' })).toBeInTheDocument()
  })

  it('deletes only a milestone no run uses', async () => {
    const user = userEvent.setup()
    withRuns('/p/store/milestones')
    expect(await screen.findByRole('button', { name: 'Delete' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Add milestone' }))
    await user.type(screen.getByLabelText(/Milestone name/), 'Scratch')
    await user.type(screen.getByLabelText(/Due date/), '2027-03-01')
    await user.click(screen.getByRole('button', { name: 'Create milestone' }))
    await user.click(await list().findByRole('button', { name: /Scratch/ }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Delete milestone?' })).getByRole('button', { name: 'Delete milestone' }))
    await waitFor(() => expect(list().queryByRole('button', { name: /Scratch/ })).not.toBeInTheDocument())
  })
})
