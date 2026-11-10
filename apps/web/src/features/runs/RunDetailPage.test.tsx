import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { newCase } from '@/features/cases/domain'
import { seedFakeCases } from '@/features/cases/testing'
import { resetFakeMilestones } from '@/features/milestones/testing'
import { resetFakeProjects } from '@/features/projects/testing'
import { renderApp } from '@/test-utils'
import { useRunsStore } from './store'
import { fakeApi, resetFakeRuns } from './testing'

// Kompresi memakai canvas/createImageBitmap yang tidak ada di jsdom; diuji di browser sungguhan.
vi.mock('@/lib/evidence', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/evidence')>()),
  compressImage: vi.fn(async (f: File) => ({ name: `${f.name.replace(/\.[^.]+$/, '')}.webp`, size: 2048, dataUrl: `data:image/webp;base64,${f.name}` })),
}))

const CHROME = '/p/store/runs/r-chrome?folder=pay'
const testOf = (id: string) => useRunsStore.getState().tests['r-chrome']!.find((t) => t.id === id)!
const runOf = (id = 'r-chrome') => useRunsStore.getState().runs.find((r) => r.id === id)!

const statusButton = (id: string) => screen.getByRole('button', { name: new RegExp(`^Status ${id}:`) })
const listPane = () => within(document.querySelector('section[aria-labelledby="list-title"]') as HTMLElement)
const detail = () => within(document.querySelector('section[aria-labelledby="t-title"]') as HTMLElement)

