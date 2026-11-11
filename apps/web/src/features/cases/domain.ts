// Aturan bisnis case (PRD 4.1, 5.4.1). Fungsi murni: nanti dipindah ke packages/shared
// dan disalin sebagai Firestore Security Rules di fase backend.

export type CaseStatus = 'draft' | 'under_review' | 'active'
export type Priority = 'High' | 'Medium' | 'Low'
export type CaseType = 'Functional' | 'Regression' | 'UI' | 'Smoke'
export type HistoryAction = 'created' | 'submitted' | 'approved' | 'returned' | 'edited' | 'edited_review'

export const STATUSES: CaseStatus[] = ['draft', 'under_review', 'active']
export const PRIORITIES: Priority[] = ['High', 'Medium', 'Low']
export const CASE_TYPES: CaseType[] = ['Functional', 'Regression', 'UI', 'Smoke']

export interface Person {
  uid: string
  name: string
}

export interface HistoryEntry {
  who: string
  action: HistoryAction
  note?: string
  at: string
}

export interface TestCase {
  id: string
  number: number
  sectionId: string
  title: string
  status: CaseStatus
  priority: Priority
  type: CaseType
  refs: string
  estimate: string
  automation: 'Manual' | 'Automated'
  preconditions: string[]
  steps: string[]
  expected: string[]
  author: string
  /** dipilih saat Send for review; kosong pada data lama */
  reviewer?: Person
  createdAt: string
  updatedAt: string
  /** terbaru di depan */
  history: HistoryEntry[]
}

export interface Section {
  id: string
  parentId: string | null
  name: string
}

export type CaseEdit = Pick<TestCase, 'title' | 'sectionId' | 'type' | 'priority' | 'refs' | 'preconditions' | 'steps' | 'expected'>

const entry = (who: string, action: HistoryAction, now: Date, note?: string): HistoryEntry =>
  note ? { who, action, note, at: now.toISOString() } : { who, action, at: now.toISOString() }

const touch = (c: TestCase, patch: Partial<TestCase>, e: HistoryEntry): TestCase => ({
  ...c,
  ...patch,
  updatedAt: e.at,
  history: [e, ...c.history],
})

export function newCase(
  input: CaseEdit & { number: number; status: 'draft' | 'under_review'; reviewer?: Person },
  who: string,
  now: Date,
): TestCase {
  const { number, status, reviewer, ...fields } = input
  const created = entry(who, 'created', now)
  const base: TestCase = {
    ...fields,
    id: `C${number}`,
    number,
    status: 'draft',
    estimate: '',
    automation: 'Manual',
    author: who,
    createdAt: created.at,
    updatedAt: created.at,
    history: [created],
  }
  return status === 'under_review' ? submitForReview(base, who, now, reviewer) : base
}

export function submitForReview(c: TestCase, who: string, now: Date, reviewer?: Person): TestCase {
  return c.status === 'draft' ? touch(c, { status: 'under_review', reviewer }, entry(who, 'submitted', now)) : c
}

/** Hanya reviewer yang dipilih yang boleh Approve/Return; case lama tanpa reviewer terbuka untuk semua. */
export const canReview = (c: TestCase, uid: string) => c.status === 'under_review' && (!c.reviewer || c.reviewer.uid === uid)

export function approve(c: TestCase, who: string, now: Date): TestCase {
  return c.status === 'under_review' ? touch(c, { status: 'active' }, entry(who, 'approved', now)) : c
}

/** Edit tidak mengubah status: case Active tetap Active. */
export function editCase(c: TestCase, edit: CaseEdit, who: string, now: Date): TestCase {
  const changed = (Object.keys(edit) as (keyof CaseEdit)[]).some((k) => JSON.stringify(edit[k]) !== JSON.stringify(c[k]))
  return changed ? touch(c, edit, entry(who, 'edited', now)) : c
}

/** Catatan reviewer yang masih berlaku untuk case Draft: ada 'returned' tanpa 'submitted' sesudahnya. */
export function pendingReturn(c: TestCase): HistoryEntry | undefined {
  if (c.status !== 'draft') return undefined
  for (const h of c.history) {
    if (h.action === 'submitted') return undefined
    if (h.action === 'returned') return h
  }
  return undefined
}

export function sectionPath(sections: Section[], id: string): string {
  const parts: string[] = []
  let current = sections.find((s) => s.id === id)
  while (current) {
    parts.unshift(current.name)
    const parentId: string | null = current.parentId
    current = parentId ? sections.find((s) => s.id === parentId) : undefined
  }
  return parts.join(' › ')
}

/** Section itu sendiri + semua keturunannya. */
export function sectionWithDescendants(sections: Section[], id: string): Set<string> {
  const ids = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const s of sections) {
      if (s.parentId && ids.has(s.parentId) && !ids.has(s.id)) {
        ids.add(s.id)
        grew = true
      }
    }
  }
  return ids
}

export interface CaseGroup<T extends { sectionId: string } = TestCase> { section: Section; depth: number; cases: T[] }

/**
 * Case per section dalam urutan pohon: section terpilih dulu, lalu sub-section-nya (depth bertambah).
 * Di "all", section tanpa case sendiri dan tanpa keturunan ber-case dilewati; di section terpilih semua
 * keturunannya tampil (kosong pun), supaya tiap section punya baris quick add.
 */
export function caseGroups<T extends { sectionId: string }>(sections: Section[], cases: T[], rootId: string): CaseGroup<T>[] {
  const out: CaseGroup<T>[] = []
  const walk = (s: Section, depth: number) => {
    const at = out.length
    const own = cases.filter((c) => c.sectionId === s.id)
    out.push({ section: s, depth, cases: own })
    for (const kid of sections.filter((x) => x.parentId === s.id)) walk(kid, depth + 1)
    if (out.length === at + 1 && !own.length && rootId === 'all') out.pop()
  }
  for (const s of sections.filter((x) => (rootId === 'all' ? x.parentId === null : x.id === rootId))) walk(s, 0)
  return out
}

export function ancestorIds(sections: Section[], id: string): string[] {
  const out: string[] = []
  let parentId = sections.find((s) => s.id === id)?.parentId ?? null
  while (parentId) {
    out.push(parentId)
    parentId = sections.find((s) => s.id === parentId)?.parentId ?? null
  }
  return out
}
