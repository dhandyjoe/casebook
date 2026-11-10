import type { ReactNode } from 'react'
import type { Project } from '@/features/projects/api'
import { AppHeader } from './AppHeader'
import { ProjectNav, type ProjectTab } from './ProjectNav'

export function ProjectShell({ project, active, children }: { project: Project; active: ProjectTab; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <AppHeader project={project} />
      <ProjectNav projectId={project.id} active={active} />
      {children}
    </div>
  )
}
