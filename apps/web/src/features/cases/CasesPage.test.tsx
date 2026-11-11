import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fakeApi as runsApi, resetFakeRuns } from '@/features/runs/testing'
import { resetFakeMilestones } from '@/features/milestones/testing'
import { resetFakeProjects } from '@/features/projects/testing'
import { renderApp } from '@/test-utils'

vi.mock('@/lib/api', () => ({
  apiGet: async () => [{ uid: 'u1', name: 'Rina Saputra' }, { uid: 'u2', name: 'Budi Santoso' }],
}))
import { newCase } from './domain'
import { useCasesStore } from './store'
import { resetFakeCases, seedFakeCases } from './testing'

const row = (id: string) => screen.getByRole('checkbox', { name: `Select ${id}` }).closest('div')!

describe('Test Cases', () => {
  it('seeds 237 cases across the section tree, with Payment as in the canvas', async () => {
    renderApp('/p/store/cases')
    const tree = within(await screen.findByRole('complementary', { name: 'Section' }))
    expect(tree.getByRole('button', { name: /All cases/ })).toHaveTextContent('237')
    expect(tree.getByRole('button', { name: /^Checkout/ })).toHaveTextContent('35')
    expect(tree.queryByRole('button', { name: /^Payment/ })).not.toBeInTheDocument()
    await userEvent.click(tree.getByRole('button', { name: /^Checkout/ }))
    await userEvent.click(tree.getByRole('button', { name: /^Payment/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Payment' })).toBeInTheDocument()
    expect(screen.getByText('10 cases · 3 awaiting review')).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox', { name: /^Select C/ })).toHaveLength(10)
  })

  it('groups a parent section with its subsections under their own headings', async () => {
    renderApp('/p/store/cases?section=checkout')
    await screen.findByRole('region', { name: 'Checkout' })
    const sub = screen.getByRole('region', { name: 'Payment' })
    expect(within(sub).getAllByRole('checkbox', { name: /^Select C/ })).toHaveLength(10)
    expect(screen.queryByRole('region', { name: 'Cart' })).not.toBeInTheDocument()
  })

  it('deleting a section also deletes its subsections and their cases, after confirming', async () => {
    const { router } = renderApp('/p/store/cases?section=checkout')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete section' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete section?' })
    expect(within(dialog).getByText(/3 subsections and 35 cases/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete section' }))
    const { sections, cases } = useCasesStore.getState()
    expect(sections.some((s) => ['checkout', 'pay'].includes(s.id))).toBe(false)
    expect(cases.some((c) => c.sectionId === 'pay')).toBe(false)
    expect(cases.length).toBe(237 - 35)
    expect(router.state.location.search.section).toBeUndefined()
  })

  it('clicking anywhere on a row opens the case, but not its checkbox', async () => {
    renderApp('/p/store/cases?section=pay&case=C1041')
    await userEvent.click(await screen.findByText('C1043'))
    expect(await screen.findByRole('heading', { level: 2, name: 'Pay by virtual account transfer' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select C1045' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Pay by virtual account transfer' })).toBeInTheDocument()
  })

  it('copies selected cases into another section as new Drafts, keeping the originals', async () => {
    renderApp('/p/store/cases?section=pay')
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select C1041' }))
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }))
    const dialog = await screen.findByRole('dialog', { name: 'Copy cases' })
    const tree = within(within(dialog).getByRole('radiogroup', { name: 'Destination section' }))
    await userEvent.click(tree.getByRole('radio', { name: 'Cart' }))
    expect(tree.getByRole('radio', { name: 'Cart' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Copy 1 case' }))
    const { cases } = useCasesStore.getState()
    const copy = cases.find((c) => c.title === 'Pay with a valid credit card' && c.sectionId === 'keranjang')!
    expect(copy).toMatchObject({ status: 'draft', steps: cases.find((c) => c.id === 'C1041')!.steps })
    expect(copy.id).not.toBe('C1041')
    expect(cases.find((c) => c.id === 'C1041')).toMatchObject({ sectionId: 'pay' })
  })

  it('filters by review status and keeps the filter in the URL', async () => {
    const { router } = renderApp('/p/store/cases?section=pay')
    await userEvent.click(await screen.findByRole('button', { name: /^Draft/ }))
    expect(screen.getAllByRole('checkbox', { name: /^Select C/ })).toHaveLength(2)
    expect(router.state.location.search).toMatchObject({ status: 'draft' })
  })

  it('opens a case in the detail panel and steps with next/previous', async () => {
    renderApp('/p/store/cases?section=pay&case=C1047')
    expect(await screen.findByRole('heading', { level: 2, name: 'Pay with e-wallet when the balance is too low' })).toBeInTheDocument()
    expect(screen.getByText('4 steps')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next case' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Payment page on a 360 px screen' })).toBeInTheDocument()
  })

  it('A reviewer approves an Under Review case', async () => {
    renderApp('/p/store/cases?section=pay&case=C1046')
    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }))
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Waiting for review/)).not.toBeInTheDocument()
    expect(screen.queryByText(/can be used in Test Runs|You approved this case/)).not.toBeInTheDocument()
    expect(useCasesStore.getState().cases.find((c) => c.id === 'C1046')?.status).toBe('active')
  })

  it('an Under Review case offers Approve only, without Return to Draft', async () => {
    renderApp('/p/store/cases?section=pay&case=C1046')
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Return to Draft' })).not.toBeInTheDocument()
  })

  it('quick add creates a Draft in the open section and selects it', async () => {
    renderApp('/p/store/cases?section=pay')
    await userEvent.type(await screen.findByLabelText('New case title'), 'Pay with QRIS{Enter}')
    expect(await screen.findByRole('heading', { level: 2, name: 'Pay with QRIS' })).toBeInTheDocument()
    const created = useCasesStore.getState().cases.find((c) => c.title === 'Pay with QRIS')!
    expect(created).toMatchObject({ status: 'draft', sectionId: 'pay' })
    expect(created.id).toMatch(/^C\d+$/)
  })

  it('every section group has its own quick add, adding to that section', async () => {
    renderApp('/p/store/cases?section=checkout')
    const sub = await screen.findByRole('region', { name: 'Payment' })
    expect(within(await screen.findByRole('region', { name: 'Checkout' })).getAllByLabelText('New case title')).toHaveLength(1)
    await userEvent.type(within(sub).getByLabelText('New case title'), 'Pay with OVO{Enter}')
    expect(useCasesStore.getState().cases.find((c) => c.title === 'Pay with OVO')).toMatchObject({ sectionId: 'pay' })
  })

  it('quick add is not offered on "All cases"', async () => {
    renderApp('/p/store/cases')
    await screen.findByRole('heading', { level: 1, name: 'All cases' })
    expect(screen.queryByLabelText('New case title')).not.toBeInTheDocument()
  })

  it('Add case dialog: needs a title, then saves & sends for review to the chosen user', async () => {
    renderApp('/p/store/cases?section=pay')
    await userEvent.click(await screen.findByRole('button', { name: 'Add case' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add test case' })
    expect(within(dialog).getByRole('button', { name: 'Save & send for review' })).toBeDisabled()
    expect(within(dialog).getByText('Enter a title to continue.')).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText(/^Title/), 'Pay with GoPay')
    await userEvent.type(within(dialog).getByLabelText('Step 1'), 'Choose GoPay')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save & send for review' }))
    expect(useCasesStore.getState().cases.find((c) => c.title === 'Pay with GoPay')).toMatchObject({ status: 'draft', steps: ['Choose GoPay'], expected: [] })
    const review = await screen.findByRole('dialog', { name: 'Send for review' })
    await userEvent.selectOptions(await within(review).findByRole('option', { name: 'Budi Santoso' }).then((o) => o.closest('select')!), 'u2')
    await userEvent.click(within(review).getByRole('button', { name: 'Send for review' }))
    expect(useCasesStore.getState().cases.find((c) => c.title === 'Pay with GoPay')).toMatchObject({ status: 'under_review', reviewer: { uid: 'u2', name: 'Budi Santoso' } })
    expect(await screen.findByText(/Waiting for review by Budi Santoso/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  })

  it('sending a draft for review to yourself lets you approve it, making it Active', async () => {
    renderApp('/p/store/cases?section=pay&case=C1050')
    await userEvent.click(await screen.findByRole('button', { name: 'Send for review' }))
    const review = await screen.findByRole('dialog', { name: 'Send for review' })
    expect(await within(review).findByRole('option', { name: 'Rina Saputra (you)' })).toBeInTheDocument()
    await userEvent.click(within(review).getByRole('button', { name: 'Send for review' }))
    expect(await screen.findByText(/Waiting for review by you/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(useCasesStore.getState().cases.find((c) => c.id === 'C1050')?.status).toBe('active')
  })

  it('bulk bar: sends every selected Draft for review to the chosen reviewer', async () => {
    renderApp('/p/store/cases?section=pay')
    const drafts = useCasesStore.getState().cases.filter((c) => c.sectionId === 'pay' && c.status === 'draft').map((c) => c.id)
    expect(drafts.length).toBeGreaterThan(1)
    for (const id of drafts) await userEvent.click(await screen.findByRole('checkbox', { name: `Select ${id}` }))
    const bar = within(screen.getByText(`${drafts.length} selected`).parentElement!)
    await userEvent.click(bar.getByRole('button', { name: 'Send for review' }))
    const review = await screen.findByRole('dialog', { name: 'Send for review' })
    expect(within(review).getByText(`Choose who reviews these ${drafts.length} Draft cases.`)).toBeInTheDocument()
    await userEvent.selectOptions(await within(review).findByRole('option', { name: 'Budi Santoso' }).then((o) => o.closest('select')!), 'u2')
    await userEvent.click(within(review).getByRole('button', { name: 'Send for review' }))
    const after = useCasesStore.getState().cases.filter((c) => drafts.includes(c.id))
    expect(after.every((c) => c.status === 'under_review' && c.reviewer?.uid === 'u2')).toBe(true)
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument()
  })

  it('bulk bar: sending a single selected Draft also clears the selection', async () => {
    renderApp('/p/store/cases?section=pay')
    const draft = useCasesStore.getState().cases.find((c) => c.sectionId === 'pay' && c.status === 'draft')!
    await userEvent.click(await screen.findByRole('checkbox', { name: `Select ${draft.id}` }))
    await userEvent.click(within(screen.getByText('1 selected').parentElement!).getByRole('button', { name: 'Send for review' }))
    const review = await screen.findByRole('dialog', { name: 'Send for review' })
    await within(review).findByRole('option', { name: 'Rina Saputra (you)' })
    await userEvent.click(within(review).getByRole('button', { name: 'Send for review' }))
    expect(useCasesStore.getState().cases.find((c) => c.id === draft.id)?.status).toBe('under_review')
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument()
  })

  it('bulk bar: Send for review is disabled as soon as one selected case is not Draft', async () => {
    renderApp('/p/store/cases?section=pay')
    const draft = useCasesStore.getState().cases.find((c) => c.sectionId === 'pay' && c.status === 'draft')!
    await userEvent.click(await screen.findByRole('checkbox', { name: `Select ${draft.id}` }))
    const button = () => within(screen.getByText(/selected$/).parentElement!).getByRole('button', { name: 'Send for review' })
    expect(button()).toBeEnabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select C1041' })) // Active
    expect(button()).toBeDisabled()
    expect(button()).toHaveAttribute('title', expect.stringContaining('Only Draft cases'))
  })

  it('only the chosen reviewer sees Approve', async () => {
    renderApp('/p/store/cases?section=pay&case=C1046')
    useCasesStore.setState((st) => ({ cases: st.cases.map((c) => (c.id === 'C1046' ? { ...c, reviewer: { uid: 'u2', name: 'Budi Santoso' } } : c)) }))
    expect(await screen.findByText(/Waiting for review by Budi Santoso/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Return to Draft' })).not.toBeInTheDocument()
  })

  it('Expected result shows stored lists and code blocks inside the field itself, with no separate preview', async () => {
    renderApp('/p/store/cases?section=pay&case=C1042')
    useCasesStore.setState((st) => ({
      cases: st.cases.map((c) => (c.id === 'C1042' ? { ...c, expected: ['1. Open orders', '   1. Check status', '2. Run the query', '```sql\nSELECT 1;\n```', 'Done'] } : c)),
    }))
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit test case' })
    const field = await within(dialog).findByRole('textbox', { name: 'Expected result' })
    expect(within(field).getAllByRole('listitem')).toHaveLength(3)
    expect(field.querySelector('pre')).toHaveTextContent('SELECT 1;')
    expect(within(dialog).queryByText('Preview')).not.toBeInTheDocument()
  })

  it('opening and saving a case without touching Expected result does not change it', async () => {
    renderApp('/p/store/cases?section=pay&case=C1042')
    const before = useCasesStore.getState().cases.find((c) => c.id === 'C1042')!
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit test case' })
    await within(dialog).findByRole('textbox', { name: 'Expected result' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    const after = useCasesStore.getState().cases.find((c) => c.id === 'C1042')!
    expect(after.expected).toEqual(before.expected)
    expect(after.history).toHaveLength(before.history.length)
  })

  it('Expected result toolbar: Numbered list formats the current line', async () => {
    renderApp('/p/store/cases?section=pay&case=C1042')
    useCasesStore.setState((st) => ({ cases: st.cases.map((c) => (c.id === 'C1042' ? { ...c, expected: ['Row exists'] } : c)) }))
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit test case' })
    const field = await within(dialog).findByRole('textbox', { name: 'Expected result' })

    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Numbered list' })[1]!)
    expect(within(field).getAllByRole('listitem')).toHaveLength(1)
    expect(within(dialog).getAllByRole('button', { name: 'Numbered list' })[1]!).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(useCasesStore.getState().cases.find((c) => c.id === 'C1042')?.expected).toEqual(['1. Row exists'])
  })

  it('Expected result toolbar: Code turns the current line into a monospace code block, inside the field', async () => {
    renderApp('/p/store/cases?section=pay&case=C1042')
    useCasesStore.setState((st) => ({ cases: st.cases.map((c) => (c.id === 'C1042' ? { ...c, expected: ['SELECT 1;'] } : c)) }))
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit test case' })
    const field = await within(dialog).findByRole('textbox', { name: 'Expected result' })
    expect(field.querySelector('pre')).toBeNull()

    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Insert code block' })[1]!)
    expect(field.querySelector('pre')).toHaveTextContent('SELECT 1;')
    expect(within(dialog).getAllByRole('button', { name: 'Insert code block' })[1]!).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(useCasesStore.getState().cases.find((c) => c.id === 'C1042')?.expected).toEqual(['```\nSELECT 1;\n```'])
  })

  it('Add step sits at the bottom right of the steps block', async () => {
    renderApp('/p/store/cases?section=pay')
    await userEvent.click(await screen.findByRole('button', { name: 'Add case' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add test case' })
    expect(within(dialog).getByRole('button', { name: 'Add step' }).className).toContain('self-end')
  })

  it('an Active case shows no explanatory banner', async () => {
    renderApp('/p/store/cases?section=pay&case=C1041')
    await screen.findByRole('heading', { level: 2, name: 'Pay with a valid credit card' })
    expect(screen.queryByText(/can be used in Test Runs/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Waiting for review/)).not.toBeInTheDocument()
  })

  it('editing the title of an Active case keeps it Active', async () => {
    renderApp('/p/store/cases?section=pay&case=C1041')
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit test case' })
    const title = within(dialog).getByLabelText(/^Title/)
    await userEvent.clear(title)
    await userEvent.type(title, 'Pay with a valid Visa card')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(useCasesStore.getState().cases.find((c) => c.id === 'C1041')).toMatchObject({ title: 'Pay with a valid Visa card', status: 'active' })
  })

  it('bulk bar: approves only Under Review cases', async () => {
    renderApp('/p/store/cases?section=pay')
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select all cases' }))
    expect(screen.getByText('10 selected')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
    const pay = useCasesStore.getState().cases.filter((c) => c.sectionId === 'pay')
    expect(pay.filter((c) => c.status === 'active')).toHaveLength(8)
    expect(pay.filter((c) => c.status === 'draft')).toHaveLength(2)
    expect(screen.queryByText('10 selected')).not.toBeInTheDocument()
  })

  it('bulk delete asks for confirmation first', async () => {
    renderApp('/p/store/cases?section=pay')
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select C1050' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete cases?' })
    expect(useCasesStore.getState().cases.some((c) => c.id === 'C1050')).toBe(true)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete 1 case' }))
    expect(useCasesStore.getState().cases.some((c) => c.id === 'C1050')).toBe(false)
  })

  it('the destination picker can collapse, expand and search sections', async () => {
    renderApp('/p/store/cases?section=pay')
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select C1050' }))
    await userEvent.click(screen.getByRole('button', { name: 'Move' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Move cases' }))
    expect(dialog.getByRole('radio', { name: 'Add to cart' })).toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Collapse Cart' }))
    expect(dialog.queryByRole('radio', { name: 'Add to cart' })).not.toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Expand Cart' }))
    expect(dialog.getByRole('radio', { name: 'Add to cart' })).toBeInTheDocument()

    await userEvent.type(dialog.getByRole('searchbox', { name: 'Search sections' }), 'ADD TO')
    // yang cocok tampil beserta induknya; section lain disembunyikan
    expect(dialog.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Cart', 'Add to cart'])
    await userEvent.clear(dialog.getByRole('searchbox', { name: 'Search sections' }))
    await userEvent.type(dialog.getByRole('searchbox', { name: 'Search sections' }), 'zzz')
    expect(dialog.getByText('No sections match “zzz”.')).toBeInTheDocument()

    // dibuka ulang: pencarian kosong lagi
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }))
    await userEvent.click(screen.getByRole('button', { name: 'Move' }))
    expect(within(await screen.findByRole('dialog', { name: 'Move cases' })).getByRole('searchbox', { name: 'Search sections' })).toHaveValue('')
  })

  it('bulk move sends cases to another section', async () => {
    renderApp('/p/store/cases?section=pay')
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select C1050' }))
    await userEvent.click(screen.getByRole('button', { name: 'Move' }))
    const dialog = await screen.findByRole('dialog', { name: 'Move cases' })
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Add to cart' }))
    expect(within(dialog).getByText('Cart › Add to cart')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Move 1 case' }))
    expect(useCasesStore.getState().cases.find((c) => c.id === 'C1050')?.sectionId).toBe('tambah')
  })

  it('adds a section under the selected one', async () => {
    renderApp('/p/store/cases?section=checkout')
    await userEvent.click(await screen.findByRole('button', { name: 'Add section' }))
    await userEvent.type(screen.getByPlaceholderText('New section in Checkout'), 'Refunds{Enter}')
    const added = useCasesStore.getState().sections.find((s) => s.name === 'Refunds')!
    expect(added.parentId).toBe('checkout')
    expect(await screen.findByRole('heading', { level: 1, name: 'Refunds' })).toBeInTheDocument()
    expect(screen.getByText('Checkout ›')).toBeInTheDocument()
  })

  it('section tree: the arrow only expands, the name selects and expands', async () => {
    const { router } = renderApp('/p/store/cases')
    const tree = within(await screen.findByRole('complementary', { name: 'Section' }))
    await userEvent.click(tree.getByRole('button', { name: 'Expand Cart' }))
    expect(tree.getByRole('button', { name: /^Add to cart/ })).toBeInTheDocument()
    expect(router.state.location.search.section).toBeUndefined()
    await userEvent.click(tree.getByRole('button', { name: 'Collapse Cart' }))
    expect(tree.queryByRole('button', { name: /^Add to cart/ })).not.toBeInTheDocument()
    await userEvent.click(tree.getByRole('button', { name: /^Cart/ }))
    expect(router.state.location.search.section).toBe('keranjang')
    expect(tree.getByRole('button', { name: /^Add to cart/ })).toBeInTheDocument()
    expect(tree.getByRole('button', { name: 'Collapse Cart' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('resizes the section and detail panes from the keyboard, within limits, and remembers it', async () => {
    const user = userEvent.setup()
    const first = renderApp('/p/store/cases?section=pay')
    const tree = await screen.findByRole('separator', { name: 'Resize section panel' })
    const detail = screen.getByRole('separator', { name: 'Resize case details panel' })
    expect(tree).toHaveAttribute('aria-valuenow', '260')
    expect(detail).toHaveAttribute('aria-valuenow', '620')

    tree.focus()
    await user.keyboard('{ArrowRight}')
    expect(tree).toHaveAttribute('aria-valuenow', '276')
    await user.keyboard('{Shift>}{ArrowLeft}{/Shift}')
    expect(tree).toHaveAttribute('aria-valuenow', '228')
    await user.keyboard('{Home}')
    expect(tree).toHaveAttribute('aria-valuenow', '180')
    await user.keyboard('{ArrowLeft}')
    expect(tree).toHaveAttribute('aria-valuenow', '180')

    // menggeser pemisah ke kiri memperbesar panel detail
    detail.focus()
    await user.keyboard('{ArrowLeft}')
    expect(detail).toHaveAttribute('aria-valuenow', '636')

    first.unmount()
    renderApp('/p/store/cases?section=pay', { keepStorage: true })
    expect(await screen.findByRole('separator', { name: 'Resize section panel' })).toHaveAttribute('aria-valuenow', '180')
    expect(screen.getByRole('separator', { name: 'Resize case details panel' })).toHaveAttribute('aria-valuenow', '636')
  })

  it('double-click resets a pane to its default size', async () => {
    const user = userEvent.setup()
    renderApp('/p/store/cases?section=pay')
    const tree = await screen.findByRole('separator', { name: 'Resize section panel' })
    tree.focus()
    await user.keyboard('{End}')
    expect(tree).not.toHaveAttribute('aria-valuenow', '260')
    await user.dblClick(tree)
    expect(tree).toHaveAttribute('aria-valuenow', '260')
  })

  it('guides a project without cases: section first, then a case, then its detail', async () => {
    renderApp('/p/mobile/cases')
    const tree = within(await screen.findByRole('complementary', { name: 'Section' }))
    expect(tree.getByText(/No sections yet/)).toBeInTheDocument()
    expect(await screen.findByText(/Create a section in the left panel first/)).toBeInTheDocument()
    expect(screen.getByText(/No data\. Details appear here/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add case/ })).toBeDisabled()

    await userEvent.click(tree.getByRole('button', { name: 'Add section' }))
    await userEvent.type(screen.getByLabelText('New section name'), 'Login{Enter}')
    await userEvent.type(await screen.findByLabelText('New case title'), 'Sign in with valid password{Enter}')
    expect(await screen.findByRole('heading', { level: 2, name: 'Sign in with valid password' })).toBeInTheDocument()
  })

  it('selecting a case marks its row and keeps the URL in sync', async () => {
    const { router } = renderApp('/p/store/cases?section=pay')
    await userEvent.click(await screen.findByRole('button', { name: /Guest checkout without signing in/ }))
    expect(router.state.location.search).toMatchObject({ case: 'C1045' })
    expect(within(row('C1045')).getByRole('button', { name: /Guest checkout/ })).toHaveAttribute('aria-current', 'true')
  })

  it('deleting a case also removes its test from the runs of the project', async () => {
    const mk = (n: number) => ({ ...newCase({ title: `Case ${n}`, sectionId: 's1', type: 'Functional', priority: 'High', refs: '', preconditions: [], steps: [], expected: [], number: n, status: 'draft' }, 'RS', new Date()), status: 'active' as const })
    resetFakeProjects()
    resetFakeMilestones()
    resetFakeRuns()
    resetFakeCases()
    const id = await runsApi.createRun('u1', 'mobile', { name: 'Mobile smoke', description: '', milestoneId: null, planId: null, assignee: 'u1', cases: [mk(1001), mk(1002)], start: false })
    renderApp('/p/mobile/cases?section=s1', { keepStorage: true })
    seedFakeCases('mobile', { sections: [{ id: 's1', parentId: null, name: 'Login' }], cases: [mk(1001), mk(1002)] })

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select C1001' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Delete cases?' })).getByRole('button', { name: 'Delete 1 case' }))
    await waitFor(async () => expect((await runsApi.listTests('mobile', id)).map((t) => t.caseId)).toEqual(['C1002']))
    expect((await runsApi.getRun('mobile', id))?.counts.untested).toBe(1)
  })
})
