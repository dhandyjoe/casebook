import { ChevronLeft, ChevronRight, Download, X, ZoomIn } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import type { Evidence } from './domain'
import { Shot } from './EvidenceShot'

interface Props { items: Evidence[]; index: number | null; onIndex: (i: number) => void; onClose: () => void }

const iconBtn = 'flex size-9 cursor-pointer items-center justify-center rounded-md border border-border-strong bg-surface text-ink-secondary disabled:cursor-default disabled:opacity-40'

/** Lihat evidence: zoom (klik gambar), sebelumnya/berikutnya (juga panah keyboard), dan unduh. */
export function Lightbox({ items, index, onIndex, onClose }: Props) {
  const { t } = useTranslation()
  const [zoomed, setZoomed] = useState(false)
  const open = index !== null
  const ev = open ? items[index] : undefined
  const go = (d: number) => { setZoomed(false); onIndex((index! + d + items.length) % items.length) }

  return (
    <Dialog open={open} onClose={onClose} labelledBy="lightbox-title" maxWidth={960}>
      {ev && (
        <div
          className="flex min-h-0 flex-col"
          onKeyDown={(e) => {
            if (items.length > 1 && e.key === 'ArrowRight') go(1)
            if (items.length > 1 && e.key === 'ArrowLeft') go(-1)
          }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <div className="min-w-0">
              <h2 id="lightbox-title" className="m-0 truncate text-base font-bold">{ev.name}</h2>
              <p className="mt-0.5 text-xs text-ink-muted">{t('lightbox.title')} · {t('lightbox.position', { i: index! + 1, n: items.length })}</p>
            </div>
            <div className="flex flex-none gap-1.5">
              {ev.dataUrl && (
                <>
                  <button type="button" aria-pressed={zoomed} aria-label={t('lightbox.zoom')} onClick={() => setZoomed((z) => !z)} className={iconBtn}><ZoomIn size={16} aria-hidden="true" /></button>
                  <a href={ev.dataUrl} download={ev.name} aria-label={t('lightbox.download')} className={`${iconBtn} no-underline`}><Download size={16} aria-hidden="true" /></a>
                </>
              )}
              <button type="button" aria-label={t('lightbox.prev')} disabled={items.length < 2} onClick={() => go(-1)} className={iconBtn}><ChevronLeft size={16} aria-hidden="true" /></button>
              <button type="button" aria-label={t('lightbox.next')} disabled={items.length < 2} onClick={() => go(1)} className={iconBtn}><ChevronRight size={16} aria-hidden="true" /></button>
              <button type="button" aria-label={t('lightbox.close')} autoFocus onClick={onClose} className={iconBtn}><X size={16} aria-hidden="true" /></button>
            </div>
          </div>
          <div className="flex min-h-[320px] flex-1 items-center justify-center overflow-auto bg-[var(--cb-surface-muted)] p-5">
            {ev.dataUrl ? (
              <img src={ev.dataUrl} alt={ev.name} onClick={() => setZoomed((z) => !z)} className={zoomed ? 'max-w-none cursor-zoom-out' : 'max-h-[70vh] max-w-full cursor-zoom-in object-contain'} />
            ) : (
              <div className="flex w-full max-w-[520px] flex-col gap-3">
                <Shot ev={ev} className="h-[260px]" />
                <p className="m-0 text-center text-[13px] text-ink-muted">{t('lightbox.mock')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  )
}
