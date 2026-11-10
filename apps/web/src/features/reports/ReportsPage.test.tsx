import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test-utils'

describe('Reports', () => {
  it('opens from the Reports tab and starts on the project summary', async () => {
    const { router } = renderApp('/p/store/overview')
    await userEvent.click(await screen.findByRole('link', { name: 'Reports' }))
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Online Store')
    expect(router.state.location.pathname).toBe('/p/store/reports')
    expect(screen.getByRole('heading', { level: 2, name: 'Status by milestone' })).toBeInTheDocument()
  })

  it('has no Test Plan summary and no Analysis section', async () => {
    renderApp('/p/store/reports')
    const side = within(await screen.findByRole('complementary', { name: 'Report templates' }))
    expect(side.queryByText(/Test Plan/)).not.toBeInTheDocument()
    expect(side.queryByText('Analysis')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /CSV/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export PDF' })).toBeEnabled()
    expect(side.getByRole('button', { name: 'Summary — Project' })).toHaveAttribute('aria-current', 'true')
  })

  it('shows the milestone summary with its failed and blocked tests', async () => {
    const { router } = renderApp('/p/store/reports?template=milestone&id=m1')
    expect(await screen.findByRole('heading', { level: 1, name: 'Release 3.2' })).toBeInTheDocument()
    expect(screen.getByText('Regression 3.2 — Chrome', { selector: 'div' })).toBeInTheDocument()
    const table = within(screen.getByRole('region', { name: 'Test Failed & Blocked' }))
    expect(table.getAllByRole('row').length).toBeGreaterThan(1)
    await userEvent.click(screen.getByRole('button', { name: 'Summary — Test Run' }))
    expect(router.state.location.search).toMatchObject({ template: 'run' })
  })

  it('says so when the milestone does not exist', async () => {
    renderApp('/p/store/reports?template=milestone&id=nope')
    expect(await screen.findByRole('heading', { level: 1, name: 'Report not found' })).toBeInTheDocument()
  })
})
