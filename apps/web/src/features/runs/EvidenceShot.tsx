import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { sizeLabel } from '@/lib/evidence'
import type { Evidence } from './domain'

// Data contoh tidak punya gambar asli: tampilkan cuplikan layar tiruan seperti di canvas.
const MOCK = {
  page: { bg: '#EEF1F5', l1: '#C9CED6', l2: '#D5D9E0', l3: '#9FBAD6' },
  error: { bg: '#EEF1F5', l1: '#C9CED6', l2: '#D5D9E0', l3: '#F2A5A5' },
  console: { bg: '#23262D', l1: '#E57373', l2: '#5A6170', l3: '#5A6170' },
}

export function Shot({ ev, className = 'h-[60px]' }: { ev: Evidence; className?: string }) {
  if (ev.dataUrl) return <img src={ev.dataUrl} alt="" className={`w-full rounded-xs object-cover ${className}`} />
  const m = MOCK[ev.mock ?? 'page']
  return (
    <span aria-hidden="true" className={`box-border flex w-full flex-col gap-1 rounded-xs p-[7px] ${className}`} style={{ background: m.bg }}>
      <span className="h-[5px] w-3/5 rounded-[3px]" style={{ background: m.l1 }} />
      <span className="h-[5px] w-[85%] rounded-[3px]" style={{ background: m.l2 }} />
      <span className="h-3 w-[45%] rounded-[3px]" style={{ background: m.l3 }} />
    </span>
  )
}

/** Thumbnail pada riwayat hasil; klik membuka lightbox. */
export function EvidenceButton({ ev, onOpen }: { ev: Evidence; onOpen: () => void }) {
  const { t } = useTranslation()
  return (
    <button type="button" onClick={onOpen} aria-label={t('runs.detail.openImage', { name: ev.name })} className="flex w-28 cursor-zoom-in flex-col gap-1 rounded-md border border-border bg-surface p-[5px] text-left">
      <Shot ev={ev} />
      <span className="truncate text-[11px] text-ink-muted">{ev.name}</span>
    </button>
  )
}

/** Kartu bukti di form Add result, dengan tombol hapus. */
export function EvidenceCard({ ev, onRemove }: { ev: Evidence; onRemove: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="relative flex w-28 flex-col gap-1 rounded-md border border-border bg-surface p-[5px]">
      <Shot ev={ev} />
      <span className="truncate text-[11px] font-medium">{ev.name}</span>
      <span className="text-[10px] text-ink-subtle">{sizeLabel(ev.size)}</span>
      <button type="button" onClick={onRemove} aria-label={t('runs.detail.remove', { name: ev.name })} className="absolute top-2 right-2 flex size-[22px] cursor-pointer items-center justify-center rounded-full border-0 bg-[rgba(22,24,29,0.72)] p-0 text-white">
        <X size={12} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  )
}
