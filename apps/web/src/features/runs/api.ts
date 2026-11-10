import {
  collection, deleteDoc, deleteField, doc, getDoc, getDocs, increment, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where, writeBatch,
  type DocumentData, type Timestamp, type WriteBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { dayKey } from '@/lib/time'
import type { TestCase } from '@/features/cases/domain'
import { deriveRunStatus, emptyCounts, snapshotOf, type Counts, type Plan, type Result, type ResultStatus, type Run, type RunTest } from './domain'

export interface RunInput {
  name: string
  description: string
  /** null = tanpa milestone */
  milestoneId: string | null
  /** null = tanpa test plan; plan harus milik milestone yang sama */
  planId: string | null
  assignee: string
}
export type RunPatch = Partial<Pick<Run, 'name' | 'description' | 'milestoneId' | 'planId'>>

const BATCH = 500 // batas tulis per batch Firestore
const runs = (projectId: string) => collection(db, 'projects', projectId, 'runs')
const plans = (projectId: string) => collection(db, 'projects', projectId, 'plans')
const iso = (t?: Timestamp) => t?.toDate().toISOString()

const toRun = (id: string, r: DocumentData): Run => ({
  id, name: r.name, description: r.description, milestoneId: r.milestoneId, planId: r.planId, assignee: r.assignee,
  status: r.status, counts: r.counts, createdBy: r.createdBy, createdAt: iso(r.createdAt) ?? '',
  startedAt: iso(r.startedAt), doneAt: iso(r.doneAt),
})

export async function getRun(projectId: string, id: string): Promise<Run | null> {
  const snap = await getDoc(doc(runs(projectId), id))
  return snap.exists() ? toRun(snap.id, snap.data()) : null
}

/** shortcut: baca semua test run sekaligus; beri pagination bila run mendekati ribuan test (kuota baca Spark). */
export async function listTests(projectId: string, runId: string): Promise<RunTest[]> {
  const snap = await getDocs(collection(doc(runs(projectId), runId), 'tests'))
  return snap.docs.map((d) => toTest(runId, d.id, d.data()))
}

const toTest = (runId: string, id: string, t: DocumentData): RunTest => ({
  id, number: t.number, runId, caseId: t.caseId, sectionId: t.sectionId, assignee: t.assignee, status: t.status, snapshot: t.snapshot, results: [],
})

/** `n` test dengan hasil terbaru di satu run; `results` hanya berisi hasil terakhir itu (`who` = uid). */
export async function listRecentTests(projectId: string, runId: string, n: number): Promise<RunTest[]> {
  const snap = await getDocs(query(collection(doc(runs(projectId), runId), 'tests'), orderBy('lastResultAt', 'desc'), limit(n)))
  return snap.docs.map((d) => {
    const t = d.data()
    return { ...toTest(runId, d.id, t), results: [{ who: t.lastResultBy, status: t.status, at: iso(t.lastResultAt) ?? '', comment: '', evidence: [] }] }
  })
}

/** Terbaru di depan. `who` = uid pembuat; nama ditampilkan oleh pemanggil. */
export async function listResults(projectId: string, runId: string, testId: string): Promise<Result[]> {
  const snap = await getDocs(collection(doc(runs(projectId), runId, 'tests', testId), 'results'))
  return snap.docs
    .map((d) => {
      const r = d.data()
      return { who: r.createdBy, status: r.status, at: iso(r.createdAt) ?? '', comment: r.comment, evidence: [] } as Result
    })
    .sort((a, b) => b.at.localeCompare(a.at))
}

/** Test plan (PLAN-01): wadah beberapa run dalam satu milestone; status dan progresnya dihitung dari run-nya. */
export async function listPlans(projectId: string): Promise<Plan[]> {
  const snap = await getDocs(plans(projectId))
  return snap.docs.map((d) => ({ id: d.id, name: d.data().name, milestoneId: d.data().milestoneId })).sort((a, b) => a.name.localeCompare(b.name))
}

export async function createPlan(uid: string, projectId: string, input: Omit<Plan, 'id'>): Promise<Plan> {
  const ref = doc(plans(projectId))
  const plan = { name: input.name.trim(), milestoneId: input.milestoneId }
  await setDoc(ref, { ...plan, createdBy: uid, createdAt: serverTimestamp(), updatedBy: uid, updatedAt: serverTimestamp() })
  return { id: ref.id, ...plan }
}

/** milestoneId diisi = run milestone itu; null = run tanpa milestone; undefined = semua run. */
export async function listRuns(projectId: string, milestoneId?: string | null): Promise<Run[]> {
  const snap = await getDocs(milestoneId === undefined ? runs(projectId) : query(runs(projectId), where('milestoneId', '==', milestoneId)))
  return snap.docs
    .map((d) => toRun(d.id, d.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/**
 * Alur architecture.md 11: run Draft -> tests per 500 -> (opsional) Active. Bila browser mati di tengah,
 * run tetap Draft dan bisa dihapus. Hanya case Approved yang masuk (APR-05).
 * shortcut: nomor test per run (bukan global), pindah ke counter bila UI butuh nomor global.
 */
export async function createRun(uid: string, projectId: string, input: RunInput & { cases: TestCase[]; start: boolean }) {
  const ref = doc(runs(projectId))
  const approved = input.cases.filter((c) => c.status === 'active')
  await setDoc(ref, {
    name: input.name.trim(), description: input.description.trim(), milestoneId: input.milestoneId, planId: input.planId, assignee: input.assignee,
    status: 'draft', counts: { ...emptyCounts(), untested: approved.length },
    createdBy: uid, createdAt: serverTimestamp(), updatedBy: uid, updatedAt: serverTimestamp(),
  })
  for (let i = 0; i < approved.length; i += BATCH) {
    const batch = writeBatch(db)
    approved.slice(i, i + BATCH).forEach((c, j) =>
      batch.set(doc(collection(ref, 'tests')), {
        number: i + j + 1, caseId: c.id, sectionId: c.sectionId, sectionOrder: i + j, assignee: input.assignee,
        status: 'untested', snapshot: snapshotOf(c),
      }),
    )
    await batch.commit()
  }
  if (input.start) await startRun(uid, projectId, ref.id)
  return ref.id
}

export const updateRun = (uid: string, projectId: string, id: string, patch: RunPatch) =>
  updateDoc(doc(runs(projectId), id), {
    ...patch,
    ...(patch.name === undefined ? {} : { name: patch.name.trim() }),
    ...(patch.description === undefined ? {} : { description: patch.description.trim() }),
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  })

export const startRun = (uid: string, projectId: string, id: string) =>
  updateDoc(doc(runs(projectId), id), { status: 'active', startedAt: serverTimestamp(), updatedBy: uid, updatedAt: serverTimestamp() })

/** Run dihapus dulu; rules baru mengizinkan hapus tests/results setelah run-nya tidak ada. */
export async function deleteRun(projectId: string, id: string) {
  const ref = doc(runs(projectId), id)
  const tests = await getDocs(collection(ref, 'tests'))
  const results = await Promise.all(tests.docs.map((t) => getDocs(collection(t.ref, 'results'))))
  await deleteDoc(ref)
  const children = [...results.flatMap((r) => r.docs), ...tests.docs]
  for (let i = 0; i < children.length; i += BATCH) {
    const batch = writeBatch(db)
    children.slice(i, i + BATCH).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
}

/**
 * Samakan test satu run dengan perubahan case: `add` (hanya case Active yang belum ada) jadi test Untested,
 * test milik `removeIds` dihapus beserta hasilnya. Counts dan status run dihitung ulang (Done <-> Active, Draft tetap).
 * shortcut: batch test lalu update run tidak atomik; bila putus di tengah, counts bisa selisih sampai edit berikutnya.
 */
async function syncRunTests(uid: string, projectId: string, runId: string, add: TestCase[], removeIds: ReadonlySet<string>) {
  const runRef = doc(runs(projectId), runId)
  const [run, tests] = await Promise.all([getDoc(runRef), getDocs(collection(runRef, 'tests'))])
  if (!run.exists()) return
  const have = new Set(tests.docs.map((d) => d.data().caseId as string))
  const gone = tests.docs.filter((d) => removeIds.has(d.data().caseId))
  const fresh = add.filter((c) => c.status === 'active' && !have.has(c.id))
  if (gone.length === 0 && fresh.length === 0) return

  const counts: Counts = { ...run.data().counts }
  for (const d of gone) counts[d.data().status as keyof Counts]--
  counts.untested += fresh.length
  const results = await Promise.all(gone.map((d) => getDocs(collection(d.ref, 'results'))))
  const first = tests.docs.reduce((n, d) => Math.max(n, d.data().number), 0) + 1

  const writes: ((b: WriteBatch) => void)[] = [
    ...results.flatMap((r) => r.docs).map((d) => (b: WriteBatch) => b.delete(d.ref)),
    ...gone.map((d) => (b: WriteBatch) => b.delete(d.ref)),
    ...fresh.map((c, i) => (b: WriteBatch) =>
      b.set(doc(collection(runRef, 'tests')), {
        number: first + i, caseId: c.id, sectionId: c.sectionId, sectionOrder: first + i - 1, assignee: run.data().assignee,
        status: 'untested', snapshot: snapshotOf(c),
      })),
  ]
  for (let i = 0; i < writes.length; i += BATCH) {
    const batch = writeBatch(db)
    writes.slice(i, i + BATCH).forEach((w) => w(batch))
    await batch.commit()
  }
  const status = deriveRunStatus(run.data().status, counts)
  await updateDoc(runRef, {
    counts, status, updatedBy: uid, updatedAt: serverTimestamp(),
    doneAt: status === 'done' ? (run.data().doneAt ?? serverTimestamp()) : deleteField(),
  })
}

/** Edit run: `chosenIds` = daftar case akhir. Yang belum ada ditambah (dari `cases`), yang tidak dipilih lagi dilepas. */
export async function setRunCases(uid: string, projectId: string, runId: string, cases: TestCase[], chosenIds: ReadonlySet<string>) {
  const tests = await listTests(projectId, runId)
  const gone = new Set(tests.map((t) => t.caseId).filter((id) => !chosenIds.has(id)))
  await syncRunTests(uid, projectId, runId, cases.filter((c) => chosenIds.has(c.id)), gone)
}

/** Case dihapus dari Test Cases: lepas dari semua run project ini. */
export async function removeCasesFromRuns(uid: string, projectId: string, caseIds: string[]) {
  const ids = new Set(caseIds)
  for (const run of await listRuns(projectId)) await syncRunTests(uid, projectId, run.id, [], ids)
}

/**
 * Satu transaksi: hasil baru + status test + counts run. Done otomatis bila tak ada Untested/Retest (RUN-10);
 * Retest pada run Done membuatnya Active lagi.
 * shortcut: evidence belum disimpan (file masuk Storage nanti), hanya status + komentar.
 */
export async function addResult(uid: string, projectId: string, runId: string, testId: string, input: { status: ResultStatus; comment: string }) {
  const runRef = doc(runs(projectId), runId)
  const testRef = doc(runRef, 'tests', testId)
  await runTransaction(db, async (tx) => {
    const [run, test] = await Promise.all([tx.get(runRef), tx.get(testRef)])
    if (!run.exists() || !test.exists() || run.data().status === 'draft') throw new Error('run-not-open')
    const counts: Counts = { ...run.data().counts }
    counts[test.data().status as keyof Counts]--
    counts[input.status]++
    const status = deriveRunStatus(run.data().status, counts)
    tx.set(doc(collection(testRef, 'results')), { status: input.status, comment: input.comment.trim(), createdBy: uid, createdAt: serverTimestamp() })
    tx.update(testRef, { status: input.status, lastResultAt: serverTimestamp(), lastResultBy: uid })
    // shortcut: hari memakai zona waktu browser penulis; pindah ke zona waktu workspace bila tim lintas zona.
    tx.set(doc(db, 'projects', projectId, 'daily', dayKey(new Date())), { [input.status]: increment(1) }, { merge: true })
    tx.update(runRef, {
      counts, status, updatedBy: uid, updatedAt: serverTimestamp(),
      doneAt: status === 'done' ? (run.data().doneAt ?? serverTimestamp()) : deleteField(),
    })
  })
}
