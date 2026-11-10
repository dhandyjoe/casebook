import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import '@/lib/i18n'
import { resetFakeCases } from '@/features/cases/testing'
import { resetCasesStore } from '@/features/cases/store'
import { resetFakeMilestones } from '@/features/milestones/testing'
import { resetFakeProjects } from '@/features/projects/testing'
import { resetFakeRuns } from '@/features/runs/testing'
import { resetRunsStore } from '@/features/runs/store'
import { useAuth } from '@/features/auth/session'
import { createTestRouter } from '@/router'

export function renderApp(url = '/', opts: { signedIn?: boolean; keepStorage?: boolean } = {}) {
  const { signedIn = true, keepStorage = false } = opts
  if (!keepStorage) {
    localStorage.clear()
    resetFakeProjects()
    resetFakeMilestones()
    resetFakeRuns()
    resetFakeCases()
  }
  resetCasesStore()
  resetRunsStore()
  useAuth.setState({ session: signedIn ? { uid: 'u1', name: 'Rina Saputra', initials: 'RS', workspaceId: 'alpha-qa' } : null, ready: true })
  const router = createTestRouter(url)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return { router, client, ...render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>) }
}
