import { dayKey } from '@/lib/time'
import type { Milestone } from '@/features/runs/domain'
import type { MilestoneInput, MilestonePatch } from './api'

// Pengganti features/milestones/api di test: data di memori per project. Id m1/m2 cocok dengan run contoh di runs/seed.
const SEED: Record<string, Milestone[]> = {
  store: [
    { id: 'm1', name: 'Release 3.2', description: '', startOn: '', dueOn: '2026-11-20', isCompleted: false },
    { id: 'm2', name: 'Release 3.3', description: '', startOn: '', dueOn: '2026-12-18', isCompleted: false },
  ],
}

let byProject: Record<string, Milestone[]> = {}

export function resetFakeMilestones() {
  byProject = structuredClone(SEED)
}

const rows = (projectId: string) => (byProject[projectId] ??= [])

export const fakeApi = {
  listMilestones: async (projectId: string) => [...rows(projectId)].sort((a, b) => a.dueOn.localeCompare(b.dueOn)),
  createMilestone: async (_uid: string, projectId: string, input: MilestoneInput) => {
    rows(projectId).push({ ...input, name: input.name.trim(), id: `m${Date.now().toString(36)}`, isCompleted: false, completedOn: '' })
  },
  updateMilestone: async (_uid: string, projectId: string, id: string, patch: MilestonePatch) => {
    byProject[projectId] = rows(projectId).map((m) => (m.id === id ? { ...m, ...patch, ...(patch.isCompleted === undefined ? {} : { completedOn: patch.isCompleted ? dayKey(new Date()) : '' }) } : m))
  },
  deleteMilestone: async (projectId: string, id: string) => {
    byProject[projectId] = rows(projectId).filter((m) => m.id !== id)
  },
}
