import '@testing-library/jest-dom/vitest'

// jsdom belum mengimplementasikan <dialog>.showModal()
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute('open')
  this.dispatchEvent(new Event('close'))
}

// ProseMirror (Tiptap) mengukur teks lewat Range.getClientRects, yang belum ada di jsdom
const emptyRect = { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => ({}) } as DOMRect
Range.prototype.getBoundingClientRect ??= () => emptyRect
Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as unknown as DOMRectList
document.elementFromPoint ??= () => null

// Firebase tidak diinisialisasi di jsdom; test yang butuh auth me-mock '@/features/auth/api'.
vi.mock('@/lib/firebase', () => ({ auth: {}, db: {} }))
vi.mock('@/features/projects/api', async (orig) => ({
  ...(await orig<typeof import('@/features/projects/api')>()),
  ...(await import('@/features/projects/testing')).fakeApi,
}))
vi.mock('@/features/milestones/api', async (orig) => ({
  ...(await orig<typeof import('@/features/milestones/api')>()),
  ...(await import('@/features/milestones/testing')).fakeApi,
}))
vi.mock('@/features/runs/api', async (orig) => ({
  ...(await orig<typeof import('@/features/runs/api')>()),
  ...(await import('@/features/runs/testing')).fakeApi,
}))
vi.mock('@/features/cases/api', async (orig) => ({
  ...(await orig<typeof import('@/features/cases/api')>()),
  ...(await import('@/features/cases/testing')).fakeApi,
}))
vi.mock('@/features/overview/api', async () => (await import('@/features/overview/testing')).fakeApi)
vi.mock('@/lib/api', () => ({
  apiGet: async () => [{ uid: 'u1', name: 'Rina Saputra' }, { uid: 'u2', name: 'Budi Santoso' }],
}))
