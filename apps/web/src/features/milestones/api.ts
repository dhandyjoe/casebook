import { addDoc, collection, deleteDoc, doc, getDocs, limit, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { dayKey } from '@/lib/time'
import type { Milestone } from '@/features/runs/domain'

export type MilestoneInput = Pick<Milestone, 'name' | 'description' | 'startOn' | 'dueOn'>
export type MilestonePatch = Partial<MilestoneInput & Pick<Milestone, 'isCompleted'>>

const milestones = (projectId: string) => collection(db, 'projects', projectId, 'milestones')

export async function listMilestones(projectId: string): Promise<Milestone[]> {
  const snap = await getDocs(milestones(projectId))
  const rows = snap.docs.map((d) => {
    const { name, description, startOn, dueOn, isCompleted, completedOn = '' } = d.data()
    return { id: d.id, name, description, startOn, dueOn, isCompleted, completedOn } as Milestone
  })
  return rows.sort((a, b) => a.dueOn.localeCompare(b.dueOn))
}

export async function createMilestone(uid: string, projectId: string, input: MilestoneInput) {
  await addDoc(milestones(projectId), {
    ...input,
    name: input.name.trim(),
    isCompleted: false,
    completedOn: '',
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  })
}

export async function updateMilestone(uid: string, projectId: string, id: string, patch: MilestonePatch) {
  await updateDoc(doc(milestones(projectId), id), {
    ...patch,
    ...(patch.name === undefined ? {} : { name: patch.name.trim() }),
    ...(patch.isCompleted === undefined ? {} : { completedOn: patch.isCompleted ? dayKey(new Date()) : '' }),
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteMilestone(projectId: string, id: string) {
  // Rules tidak bisa query; run yang menunjuk milestone ini akan jadi yatim, jadi tolak di sini.
  const used = await getDocs(query(collection(db, 'projects', projectId, 'runs'), where('milestoneId', '==', id), limit(1)))
  if (!used.empty) throw new Error('milestone-in-use')
  await deleteDoc(doc(milestones(projectId), id))
}
