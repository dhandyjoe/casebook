import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from '@/features/auth/session'
import { createCases, createSection, deleteCases, deleteSections, listCases, listSections, saveCases } from './api'
import {
  approve, canReview, editCase, newCase, sectionWithDescendants, submitForReview,
  type CaseEdit, type Person, type Section, type TestCase,
} from './domain'
import { importLegacyCases } from './legacy'
import { useCasesStore } from './store'

const NO_CASES: TestCase[] = []
const NO_SECTIONS: Section[] = []

/** Kunci di bawah ['cases', projectId]; mutasi di bawah menyegarkan semuanya sekaligus. */
const key = (projectId: string) => ['cases', projectId]

/** Project contoh `store` memakai store lokal (seed canvas); project lain membaca Firestore. */
export function useCaseData(projectId: string) {
  const local = useCasesStore()
  const mock = projectId === 'store'
  const uid = useAuth((s) => s.session?.uid)
  const client = useQueryClient()
  useEffect(() => {
    if (mock || !uid) return
    importLegacyCases(uid, projectId).then(
      (imported) => { if (imported) void client.invalidateQueries({ queryKey: key(projectId) }) },
      (e) => console.error('legacy case import failed', e),
    )
  }, [mock, uid, projectId, client])
  const sections = useQuery({ queryKey: [...key(projectId), 'sections'], queryFn: () => listSections(projectId), enabled: !mock })
  const cases = useQuery({ queryKey: [...key(projectId), 'list'], queryFn: () => listCases(projectId), enabled: !mock })
  if (mock) return { sections: local.sections, cases: local.cases, isPending: false, isError: false, refetch: () => undefined }
  return {
    sections: sections.data ?? NO_SECTIONS, cases: cases.data ?? NO_CASES,
    isPending: sections.isPending || cases.isPending, isError: sections.isError || cases.isError,
    refetch: () => { void sections.refetch(); void cases.refetch() },
  }
}

/** Aksi yang sama dengan store lokal, tetapi async dan tertulis ke Firestore. `failed` menyala bila tulis terakhir gagal. */
export function useCaseActions(projectId: string) {
  const uid = useAuth((s) => s.session!.uid)
  const client = useQueryClient()
  const local = useCasesStore()
  const { cases, sections } = useCaseData(projectId)
  const op = useMutation({
    mutationFn: (job: () => Promise<unknown>) => job(),
    onSuccess: () => client.invalidateQueries({ queryKey: key(projectId) }),
  })
  const run = <T,>(job: () => Promise<T>) => op.mutateAsync(job).then((r) => r as T, () => undefined)
  const pick = (ids: string[]) => cases.filter((c) => ids.includes(c.id))
  const save = (list: TestCase[]) => run(() => saveCases(projectId, list))

  if (projectId === 'store') {
    return {
      failed: false,
      addCase: async (input: CaseEdit & { status: 'draft' | 'under_review' }, who: string) => local.addCase(input, who),
      updateCase: async (id: string, edit: CaseEdit, who: string) => local.updateCase(id, edit, who),
      submit: async (ids: string[], who: string, reviewer: Person) => local.submit(ids, who, reviewer),
      approveCases: async (ids: string[], who: Person) => local.approveCases(ids, who),
      moveCases: async (ids: string[], sectionId: string) => local.moveCases(ids, sectionId),
      copyCases: async (ids: string[], sectionId: string, who: string) => local.copyCases(ids, sectionId, who),
      deleteCases: async (ids: string[]) => local.deleteCases(ids),
      addSection: async (name: string, parentId: string | null) => local.addSection(name, parentId),
      deleteSection: async (id: string) => local.deleteSection(id),
    }
  }

  return {
    failed: op.isError,
    addCase: async (input: CaseEdit & { status: 'draft' | 'under_review' }, who: string) =>
      (await run(() => createCases(uid, projectId, (n) => [newCase({ ...input, number: n }, who, new Date())])))?.[0],
    updateCase: (id: string, edit: CaseEdit, who: string) => save(pick([id]).map((c) => editCase(c, edit, who, new Date()))),
    submit: (ids: string[], who: string, reviewer: Person) => save(pick(ids).filter((c) => c.status === 'draft').map((c) => submitForReview(c, who, new Date(), reviewer))),
    approveCases: (ids: string[], who: Person) => save(pick(ids).filter((c) => canReview(c, who.uid)).map((c) => approve(c, who.name, new Date()))),
    moveCases: (ids: string[], sectionId: string) => save(pick(ids).map((c) => ({ ...c, sectionId }))),
    copyCases: (ids: string[], sectionId: string, who: string) => {
      const source = pick(ids)
      return run(() => createCases(uid, projectId, (n) => {
        const now = new Date()
        return source.map((c, i) => ({
          ...newCase({ ...c, sectionId, number: n + i, status: 'draft' }, who, now),
          estimate: c.estimate, automation: c.automation,
        }))
      }))
    },
    deleteCases: (ids: string[]) => run(() => deleteCases(projectId, ids)),
    addSection: (name: string, parentId: string | null) => run(() => createSection(projectId, name, parentId)),
    deleteSection: (id: string) => {
      const gone = sectionWithDescendants(sections, id)
      return run(() => deleteSections(projectId, [...gone], cases.filter((c) => gone.has(c.sectionId)).map((c) => c.id)))
    },
  }
}
