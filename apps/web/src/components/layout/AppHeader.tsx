import { BookCheck, Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/features/auth/session'
import type { Project } from '@/features/projects/api'
import { ProjectSearch } from '@/features/projects/ProjectSearch'
import { workspaceName } from '@/lib/workspaces'
import { AccountMenu } from './AccountMenu'
import { ProjectSwitcher } from './ProjectSwitcher'

export function AppHeader({ project }: { project?: Project }) {
  const { t } = useTranslation()
  const workspaceId = useAuth((s) => s.session!.workspaceId)

  return (
    <header className="flex flex-wrap items-center gap-4 bg-header px-6 py-2.5">
      <Link to="/" className="flex items-center gap-2.5 text-[17px] font-bold tracking-tight text-white no-underline">
        <span className="flex size-[30px] items-center justify-center rounded-md bg-accent">
          <BookCheck size={18} aria-hidden="true" />
        </span>
        {t('brand')}
      </Link>
      <span aria-label={t('header.workspace')} className="rounded-md border border-header-line px-2.5 py-1 text-[13px] font-medium text-header-icon">{workspaceName(workspaceId)}</span>
      <div className="flex min-w-0 flex-1 basis-[260px] items-center justify-end gap-3">
        {project && <ProjectSwitcher project={project} />}
        <ProjectSearch />
      </div>
      <button
        type="button"
        aria-label={t('header.notifications')}
        className="relative flex size-[38px] cursor-pointer items-center justify-center rounded-md border border-header-line bg-transparent text-header-icon"
      >
        <Bell size={18} aria-hidden="true" />
      </button>
      <AccountMenu />
    </header>
  )
}
