import { create } from 'zustand'
import {
  approve, canReview, editCase, newCase, returnToDraft, sectionWithDescendants, submitForReview,
  type CaseEdit, type Person, type Section, type TestCase,
} from './domain'
import { buildSeed } from './seed'

interface CasesState {
  sections: Section[]
  cases: TestCase[]
  nextNumber: number
  addCase: (input: CaseEdit & { status: 'draft' | 'under_review' }, who: string) => TestCase
  updateCase: (id: string, edit: CaseEdit, who: string) => void
  submit: (id: string, who: string, reviewer: Person) => void
  approveCases: (ids: string[], who: Person) => void
  returnCase: (id: string, note: string, who: Person) => void
  moveCases: (ids: string[], sectionId: string) => void
  /** Salinan selalu berstatus Draft dengan ID baru. */
  copyCases: (ids: string[], sectionId: string, who: string) => void
  deleteCases: (ids: string[]) => void
  addSection: (name: string, parentId: string | null) => Section
  /** Menghapus section beserta seluruh sub-section dan case di dalamnya. */
  deleteSection: (id: string) => void
}

const map = (cases: TestCase[], ids: string[], fn: (c: TestCase) => TestCase) =>
  cases.map((c) => (ids.includes(c.id) ? fn(c) : c))

// Data contoh project `store` (canvas), hanya di memori; project asli memakai features/cases/api.ts (Firestore).
export const useCasesStore = create<CasesState>()(
  (set, get) => ({
    ...buildSeed(new Date()),
    addCase: (input, who) => {
      const created = newCase({ ...input, number: get().nextNumber }, who, new Date())
      set((s) => ({ cases: [...s.cases, created], nextNumber: s.nextNumber + 1 }))
      return created
    },
    updateCase: (id, edit, who) => set((s) => ({ cases: map(s.cases, [id], (c) => editCase(c, edit, who, new Date())) })),
    submit: (id, who, reviewer) => set((s) => ({ cases: map(s.cases, [id], (c) => submitForReview(c, who, new Date(), reviewer)) })),
    approveCases: (ids, who) => set((s) => ({ cases: map(s.cases, ids, (c) => (canReview(c, who.uid) ? approve(c, who.name, new Date()) : c)) })),
    returnCase: (id, note, who) => set((s) => ({ cases: map(s.cases, [id], (c) => (canReview(c, who.uid) ? returnToDraft(c, who.name, note, new Date()) : c)) })),
    moveCases: (ids, sectionId) => set((s) => ({ cases: map(s.cases, ids, (c) => ({ ...c, sectionId })) })),
    copyCases: (ids, sectionId, who) => set((s) => {
      const now = new Date()
      const copies = s.cases.filter((c) => ids.includes(c.id)).map((c, i) => ({
        ...newCase({ ...c, sectionId, number: s.nextNumber + i, status: 'draft' }, who, now),
        estimate: c.estimate, automation: c.automation,
      }))
      return { cases: [...s.cases, ...copies], nextNumber: s.nextNumber + copies.length }
    }),
    deleteCases: (ids) => set((s) => ({ cases: s.cases.filter((c) => !ids.includes(c.id)) })),
    addSection: (name, parentId) => {
      const section: Section = { id: `s${Date.now().toString(36)}`, parentId, name: name.trim() }
      set((s) => ({ sections: [...s.sections, section] }))
      return section
    },
    deleteSection: (id) => set((s) => {
      const gone = sectionWithDescendants(s.sections, id)
      return { sections: s.sections.filter((x) => !gone.has(x.id)), cases: s.cases.filter((c) => !gone.has(c.sectionId)) }
    }),
  }),
)

export function resetCasesStore() {
  useCasesStore.setState(buildSeed(new Date()))
}
