import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/session'
import type { Project } from '@/features/projects/api'
import { loadDashboard } from './api'

/** Tanpa kunci di bawah ['runs'/'cases', projectId]: dasbor dimuat ulang sesudah 1 menit, bukan di setiap perubahan. */
export function useDashboard(projects: Pick<Project, 'id' | 'name' | 'color'>[] | undefined) {
  const workspaceId = useAuth((s) => s.session!.workspaceId)
  return useQuery({
    queryKey: ['dashboard', workspaceId, projects?.map((p) => p.id).join(',')],
    queryFn: () => loadDashboard(projects!),
    enabled: !!projects && projects.length > 0,
    staleTime: 60_000,
  })
}
