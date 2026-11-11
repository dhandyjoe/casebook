import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test-utils'
import * as api from './api'
import { useAuth } from './session'

vi.mock('./api', async (orig) => ({
  ...(await orig<typeof api>()),
  signIn: vi.fn(),
  register: vi.fn(),
  resetPassword: vi.fn(),
  signOut: vi.fn(),
}))

const demo = { uid: 'u1', name: 'Rina Saputra', initials: 'RS', workspaceId: 'alpha-qa' }

describe('Sign in', () => {
  beforeEach(() => vi.clearAllMocks())

  it('validates before calling Firebase', async () => {
    renderApp('/', { signedIn: false })
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(api.signIn).not.toHaveBeenCalled()
  })

  it('signs in with the typed credentials and remember flag, then opens the Dashboard', async () => {
    vi.mocked(api.signIn).mockImplementation(async () => { useAuth.setState({ session: demo }) })
    renderApp('/', { signedIn: false })
    await userEvent.type(await screen.findByLabelText('Email'), 'rina@acme.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret-pass')
    await userEvent.click(screen.getByLabelText('Remember me on this device'))
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(api.signIn).toHaveBeenCalledWith('rina@acme.com', 'secret-pass', true)
    expect(await screen.findByRole('heading', { level: 1, name: /Rina/ })).toBeInTheDocument()
  })

  it('shows one generic message for wrong credentials', async () => {
    vi.mocked(api.signIn).mockRejectedValue({ code: 'auth/invalid-credential' })
    renderApp('/', { signedIn: false })
    await userEvent.type(await screen.findByLabelText('Email'), 'rina@acme.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.')
  })

  it('sends a reset link to the typed email', async () => {
    renderApp('/', { signedIn: false })
    await userEvent.type(await screen.findByLabelText('Email'), 'rina@acme.com')
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }))
    expect(api.resetPassword).toHaveBeenCalledWith('rina@acme.com')
    expect(await screen.findByRole('status')).toHaveTextContent('rina@acme.com')
  })

  it('opens the Dashboard after signing in from a deep link', async () => {
    vi.mocked(api.signIn).mockImplementation(async () => { useAuth.setState({ session: demo }) })
    const { router } = renderApp('/p/store/cases', { signedIn: false })
    await userEvent.type(await screen.findByLabelText('Email'), 'rina@acme.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret-pass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { level: 1, name: /Rina/ })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('shows Sign in for a signed-out visitor, even on a deep link', async () => {
    renderApp('/p/store/cases', { signedIn: false })
    expect(await screen.findByRole('heading', { name: 'Sign in to Casebook' })).toBeInTheDocument()
  })
})

describe('Register', () => {
  beforeEach(() => vi.clearAllMocks())

  it('is reachable from Sign in and creates the account', async () => {
    // Listener auth sudah memasang sesi tanpa workspace (users/{uid} belum tertulis); RegisterForm memakai sesi hasil register().
    vi.mocked(api.register).mockImplementation(async () => { useAuth.setState({ session: { ...demo, workspaceId: '' } }); return demo })
    renderApp('/', { signedIn: false })
    await userEvent.click(await screen.findByRole('link', { name: 'Sign up' }))
    await userEvent.type(await screen.findByLabelText('Full name'), 'Rina Saputra')
    await userEvent.selectOptions(screen.getByLabelText('Workspace Name'), 'Alpha QA')
    await userEvent.type(screen.getByLabelText('Email'), 'rina@acme.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret-pass')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(api.register).toHaveBeenCalledWith({ name: 'Rina Saputra', workspaceId: 'alpha-qa', email: 'rina@acme.com', password: 'secret-pass' })
    expect(await screen.findByRole('heading', { level: 1, name: /Rina/ })).toBeInTheDocument()
  })

  it('rejects a short password and shows the email-in-use error', async () => {
    vi.mocked(api.register).mockRejectedValue({ code: 'auth/email-already-in-use' })
    renderApp('/register', { signedIn: false })
    await userEvent.type(await screen.findByLabelText('Full name'), 'Rina')
    await userEvent.selectOptions(screen.getByLabelText('Workspace Name'), 'Beta Squad')
    await userEvent.type(screen.getByLabelText('Email'), 'rina@acme.com')
    await userEvent.type(screen.getByLabelText('Password'), 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(api.register).not.toHaveBeenCalled()
    await userEvent.type(screen.getByLabelText('Password'), 'longenough')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists.')
  })
})

describe('Sign out', () => {
  it('opens the account menu and signs out', async () => {
    vi.mocked(api.signOut).mockImplementation(async () => { useAuth.setState({ session: null }) })
    renderApp('/')
    await userEvent.click(await screen.findByRole('button', { name: 'Account: Rina Saputra' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(api.signOut).toHaveBeenCalled()
    expect(await screen.findByRole('heading', { name: 'Sign in to Casebook' })).toBeInTheDocument()
  })
})
