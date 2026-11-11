import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { newCase } from '@/features/cases/domain'
import { seedFakeCases } from '@/features/cases/testing'
import { fake } from '@/features/projects/testing'
import { addFakeRun } from '@/features/runs/testing'
import { renderApp } from '@/test-utils'

describe('Dashboard', () => {
  afterEach(() => { fake.failNext = null })

  it('lists pinned projects first, then other projects, with activity under review', async () => {
    renderApp('/')
    const pinned = await screen.findByRole('heading', { name: 'Pinned projects' })
    const others = await screen.findByRole('heading', { name: 'Other projects' })
    const review = screen.getByRole('heading', { name: 'Awaiting review' })
    const activity = screen.getByRole('heading', { name: 'Recent activity' })
    const before = (a: Node, b: Node) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
    expect(before(pinned, others)).toBeTruthy()
    expect(before(review, activity)).toBeTruthy()
    expect(await screen.findByRole('link', { name: /Seller Portal/ })).toBeInTheDocument()
  })

  it('shows case counts, active runs, awaiting review and recent activity from the backend', async () => {
    renderApp('/')
    const mk = (n: number, status: 'draft' | 'under_review') => ({
      ...newCase({ title: `Case ${n}`, sectionId: 's1', type: 'Functional', priority: 'High', refs: '', preconditions: [], steps: [], expected: [], number: n, status }, 'Budi Santoso', new Date()),
    })
    seedFakeCases('mobile', { sections: [{ id: 's1', parentId: null, name: 'Login' }], cases: [mk(1001, 'under_review'), mk(1002, 'draft')] })
    addFakeRun('mobile', { id: 'r1', name: 'Smoke', status: 'active', counts: { passed: 1, failed: 0, blocked: 0, retest: 0, untested: 1 } })
    const card = (await screen.findByRole('link', { name: /Mobile App/ })).closest('div.relative')!
    await waitFor(() => expect(card).toHaveTextContent('2 cases'))
    expect(card).toHaveTextContent('1 active run')
    expect(card).toHaveTextContent('50% executed · 100% passed')
    const review = within(screen.getByRole('heading', { name: 'Awaiting review' }).closest('section')!)
    expect(await review.findByText('Case 1001')).toBeInTheDocument()
    expect(review.getByRole('link', { name: 'Review' })).toHaveAttribute('href', expect.stringMatching(/\/p\/mobile\/cases\?.*section=s1/))
    const activity = within(screen.getByRole('heading', { name: 'Recent activity' }).closest('section')!)
    expect(await activity.findByText(/created the case/)).toBeInTheDocument()
  })

  it('shows 5 cases awaiting review, then all of them in a scrolling list after View more', async () => {
    renderApp('/')
    const cases = [1, 2, 3, 4, 5, 6, 7].map((n) => newCase({ title: `Case ${n}`, sectionId: 's1', type: 'Functional', priority: 'High', refs: '', preconditions: [], steps: [], expected: [], number: n, status: 'under_review' }, 'Budi Santoso', new Date()))
    seedFakeCases('mobile', { sections: [{ id: 's1', parentId: null, name: 'Login' }], cases })
    const review = within((await screen.findByRole('heading', { name: 'Awaiting review' })).closest('section')!)
    await userEvent.click(await review.findByRole('button', { name: 'View more (2)' }))
    expect(review.getAllByRole('link', { name: 'Review' })).toHaveLength(7)
    expect(review.getByRole('list')).toHaveClass('overflow-y-auto')
    expect(review.queryByRole('button', { name: /View more/ })).not.toBeInTheDocument()
  })

  it('shows the active workspace name in the header', async () => {
    renderApp('/')
    expect(await screen.findByLabelText('Workspace')).toHaveTextContent('Alpha QA')
  })

  it('pins and unpins a project and remembers it after a reload', async () => {
    const user = userEvent.setup()
    const first = renderApp('/')
    await user.click(await screen.findByRole('button', { name: 'Pin Seller Portal' }))
    expect(await screen.findByRole('button', { name: 'Unpin Seller Portal' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Unpin Mobile App' }))
    await screen.findByRole('button', { name: 'Pin Mobile App' })
    first.unmount()
    renderApp('/', { keepStorage: true })
    expect(await screen.findByRole('button', { name: 'Pin Mobile App' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unpin Seller Portal' })).toBeInTheDocument()
  })

  it('rolls a pin back and says so when saving fails', async () => {
    const user = userEvent.setup()
    renderApp('/')
    const button = await screen.findByRole('button', { name: 'Pin Seller Portal' })
    fake.failNext = 'pin'
    await user.click(button)
    expect(await screen.findByRole('alert')).toHaveTextContent('The pin could not be saved.')
    expect(await screen.findByRole('button', { name: 'Pin Seller Portal' })).toBeInTheDocument()
  })

  it('shows an empty state when nothing is pinned', async () => {
    const user = userEvent.setup()
    renderApp('/')
    for (const name of ['Online Store — Web', 'Mobile App', 'Admin Back-office', 'Payments API'])
      await user.click(await screen.findByRole('button', { name: `Unpin ${name}` }))
    expect(await screen.findByText(/No pinned projects yet/)).toBeInTheDocument()
  })

  it('shows project cards without NaN when nothing has been executed', async () => {
    renderApp('/')
    await screen.findByRole('link', { name: /Mobile App/ })
    expect(screen.getAllByText('Not started').length).toBeGreaterThan(0)
    expect(document.body).not.toHaveTextContent('NaN')
  })

  it('creates a project from the dialog and lists it', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await user.click(await screen.findByRole('button', { name: 'New project' }))
    const dialog = screen.getByRole('dialog')
    const create = within(dialog).getByRole('button', { name: 'Create project' })
    expect(create).toBeDisabled()
    await user.type(within(dialog).getByLabelText(/Name/), '  Loyalty Program ')
    await user.type(within(dialog).getByLabelText('Description'), 'Points and tiers')
    await user.click(create)
    expect(await screen.findByRole('link', { name: /Loyalty Program/ })).toBeInTheDocument()
    expect(fake.created).toEqual([{ uid: 'u1', name: 'Loyalty Program', description: 'Points and tiers' }])
    await waitFor(() => expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open'))
  })

  it('keeps the dialog open and shows an error when creating fails', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await user.click(await screen.findByRole('button', { name: 'New project' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/Name/), 'Loyalty Program')
    fake.failNext = 'create'
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The project could not be created.')
    expect(within(dialog).getByRole('button', { name: 'Create project' })).toBeEnabled()
  })

  it('offers to retry when projects cannot be loaded', async () => {
    fake.failNext = 'list'
    renderApp('/')
    expect(await screen.findByText(/Projects could not be loaded/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Pinned projects' })).toBeInTheDocument()
  })
})

describe('Global search', () => {
  const box = () => screen.getByRole('searchbox', { name: 'Search' })
  const results = () => within(screen.getByRole('list', { name: 'Search results' }))

  it('finds a project by name or description, case-insensitively, and opens it', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/')
    await screen.findByRole('link', { name: /Seller Portal/ })
    await user.type(box(), 'ONBOARDING')
    await user.click(await results().findByRole('button', { name: /Seller Portal.*Project/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/p/seller/cases'))
  })

  it('finds milestones, runs and cases with their project, menu and kind, and opens each one', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/')
    seedFakeCases('mobile', {
      sections: [{ id: 's1', parentId: null, name: 'Login' }],
      cases: [newCase({ title: 'Login with Google', sectionId: 's1', type: 'Functional', priority: 'High', refs: '', preconditions: [], steps: [], expected: [], number: 1001, status: 'draft' }, 'Budi', new Date())],
    })
    addFakeRun('mobile', { id: 'r9', name: 'Login smoke' })
    await screen.findByRole('link', { name: /Seller Portal/ })
    await user.type(box(), 'login')
    const testCase = await results().findByRole('button', { name: /C1001 · Login with Google/ })
    expect(testCase).toHaveTextContent('Mobile App · Test Cases')
    expect(testCase).toHaveTextContent('Test Case')
    const run = results().getByRole('button', { name: /Login smoke/ })
    expect(run).toHaveTextContent('Mobile App · Test Runs & Results')
    await user.click(testCase)
    await waitFor(() => expect(router.state.location.href).toBe('/p/mobile/cases?section=s1&case=C1001'))

    await user.type(box(), 'login smoke')
    await user.click(await results().findByRole('button', { name: /Login smoke/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/p/mobile/runs/r9'))

    await user.type(box(), 'release 3.3')
    const milestone = await results().findByRole('button', { name: /Release 3.3/ })
    expect(milestone).toHaveTextContent('Online Store — Web · Milestones')
    await user.click(milestone)
    await waitFor(() => expect(router.state.location.href).toMatch(/^\/p\/store\/milestones\?m=m2/))
  })

  it('opens the first result on Enter and closes on Escape', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/')
    await screen.findByRole('link', { name: /Seller Portal/ })
    await user.type(box(), 'mobile{Escape}')
    expect(screen.queryByRole('list', { name: 'Search results' })).not.toBeInTheDocument()
    await user.click(box())
    await user.keyboard('{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/p/mobile/cases'))
  })

  it('says so when nothing matches', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await screen.findByRole('link', { name: /Seller Portal/ })
    await user.type(box(), 'zzz')
    expect(await screen.findByText('Nothing matches “zzz”.')).toBeInTheDocument()
  })

  it('focuses the box when / is pressed', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await screen.findByRole('link', { name: /Seller Portal/ })
    await user.keyboard('/')
    expect(box()).toHaveFocus()
  })
})
