import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/session'
import { createMilestone, deleteMilestone, listMilestones, updateMilestone, type MilestoneInput, type MilestonePatch } from './api'

const key = (projectId: string) => ['milestones', projectId]

export const useMilestones = (projectId: string) =>
  useQuery({ queryKey: key(projectId), queryFn: () => listMilestones(projectId) })

export function useMilestoneActions(projectId: string) {
  const uid = useAuth((s) => s.session!.uid)
  const client = useQueryClient()
  const onSuccess = () => client.invalidateQueries({ queryKey: key(projectId) })
  return {
    create: useMutation({ mutationFn: (input: MilestoneInput) => createMilestone(uid, projectId, input), onSuccess }),
    update: useMutation({ mutationFn: (v: { id: string; patch: MilestonePatch }) => updateMilestone(uid, projectId, v.id, v.patch), onSuccess }),
    remove: useMutation({ mutationFn: (id: string) => deleteMilestone(projectId, id), onSuccess }),
  }
}
