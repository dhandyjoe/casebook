import type { Evidence } from '@/features/runs/domain'

// Evidence gambar (PRD 5.5.1): validasi, lalu kompres di browser ke WebP sebelum disimpan.
// Saat backend tersambung, hanya modul ini yang berubah: hasil kompresi diunggah ke Cloudinary
// (signed upload) dan `dataUrl` diganti `publicId`.

export const MAX_IMAGES = 10
export const MAX_BYTES = 10 * 1024 * 1024
export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const TARGET_BYTES = 400 * 1024
const MAX_WIDTH = 1920

export type EvidenceIssue = { kind: 'type' | 'size' | 'limit'; name: string }

/** Pisahkan file yang boleh diproses dari yang ditolak beserta alasannya. */
export function validateImages(files: File[], alreadyAttached: number): { accepted: File[]; issues: EvidenceIssue[] } {
  const accepted: File[] = []
  const issues: EvidenceIssue[] = []
  for (const file of files) {
    if (!ACCEPTED_TYPES.includes(file.type)) issues.push({ kind: 'type', name: file.name })
    else if (file.size > MAX_BYTES) issues.push({ kind: 'size', name: file.name })
    else if (alreadyAttached + accepted.length >= MAX_IMAGES) issues.push({ kind: 'limit', name: file.name })
    else accepted.push(file)
  }
  return { accepted, issues }
}

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

const toBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))

/** Skala ke lebar maks. 1920 px, lalu WebP dengan kualitas diturunkan sampai ≤ 400 KB. */
export async function compressImage(file: File): Promise<Evidence> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_WIDTH / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  let blob: Blob | null = null
  for (const quality of [0.85, 0.75, 0.65, 0.5, 0.4]) {
    blob = await toBlob(canvas, quality)
    if (blob && blob.size <= TARGET_BYTES) break
  }
  if (!blob) throw new Error('compress failed')
  return { name: `${file.name.replace(/\.[^.]+$/, '') || 'screenshot'}.webp`, size: blob.size, dataUrl: await readAsDataUrl(blob) }
}

export const sizeLabel = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)
