import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/session'
import { createProject, listProjects, setPinned, type Project } from './api'

export function useProjects() {
  const workspaceId = useAuth((s) => s.session!.workspaceId)
  return useQuery({ queryKey: ['projects', workspaceId], queryFn: () => listProjects(workspaceId) })
}

export const useProject = (id: string) => useProjects().data?.find((p) => p.id === id)

export function useCreateProject() {
  const { uid, workspaceId } = useAuth((s) => s.session!)
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; description: string }) => createProject(uid, workspaceId, input),
    onSuccess: () => client.invalidateQueries({ queryKey: ['projects', workspaceId] }),
  })
}

export function usePinned() {
  const workspaceId = useAuth((s) => s.session!.workspaceId)
  const client = useQueryClient()
  const key = ['projects', workspaceId]

  const change = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => setPinned(id, pinned),
    onMutate: async ({ id, pinned }) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<Project[]>(key)
      client.setQueryData(key, previous?.map((p) => (p.id === id ? { ...p, pinned } : p)))
      return { previous }
    },
    onError: (_error, _input, context) => client.setQueryData(key, context?.previous),
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  })

  return { failed: change.isError, toggle: (p: Project) => change.mutate({ id: p.id, pinned: !p.pinned }) }
}
