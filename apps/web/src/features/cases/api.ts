import {
  collection, doc, getCountFromServer, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, where, writeBatch,
  type DocumentData, type Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Section, TestCase } from './domain'

const BATCH = 500 // batas tulis per batch Firestore
const FIRST_NUMBER = 1001
const cases = (projectId: string) => collection(db, 'projects', projectId, 'cases')
const sections = (projectId: string) => collection(db, 'projects', projectId, 'sections')
const iso = (t?: Timestamp) => t?.toDate().toISOString() ?? ''

const toCase = (id: string, c: DocumentData): TestCase => ({
  id, number: c.number, sectionId: c.sectionId, title: c.title, status: c.status, priority: c.priority, type: c.type,
  refs: c.refs, estimate: c.estimate, automation: c.automation, preconditions: c.preconditions, steps: c.steps, expected: c.expected,
  author: c.author, reviewer: c.reviewer ?? undefined, history: c.history, createdAt: iso(c.createdAt), updatedAt: iso(c.updatedAt),
})

/** Field yang boleh berubah sesudah case dibuat; nomor, pembuat, dan waktu dibuat dikunci rules. */
const editable = (c: TestCase) => ({
  sectionId: c.sectionId, title: c.title, status: c.status, priority: c.priority, type: c.type, refs: c.refs, estimate: c.estimate,
  automation: c.automation, preconditions: c.preconditions, steps: c.steps, expected: c.expected, author: c.author,
  reviewer: c.reviewer ?? null, history: c.history, updatedAt: serverTimestamp(),
})

/** shortcut: baca semua section dan case project sekaligus; beri pagination bila satu project melewati ribuan case (kuota baca Spark). */
export async function listSections(projectId: string): Promise<Section[]> {
  const snap = await getDocs(sections(projectId))
  return snap.docs.map((d) => ({ id: d.id, parentId: d.data().parentId ?? null, name: d.data().name }))
}

export async function listCases(projectId: string): Promise<TestCase[]> {
  const snap = await getDocs(cases(projectId))
  return snap.docs.map((d) => toCase(d.id, d.data())).sort((a, b) => a.number - b.number)
}

export async function countCases(projectId: string): Promise<number> {
  return (await getCountFromServer(cases(projectId))).data().count
}

/** Case yang menunggu keputusan reviewer, tanpa urutan (filter sama field, jadi tanpa composite index). */
export async function listUnderReview(projectId: string): Promise<TestCase[]> {
  const snap = await getDocs(query(cases(projectId), where('status', '==', 'under_review')))
  return snap.docs.map((d) => toCase(d.id, d.data()))
}

/** Case yang paling baru berubah; `history[0]` adalah kejadian terakhirnya. */
export async function listRecentCases(projectId: string, n: number): Promise<TestCase[]> {
  const snap = await getDocs(query(cases(projectId), orderBy('updatedAt', 'desc'), limit(n)))
  return snap.docs.map((d) => toCase(d.id, d.data()))
}

/**
 * Satu transaksi: ambil nomor berurutan dari `projects.nextCaseNumber` lalu tulis case-nya.
 * `build` menerima nomor pertama dan mengembalikan case lengkap (id `C{number}`, nomor berurutan).
 */
export async function createCases(uid: string, projectId: string, build: (firstNumber: number) => TestCase[]): Promise<TestCase[]> {
  const projectRef = doc(db, 'projects', projectId)
  return runTransaction(db, async (tx) => {
    const first: number = (await tx.get(projectRef)).data()?.nextCaseNumber ?? FIRST_NUMBER
    const made = build(first)
    for (const c of made) tx.set(doc(cases(projectId), c.id), { ...editable(c), number: c.number, createdBy: uid, createdAt: serverTimestamp() })
    tx.update(projectRef, { nextCaseNumber: first + made.length })
    return made
  })
}

export async function saveCases(projectId: string, list: TestCase[]) {
  for (let i = 0; i < list.length; i += BATCH) {
    const batch = writeBatch(db)
    list.slice(i, i + BATCH).forEach((c) => batch.update(doc(cases(projectId), c.id), editable(c)))
    await batch.commit()
  }
}

export async function deleteCases(projectId: string, ids: string[]) {
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = writeBatch(db)
    ids.slice(i, i + BATCH).forEach((id) => batch.delete(doc(cases(projectId), id)))
    await batch.commit()
  }
}

export async function createSection(projectId: string, name: string, parentId: string | null): Promise<Section> {
  const ref = doc(sections(projectId))
  const section = { name: name.trim(), parentId }
  await setDoc(ref, section)
  return { id: ref.id, ...section }
}

/** Tulis section dengan id yang sudah ada (impor); menimpa bila id itu sudah tersimpan, jadi aman diulang. */
export async function importSections(projectId: string, list: Section[]) {
  for (let i = 0; i < list.length; i += BATCH) {
    const batch = writeBatch(db)
    list.slice(i, i + BATCH).forEach((s) => batch.set(doc(sections(projectId), s.id), { name: s.name.trim(), parentId: s.parentId }))
    await batch.commit()
  }
}

/** Hapus section beserta turunan dan case di dalamnya; `sectionIds` dan `caseIds` dihitung pemanggil dari data yang tampil. */
export async function deleteSections(projectId: string, sectionIds: string[], caseIds: string[]) {
  const refs = [...caseIds.map((id) => doc(cases(projectId), id)), ...sectionIds.map((id) => doc(sections(projectId), id))]
  for (let i = 0; i < refs.length; i += BATCH) {
    const batch = writeBatch(db)
    refs.slice(i, i + BATCH).forEach((r) => batch.delete(r))
    await batch.commit()
  }
}
