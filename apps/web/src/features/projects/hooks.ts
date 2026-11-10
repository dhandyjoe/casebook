import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/session'
import { createProject, listPinned, listProjects, setPinned } from './api'

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
  const uid = useAuth((s) => s.session!.uid)
  const client = useQueryClient()
  const key = ['pins', uid]
  const pins = useQuery({ queryKey: key, queryFn: () => listPinned(uid) })
  const ids = pins.data ?? []

  const change = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => setPinned(uid, id, pinned),
    onMutate: async ({ id, pinned }) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<string[]>(key)
      const current = previous ?? []
      client.setQueryData(key, pinned ? [...current, id] : current.filter((x) => x !== id))
      return { previous }
    },
    onError: (_error, _input, context) => client.setQueryData(key, context?.previous),
  })

  return {
    ready: !pins.isPending,
    failed: pins.isError || change.isError,
    isPinned: (id: string) => ids.includes(id),
    toggle: (id: string) => change.mutate({ id, pinned: !ids.includes(id) }),
  }
}
