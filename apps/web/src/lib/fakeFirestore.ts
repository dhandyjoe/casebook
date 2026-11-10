// Pengganti 'firebase/firestore' di unit test lapisan data: dokumen di Map memori, hanya API yang dipakai src/features/*/api.ts.
// Pakai: vi.mock('firebase/firestore', () => import('@/lib/fakeFirestore')). Aturan akses diuji terpisah di rules/firestore.test.ts.
type Data = Record<string, unknown>
type Ref = { type: 'collection' | 'document'; path: string; id: string }
type Filter = { kind: 'where'; field: string | typeof DOC_ID; op: '==' | '>='; value: unknown }
type Order = { kind: 'orderBy'; field: string; dir: 'asc' | 'desc' }
type Limit = { kind: 'limit'; n: number }
type Query = { type: 'query'; col: Ref; constraints: (Filter | Order | Limit)[] }

const DOC_ID = Symbol('documentId')
export const store = new Map<string, Data>()
export const stats = { commits: 0 }
let clock = Date.parse('2026-11-10T08:00:00Z')
let autoId = 0

export function resetFirestore() {
  store.clear()
  stats.commits = 0
  clock = Date.parse('2026-11-10T08:00:00Z')
  autoId = 0
}

/** Isi dokumen langsung tanpa sentinel; `ts(iso)` untuk field Timestamp. */
export const seed = (path: string, data: Data) => void store.set(path, data)
export const ts = (iso: string) => timestamp(Date.parse(iso))
const timestamp = (ms: number) => ({ toDate: () => new Date(ms), toMillis: () => ms })

// Sentinel dari SDK asli; diterjemahkan saat tulis.
export const serverTimestamp = () => ({ __op: 'ts' })
export const increment = (n: number) => ({ __op: 'inc', n })
export const arrayUnion = (...v: unknown[]) => ({ __op: 'union', v })
export const arrayRemove = (...v: unknown[]) => ({ __op: 'remove', v })
export const deleteField = () => ({ __op: 'delete' })
export const documentId = () => DOC_ID

function apply(base: Data, patch: Data): Data {
  const out = { ...base }
  for (const [k, v] of Object.entries(patch)) {
    const op = (v as { __op?: string } | null)?.__op
    if (op === 'delete') delete out[k]
    else if (op === 'ts') out[k] = timestamp((clock += 1000))
    else if (op === 'inc') out[k] = ((out[k] as number) ?? 0) + (v as { n: number }).n
    else if (op === 'union') out[k] = [...new Set([...((out[k] as unknown[]) ?? []), ...(v as { v: unknown[] }).v])]
    else if (op === 'remove') out[k] = ((out[k] as unknown[]) ?? []).filter((x) => !(v as { v: unknown[] }).v.includes(x))
    else out[k] = v
  }
  return out
}

const join = (base: { path?: string }, segs: string[]) => [base.path, ...segs].filter(Boolean).join('/')
const ref = (type: Ref['type'], path: string): Ref => ({ type, path, id: path.split('/').pop()! })

export const collection = (base: { path?: string }, ...segs: string[]) => ref('collection', join(base, segs))
export const doc = (base: { path?: string }, ...segs: string[]) =>
  ref('document', segs.length ? join(base, segs) : `${base.path}/auto${String(++autoId).padStart(4, '0')}`)

export const where = (field: string | typeof DOC_ID, op: Filter['op'], value: unknown): Filter => ({ kind: 'where', field, op, value })
export const orderBy = (field: string, dir: Order['dir'] = 'asc'): Order => ({ kind: 'orderBy', field, dir })
export const limit = (n: number): Limit => ({ kind: 'limit', n })
export const query = (col: Ref, ...constraints: Query['constraints']): Query => ({ type: 'query', col, constraints })

const snap = (r: Ref) => {
  const data = store.get(r.path)
  return { id: r.id, ref: r, exists: () => data !== undefined, data: () => (data ? { ...data } : undefined) }
}
const sortable = (v: unknown) => (v as { toMillis?: () => number })?.toMillis?.() ?? (v as string | number)

export async function getDoc(r: Ref) { return snap(r) }

export async function getDocs(q: Ref | Query) {
  const { col, constraints } = q.type === 'query' ? q : { col: q, constraints: [] }
  let rows = [...store.keys()]
    .filter((p) => p.startsWith(`${col.path}/`) && !p.slice(col.path.length + 1).includes('/'))
    .sort()
    .map((p) => snap(ref('document', p)))
  for (const c of constraints) {
    if (c.kind === 'where') {
      const val = (d: (typeof rows)[number]) => (c.field === DOC_ID ? d.id : d.data()![c.field as string])
      rows = rows.filter((d) => (c.op === '==' ? val(d) === c.value : (val(d) as string) >= (c.value as string)))
    } else if (c.kind === 'orderBy') {
      const sign = c.dir === 'desc' ? -1 : 1
      rows = rows.filter((d) => d.data()![c.field] !== undefined) // seperti Firestore: dokumen tanpa field itu tidak ikut
      rows.sort((a, b) => (sortable(a.data()![c.field]) > sortable(b.data()![c.field]) ? sign : -sign))
    } else rows = rows.slice(0, c.n)
  }
  return { docs: rows, empty: rows.length === 0, size: rows.length }
}

export async function getCountFromServer(col: Ref) {
  const count = (await getDocs(col)).size
  return { data: () => ({ count }) }
}

const write = {
  set: (r: Ref, data: Data, opts?: { merge?: boolean }) => store.set(r.path, apply(opts?.merge ? (store.get(r.path) ?? {}) : {}, data)),
  update: (r: Ref, data: Data) => {
    const cur = store.get(r.path)
    if (!cur) throw Object.assign(new Error(`No document to update: ${r.path}`), { code: 'not-found' })
    store.set(r.path, apply(cur, data))
  },
  delete: (r: Ref) => store.delete(r.path),
}

export const setDoc = async (r: Ref, data: Data, opts?: { merge?: boolean }) => void write.set(r, data, opts)
export const updateDoc = async (r: Ref, data: Data) => write.update(r, data)
export const deleteDoc = async (r: Ref) => void write.delete(r)
export async function addDoc(col: Ref, data: Data) {
  const r = doc(col)
  write.set(r, data)
  return r
}

/** Tulisan ditahan sampai commit, jadi batch/transaksi yang gagal tidak meninggalkan sisa. */
function deferred() {
  const ops: (() => void)[] = []
  return {
    ops,
    set(r: Ref, data: Data, opts?: { merge?: boolean }) { ops.push(() => write.set(r, data, opts)); return this },
    update(r: Ref, data: Data) { ops.push(() => write.update(r, data)); return this },
    delete(r: Ref) { ops.push(() => write.delete(r)); return this },
  }
}

export function writeBatch(_db: unknown) {
  const b = deferred()
  return {
    ...b,
    commit: async () => {
      if (b.ops.length > 500) throw new Error('batch over 500 writes')
      stats.commits++
      b.ops.forEach((op) => op())
    },
  }
}

export async function runTransaction<T>(_db: unknown, fn: (tx: ReturnType<typeof deferred> & { get: typeof getDoc }) => Promise<T>) {
  const tx = { ...deferred(), get: getDoc }
  const out = await fn(tx)
  tx.ops.forEach((op) => op())
  return out
}

export type DocumentData = Data
export type Timestamp = ReturnType<typeof timestamp>
export type WriteBatch = ReturnType<typeof writeBatch>
