import { createMemoryHistory, createRootRoute, createRoute, createRouter, Navigate, Outlet, useRouterState, type RouterHistory } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useProjects } from '@/features/projects/hooks'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { SignInPage } from '@/features/auth/SignInPage'
import { useAuth } from '@/features/auth/session'
import { CasesPage } from '@/features/cases/CasesPage'
import type { CaseStatus } from '@/features/cases/domain'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { MilestonesPage } from '@/features/milestones/MilestonesPage'
import { OverviewPage } from '@/features/overview/OverviewPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import type { Template } from '@/features/reports/domain'
import { RunDetailPage } from '@/features/runs/RunDetailPage'
import { RunsPage } from '@/features/runs/RunsPage'

// Halaman project memakai daftar project; tanpa gerbang ini, pembacaan yang belum selesai atau gagal tampil sebagai "not found".
function ProjectsGate() {
  const { t } = useTranslation()
  const projects = useProjects()
  if (projects.isPending) return null
  if (projects.isError)
    return (
      <div role="alert" className="flex flex-col items-center gap-3 p-8 text-center text-ink-muted">
        <p className="m-0">{t('dashboard.loadError')}</p>
        <button type="button" onClick={() => void projects.refetch()} className="h-10 cursor-pointer rounded-md border border-border-strong bg-surface px-4 font-semibold text-ink">
          {t('dashboard.retry')}
        </button>
      </div>
    )
  return <Outlet />
}

function Root() {
  const { session, ready } = useAuth()
  const path = useRouterState({ select: (s) => s.location.pathname })
  if (!ready) return null
  if (session) return <ProjectsGate />
  return path === '/register' ? <RegisterPage /> : <SignInPage />
}

const rootRoute = createRootRoute({ component: Root })
const dashboardRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: DashboardPage })
const casesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$projectId/cases',
  component: CasesPage,
  validateSearch: (s: Record<string, unknown>): { section?: string; case?: string; status?: CaseStatus } => ({
    section: typeof s.section === 'string' ? s.section : undefined,
    case: typeof s.case === 'string' ? s.case : undefined,
    status: s.status === 'draft' || s.status === 'under_review' || s.status === 'active' ? s.status : undefined,
  }),
})

const runsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/p/$projectId/runs', component: RunsPage })
const runDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$projectId/runs/$runId',
  component: RunDetailPage,
  validateSearch: (s: Record<string, unknown>): { folder?: string; test?: string } => ({
    folder: typeof s.folder === 'string' ? s.folder : undefined,
    test: typeof s.test === 'string' ? s.test : undefined,
  }),
})

const overviewRoute = createRoute({ getParentRoute: () => rootRoute, path: '/p/$projectId/overview', component: OverviewPage })
const milestonesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$projectId/milestones',
  component: MilestonesPage,
  validateSearch: (s: Record<string, unknown>): { m?: string } => ({ m: typeof s.m === 'string' ? s.m : undefined }),
})

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/p/$projectId/reports',
  component: ReportsPage,
  validateSearch: (s: Record<string, unknown>): { template: Template; id?: string } => ({
    template: s.template === 'milestone' || s.template === 'run' ? s.template : 'project',
    id: typeof s.id === 'string' ? s.id : undefined,
  }),
})

// /register hanya tampil untuk tamu (lihat Root); user yang sudah login diarahkan ke Dashboard.
const registerRoute = createRoute({ getParentRoute: () => rootRoute, path: '/register', component: () => <Navigate to="/" /> })

const routeTree = rootRoute.addChildren([registerRoute, dashboardRoute, overviewRoute, milestonesRoute, casesRoute, runsRoute, runDetailRoute, reportsRoute])

export const createAppRouter = (history?: RouterHistory) => createRouter({ routeTree, history })
export const router = createAppRouter()
export const createTestRouter = (url: string) => createAppRouter(createMemoryHistory({ initialEntries: [url] }))

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
