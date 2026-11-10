import { createCases, importSections } from './api'
import type { Section, TestCase } from './domain'

// shortcut: impor sekali data case yang dulu disimpan per browser (zustand persist), hapus file ini bila tidak ada lagi key `casebook.cases.*` di browser tim.
export const legacyKey = (projectId: string) => `casebook.cases.${projectId}`
const running = new Set<string>()

type Stored = Omit<TestCase, 'status' | 'preconditions' | 'steps' | 'expected'> & {
  status: TestCase['status'] | 'approved'
  preconditions: string | string[]
  steps: string | string[]
  expected: string | string[]
}
const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : [])

/** Bentuk lama -> bentuk sekarang (sama dengan migrasi store lama: 'approved' jadi 'active', teks tunggal jadi daftar). */
export const normalize = (c: Stored): TestCase => ({
  ...c,
  status: c.status === 'approved' ? 'active' : c.status,
  preconditions: list(c.preconditions), steps: list(c.steps), expected: list(c.expected),
  refs: c.refs ?? '', estimate: c.estimate ?? '', automation: c.automation ?? 'Manual', history: c.history ?? [],
})

/**
 * Pindahkan section dan case project ini dari localStorage ke Firestore, lalu hapus key lokalnya.
 * Section memakai id lama (diulang = ditimpa); case diberi nomor baru dari `nextCaseNumber` dalam satu transaksi.
 * Bila gagal (mis. rules menolak), key tetap ada dan impor dicoba lagi saat project dibuka. Mengembalikan true bila ada yang diimpor.
 */
export async function importLegacyCases(uid: string, projectId: string): Promise<boolean> {
  let raw: string | null
  try { raw = localStorage.getItem(legacyKey(projectId)) } catch { return false }
  if (!raw || running.has(projectId)) return false
  running.add(projectId)
  try {
    const { sections = [], cases = [] } = (JSON.parse(raw) as { state?: { sections?: Section[]; cases?: Stored[] } }).state ?? {}
    await importSections(projectId, sections)
    const rows = cases.map(normalize)
    if (rows.length) await createCases(uid, projectId, (first) => rows.map((c, i) => ({ ...c, id: `C${first + i}`, number: first + i })))
    localStorage.removeItem(legacyKey(projectId))
    return sections.length + rows.length > 0
  } finally {
    running.delete(projectId)
  }
}
