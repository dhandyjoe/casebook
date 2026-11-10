// Workspace statis (PRD 3): dipilih saat Register dan menjadi batas data. Daftar ini harus sama dengan firebase/firestore.rules.
export const WORKSPACES = [
  { id: 'alpha-qa', name: 'Alpha QA' },
  { id: 'beta-squad', name: 'Beta Squad' },
  { id: 'gamma-labs', name: 'Gamma Labs' },
] as const

export const workspaceName = (id: string) => WORKSPACES.find((w) => w.id === id)?.name ?? ''
