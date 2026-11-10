import type { Section, TestCase } from './domain'

// Pengganti features/cases/api di test: data di memori per project.
let sectionsOf: Record<string, Section[]> = {}
let casesOf: Record<string, TestCase[]> = {}
let next: Record<string, number> = {}

export const resetFakeCases = () => { sectionsOf = {}; casesOf = {}; next = {} }

/** Isi project Firestore palsu dengan section dan case untuk satu test. */
export function seedFakeCases(projectId: string, data: { sections?: Section[]; cases?: TestCase[] }) {
  sectionsOf[projectId] = data.sections ?? []
  casesOf[projectId] = data.cases ?? []
}

export const fakeCases = (projectId: string) => casesOf[projectId] ?? []

const stamp = (c: TestCase) => ({ ...c, updatedAt: new Date().toISOString() })

export const fakeApi = {
  listSections: async (projectId: string) => [...(sectionsOf[projectId] ?? [])],
  listCases: async (projectId: string) => [...(casesOf[projectId] ?? [])].sort((a, b) => a.number - b.number),
  countCases: async (projectId: string) => (casesOf[projectId] ?? []).length,
  listUnderReview: async (projectId: string) => (casesOf[projectId] ?? []).filter((c) => c.status === 'under_review'),
  listRecentCases: async (projectId: string, n: number) =>
    [...(casesOf[projectId] ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, n),
  createCases: async (_uid: string, projectId: string, build: (firstNumber: number) => TestCase[]) => {
    const made = build(next[projectId] ?? Math.max(1000, ...(casesOf[projectId] ?? []).map((c) => c.number)) + 1)
    ;(casesOf[projectId] ??= []).push(...made)
    next[projectId] = Math.max(...made.map((c) => c.number)) + 1
    return made
  },
  saveCases: async (projectId: string, list: TestCase[]) => {
    casesOf[projectId] = (casesOf[projectId] ?? []).map((c) => { const u = list.find((x) => x.id === c.id); return u ? stamp(u) : c })
  },
  deleteCases: async (projectId: string, ids: string[]) => { casesOf[projectId] = (casesOf[projectId] ?? []).filter((c) => !ids.includes(c.id)) },
  createSection: async (projectId: string, name: string, parentId: string | null) => {
    const section = { id: `s${Date.now().toString(36)}${(sectionsOf[projectId] ?? []).length}`, parentId, name: name.trim() }
    ;(sectionsOf[projectId] ??= []).push(section)
    return section
  },
  deleteSections: async (projectId: string, sectionIds: string[], caseIds: string[]) => {
    sectionsOf[projectId] = (sectionsOf[projectId] ?? []).filter((s) => !sectionIds.includes(s.id))
    casesOf[projectId] = (casesOf[projectId] ?? []).filter((c) => !caseIds.includes(c.id))
  },
}
