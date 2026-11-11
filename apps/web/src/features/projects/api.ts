import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type Segments = [passed: number, failed: number, blocked: number, retest: number, untested: number]
export type Project = {
  id: string
  name: string
  description: string
  color: string
  /** Pin berlaku untuk semua user di workspace. */
  pinned: boolean
}

const COLORS = ['#E08A00', '#0F766E', '#6D28D9', '#2B6CB0', '#C2410C']
const projects = () => collection(db, 'projects')

export async function listProjects(workspaceId: string): Promise<Project[]> {
  const snap = await getDocs(query(projects(), where('workspaceId', '==', workspaceId)))
  const rows = snap.docs.map((d) => {
    const { name, description, color, pinned } = d.data()
    return { id: d.id, name, description, color, pinned: pinned === true }
  })
  // Sortir di client: where + orderBy di field lain butuh composite index.
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export async function createProject(uid: string, workspaceId: string, input: { name: string; description: string }) {
  await addDoc(projects(), {
    workspaceId,
    name: input.name,
    description: input.description,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    createdBy: uid,
    createdAt: serverTimestamp(),
  })
}

export const setPinned = (projectId: string, pinned: boolean) => updateDoc(doc(db, 'projects', projectId), { pinned })
