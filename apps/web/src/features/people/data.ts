// Anggota tim contoh (nanti dari dokumen member Firestore). Warna avatar dari design.md 2.8.
export const PEOPLE = {
  RS: { key: 'RS', name: 'Rina Saputra', short: 'Rina S.', bg: '#D6E4F2', fg: '#1F4F82' },
  BS: { key: 'BS', name: 'Budi Santoso', short: 'Budi S.', bg: '#E3F5EA', fg: '#146C38' },
  SW: { key: 'SW', name: 'Sari Wulandari', short: 'Sari W.', bg: '#FCE9DA', fg: '#8A4510' },
  DP: { key: 'DP', name: 'Dimas Pratama', short: 'Dimas P.', bg: '#EDE7FB', fg: '#4F2DA8' },
} as const

export type PersonKey = keyof typeof PEOPLE
export const PERSON_KEYS = Object.keys(PEOPLE) as PersonKey[]
export const personOf = (key: string) => PEOPLE[key as PersonKey] ?? { key, name: key, short: key, bg: '#ECEEF2', fg: '#3A3F4A' }