describe('Test Run detail', () => {
  it('summarises the run: total, per-status counts with percentages, and % passed', async () => {
    renderApp(`${CHROME}&test=T-2002`)
    await screen.findByRole('heading', { level: 1, name: 'Regression 3.2 — Chrome' })
    const { counts } = runOf()
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    const summary = within(screen.getByRole('region', { name: 'Run status summary' }))
    expect(summary.getByText(String(total))).toBeInTheDocument()
    expect(summary.getByText(`${counts.passed} Passed`)).toBeInTheDocument()
    expect(summary.getByText(`${counts.untested} Untested`)).toBeInTheDocument()
    expect(summary.getByRole('img')).toHaveAccessibleName(new RegExp(`${counts.failed} Failed`))
    expect(within(screen.getByRole('region', { name: 'Passed percentage' })).getByText(`${Math.round((counts.passed / total) * 100)}%`)).toBeInTheDocument()
    expect(screen.getByText(/Turns Done automatically once the remaining \d+ tests have a final result/)).toBeInTheDocument()
  })

  it('opens the test from the URL, shows the case snapshot and result history, and steps through the folder', async () => {
    const { router } = renderApp(`${CHROME}&test=T-2002`)
    expect(await screen.findByRole('heading', { level: 2, name: 'Declined credit card shows an error message' })).toBeInTheDocument()
    expect(detail().getByText('T-2002 · C1042')).toBeInTheDocument()
    expect(detail().getByText('2 of 5')).toBeInTheDocument()
    expect(detail().getByText('3 steps')).toBeInTheDocument()
    expect(detail().getByText(/Defect: JIRA-530/)).toBeInTheDocument()
    expect(detail().getByRole('button', { name: 'Open image summary-no-error.webp' })).toBeInTheDocument()
    expect(detail().getByText('Case snapshot from when the run was created')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Next test' }))
    expect(router.state.location.search).toMatchObject({ test: 'T-2003' })
    expect(await screen.findByRole('heading', { level: 2, name: 'Pay by virtual account transfer' })).toBeInTheDocument()
    expect(detail().getByText('No results yet. This test is still Untested.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Previous test' }))
    await userEvent.click(screen.getByRole('button', { name: 'Previous test' }))
  })

  it('shows older results too, newest first', async () => {
    renderApp(`${CHROME}&test=T-2004`)
    await screen.findByRole('heading', { level: 2, name: 'Guest checkout without signing in' })
    const items = detail().getAllByRole('listitem').filter((li) => li.textContent?.includes('Sari W.'))
    expect(items[0]).toHaveTextContent('Retest')
    expect(items[1]).toHaveTextContent('Failed')
    expect(items[1]).toHaveTextContent('Confirmation email was not sent.')
  })

  it('changes a status straight from the list and records it in the history', async () => {
    renderApp(`${CHROME}&test=T-2003`)
    await userEvent.click(await screen.findByRole('button', { name: 'Status T-2003: Untested. Change status' }))
    await userEvent.click(listPane().getByRole('button', { name: /^Blocked\s*B$/ }))
    expect(statusButton('T-2003')).toHaveTextContent('Blocked')
    expect(testOf('T-2003')).toMatchObject({ status: 'blocked' })
    expect(testOf('T-2003').results[0]).toMatchObject({ who: 'RS', comment: 'Status changed from the list.' })
    expect(await detail().findByText('Status changed from the list.')).toBeInTheDocument()
  })

  it('Add result: needs a status, saves status + comment, resets the form, and the run counts follow', async () => {
    renderApp(`${CHROME}&test=T-2003`)
    await screen.findByRole('heading', { level: 2, name: 'Pay by virtual account transfer' })
    const before = { ...runOf().counts }
    const save = screen.getByRole('button', { name: /^Save$/ })
    expect(save).toBeDisabled()
    expect(screen.getByText('Pick a status first (or press P, F, B, R).')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^Failed\s*F$/ }))
    expect(save).toBeEnabled()
    await userEvent.type(screen.getByLabelText('Comment & evidence'), 'VA number missing.')
    await userEvent.click(save)

    expect(testOf('T-2003')).toMatchObject({ status: 'failed' })
    expect(testOf('T-2003').results[0]).toMatchObject({ comment: 'VA number missing.', who: 'RS', status: 'failed' })
    expect(runOf().counts).toMatchObject({ failed: before.failed + 1, untested: before.untested - 1 })
    expect(screen.getByLabelText('Comment & evidence')).toHaveValue('')
    expect(screen.getByRole('button', { name: /^Failed\s*F$/ })).toHaveAttribute('aria-pressed', 'false')
    expect(await detail().findByText('VA number missing.')).toBeInTheDocument()
  })

  it('Save & next test moves on to the next test in the folder', async () => {
    renderApp(`${CHROME}&test=T-2003`)
    await screen.findByRole('heading', { level: 2, name: 'Pay by virtual account transfer' })
    await userEvent.click(screen.getByRole('button', { name: /^Passed\s*P$/ }))
    await userEvent.click(screen.getByRole('button', { name: /Save & next test/ }))
    expect(testOf('T-2003').status).toBe('passed')
    expect(await screen.findByRole('heading', { level: 2, name: 'Guest checkout without signing in' })).toBeInTheDocument()
  })

  it('keyboard: P/F/B/R choose a status, N goes to the next test, Ctrl+Enter saves — but not while typing in a field', async () => {
    const user = userEvent.setup()
    renderApp(`${CHROME}&test=T-2003`)
    await screen.findByRole('heading', { level: 2, name: 'Pay by virtual account transfer' })

    await user.keyboard('f')
    expect(screen.getByRole('button', { name: /^Failed\s*F$/ })).toHaveAttribute('aria-pressed', 'true')
    await user.keyboard('b')
    expect(screen.getByRole('button', { name: /^Blocked\s*B$/ })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByLabelText('Comment & evidence'))
    await user.keyboard('prn')
    expect(screen.getByLabelText('Comment & evidence')).toHaveValue('prn')
    expect(screen.getByRole('button', { name: /^Blocked\s*B$/ })).toHaveAttribute('aria-pressed', 'true')

    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(testOf('T-2003')).toMatchObject({ status: 'blocked' })
    expect(await screen.findByRole('heading', { level: 2, name: 'Guest checkout without signing in' })).toBeInTheDocument()

    ;(document.activeElement as HTMLElement).blur()
    await user.keyboard('n')
    expect(await screen.findByRole('heading', { level: 2, name: 'Payment receipt can be downloaded as PDF' })).toBeInTheDocument()
  })

  it('evidence: attaches images (rejecting other formats), removes one, and keeps the rest with the result', async () => {
    const user = userEvent.setup({ applyAccept: false }) // jangan saring PDF sebelum sampai ke validasi aplikasi
    renderApp(`${CHROME}&test=T-2003`)
    await screen.findByRole('heading', { level: 2, name: 'Pay by virtual account transfer' })
    const input = screen.getByLabelText('Attach image', { selector: 'input' })
    await user.upload(input, [new File(['a'], 'one.png', { type: 'image/png' }), new File(['b'], 'two.jpg', { type: 'image/jpeg' }), new File(['c'], 'notes.pdf', { type: 'application/pdf' })])
    expect(await screen.findByText('one.webp')).toBeInTheDocument()
    expect(screen.getByText('two.webp')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('notes.pdf isn’t a PNG, JPG, GIF or WebP image.')
    expect(screen.getByText('2 / 10 images · max 10 MB, compressed automatically')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove one.webp' }))
    expect(screen.queryByText('one.webp')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Failed\s*F$/ }))
    await user.click(screen.getByRole('button', { name: /^Save$/ }))
    expect(testOf('T-2003').results[0]!.evidence.map((e) => e.name)).toEqual(['two.webp'])
    expect(await detail().findByRole('button', { name: 'Open image two.webp' })).toBeInTheDocument()
  })

  it('evidence: pasting an image into the comment box attaches it', async () => {
    renderApp(`${CHROME}&test=T-2003`)
    const box = await screen.findByLabelText('Comment & evidence')
    fireEvent.paste(box, { clipboardData: { files: [new File(['x'], 'clip.png', { type: 'image/png' })], getData: () => '' } })
    expect(await screen.findByText('clip.webp')).toBeInTheDocument()
  })

  it('lightbox: opens a result image, steps between images, and offers a download', async () => {
    const user = userEvent.setup()
    renderApp(`${CHROME}&test=T-2002`)
    await user.click(await screen.findByRole('button', { name: 'Open image summary-no-error.webp' }))
    const box = await screen.findByRole('dialog', { name: 'summary-no-error.webp' })
    expect(box).toHaveTextContent(/1 of 2/)
    await user.click(within(box).getByRole('button', { name: 'Next image' }))
    expect(await screen.findByRole('dialog', { name: 'console-log.webp' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'console-log.webp' })).not.toBeInTheDocument()
  })

  it('a Draft run can’t record results until it is started', async () => {
    renderApp('/p/store/runs/r-wishlist')
    await screen.findByRole('heading', { level: 1, name: 'Wishlist feature exploration' })
    expect(screen.getByText('This run hasn’t started. Start the run to record results.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Passed\s*P$/ })).toBeDisabled()
    expect(document.querySelector('button[aria-label^="Status T-"]')).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Start run' }))
    expect(runOf('r-wishlist').status).toBe('active')
    expect(screen.queryByRole('button', { name: 'Start run' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Passed\s*P$/ })).toBeEnabled()
  })

  it('a Done run turns Active again on Retest and Done once everything has a final result', async () => {
    renderApp('/p/store/runs/r-smoke')
    await screen.findByRole('heading', { level: 1, name: 'Smoke build 3.2.0-rc2' })
    expect(runOf('r-smoke').status).toBe('done')
    expect(screen.getByText('All tests have a final result')).toBeInTheDocument()

    await userEvent.click(document.querySelector('button[aria-label^="Status T-"]') as HTMLElement)
    await userEvent.click(listPane().getByRole('button', { name: /^Retest\s*R$/ }))
    expect(runOf('r-smoke').status).toBe('active')
    expect(screen.getByText('Turns Done automatically once the remaining 1 test has a final result')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^Passed\s*P$/ }))
    await userEvent.click(screen.getByRole('button', { name: /^Save$/ }))
    expect(runOf('r-smoke').status).toBe('done')
  })

  it('filters tests by search, status and "Assigned to me"', async () => {
    renderApp('/p/store/runs/r-chrome?folder=pay')
    await screen.findByRole('heading', { level: 1, name: 'Regression 3.2 — Chrome' })
    expect(document.querySelectorAll('button[aria-label^="Status T-"]')).toHaveLength(5)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search tests in this run' }), 'C1049')
    expect(document.querySelectorAll('button[aria-label^="Status T-"]')).toHaveLength(1)
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search tests in this run' }))

    await userEvent.click(screen.getByRole('button', { name: 'Status' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Untested' }))
    expect(document.querySelectorAll('button[aria-label^="Status T-"]')).toHaveLength(1)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Untested' }))

    await userEvent.click(screen.getByRole('checkbox', { name: 'Assigned to me' }))
    expect((await screen.findAllByText('No tests match these filters.')).length).toBeGreaterThan(0) // semua test Payment milik DP/SW
  })

  it('lists the folders of the run and filters the list by folder', async () => {
    const { router } = renderApp('/p/store/runs/r-chrome')
    const folders = within(await screen.findByRole('complementary', { name: 'Folders' }))
    expect(folders.getByRole('button', { name: 'All tests' })).toBeInTheDocument()
    await userEvent.click(folders.getByRole('button', { name: 'Expand Checkout' }))
    await userEvent.click(folders.getByRole('button', { name: 'Payment' }))
    expect(router.state.location.search).toMatchObject({ folder: 'pay' })
    expect(await screen.findByRole('heading', { level: 2, name: 'Checkout › Payment' })).toBeInTheDocument()
    expect(screen.getByText('5 tests')).toBeInTheDocument()
    expect(screen.getAllByText('4 / 5 executed')).toHaveLength(2) // judul folder + heading section
  })

  it('"Edit run" renames the run', async () => {
    renderApp('/p/store/runs/r-smoke')
    await userEvent.click(await screen.findByRole('button', { name: 'Edit run' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit run' })
    const name = within(dialog).getByLabelText(/^Run name/)
    await userEvent.clear(name)
    await userEvent.type(name, 'Smoke build 3.2.0')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Smoke build 3.2.0' })).toBeInTheDocument()
    expect(runOf('r-smoke').name).toBe('Smoke build 3.2.0')
  })

  it('links back to the case, and shows a message for an unknown run', async () => {
    renderApp(`${CHROME}&test=T-2003`)
    const link = await screen.findByRole('link', { name: 'Open case C1043' })
    expect(link).toHaveAttribute('href', expect.stringContaining('/p/store/cases'))
    expect(link.getAttribute('href')).toContain('case=C1043')
    renderApp('/p/store/runs/nope')
    expect(await screen.findByText('Run not found.')).toBeInTheDocument()
  })

  it('"Edit run" adds and removes cases of a run in a real project', async () => {
    const mk = (n: number) => ({
      ...newCase({ title: `Case ${n}`, sectionId: 's1', type: 'Functional', priority: 'High', refs: '', preconditions: [], steps: [], expected: [], number: n, status: 'draft' }, 'RS', new Date()),
      status: 'active' as const,
    })
    resetFakeProjects()
    resetFakeMilestones()
    resetFakeRuns()
    const id = await fakeApi.createRun('u1', 'mobile', { name: 'Mobile smoke', description: '', milestoneId: null, planId: null, assignee: 'u1', cases: [mk(1001), mk(1002)], start: false })
    renderApp(`/p/mobile/runs/${id}`, { keepStorage: true })
    seedFakeCases('mobile', { sections: [{ id: 's1', parentId: null, name: 'Login' }], cases: [mk(1001), mk(1002), mk(1003)] })

    await userEvent.click(await screen.findByRole('button', { name: 'Edit run' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit run' })
    expect(within(dialog).getByRole('checkbox', { name: /^C1001Case/ })).toHaveAttribute('aria-checked', 'true')
    expect(within(dialog).getByRole('checkbox', { name: /^C1003Case/ })).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /^C1003Case/ }))
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /^C1001Case/ }))
    expect(within(dialog).getByText('1 to add, 1 to remove.')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await screen.findByRole('button', { name: 'Edit run' })
    await waitFor(async () => expect((await fakeApi.listTests('mobile', id)).map((t) => t.caseId)).toEqual(['C1002', 'C1003']))
    expect((await fakeApi.getRun('mobile', id))?.counts.untested).toBe(2)
  })
})
