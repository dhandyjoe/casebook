import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

const TABS = ['overview', 'milestones', 'runs', 'cases', 'reports'] as const
export type ProjectTab = (typeof TABS)[number]

const ROUTES = {
  overview: '/p/$projectId/overview',
  milestones: '/p/$projectId/milestones',
  runs: '/p/$projectId/runs',
  cases: '/p/$projectId/cases',
  reports: '/p/$projectId/reports',
} as const

const tab = 'whitespace-nowrap border-b-[3px] px-3 py-3 text-[13px] tracking-[0.06em] uppercase no-underline'

export function ProjectNav({ projectId, active }: { projectId: string; active: ProjectTab }) {
  const { t } = useTranslation()
  return (
    <nav aria-label={t('nav.label')} className="flex gap-1 overflow-x-auto border-t border-header-line bg-header px-6">
      {TABS.map((key) => (
        <Link
          key={key}
          to={ROUTES[key]}
          params={{ projectId }}
          aria-current={active === key ? 'page' : undefined}
          className={`${tab} ${active === key ? 'border-white font-bold text-white' : 'border-transparent font-semibold text-header-muted'}`}
        >
          {t(`nav.${key}`)}
        </Link>
      ))}
    </nav>
  )
}
