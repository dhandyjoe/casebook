import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RESULT_STATUSES, SHORTCUT, type ResultStatus, type RunTest } from './domain'

interface Props { test: RunTest; disabledReason?: string; onPick: (status: ResultStatus) => void }

/** Ubah status langsung dari daftar test (RUN-04): dropdown dengan pintasan P/F/B/R. */
export function StatusMenu({ test, disabledReason, onPick }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLSpanElement>(null)
  const label = t(`runs.testStatus.${test.status}`)

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return
      if (e.type === 'mousedown' && root.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [open])

  return (
    <span ref={root} className="relative">
      <button
        type="button" aria-haspopup="true" aria-expanded={open} disabled={!!disabledReason} title={disabledReason}
        aria-label={t('runs.detail.statusAria', { id: `T-${test.number}`, status: label })}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-[30px] w-[124px] cursor-pointer items-center justify-between gap-1.5 rounded-md border px-2 text-xs font-semibold disabled:cursor-default"
        style={{ background: `var(--cb-${test.status}-bg)`, color: `var(--cb-${test.status}-fg)`, borderColor: `var(--cb-${test.status}-border)` }}
      >
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: `var(--cb-${test.status})` }} />{label}</span>
        {!disabledReason && <ChevronDown size={14} aria-hidden="true" />}
      </button>
      {open && (
        <div className="absolute top-9 right-0 z-10 flex w-[168px] flex-col gap-0.5 rounded-lg border border-border bg-surface p-1.5 shadow-pop">
          {RESULT_STATUSES.map((s) => (
            <button
              key={s} type="button" onClick={() => { setOpen(false); onPick(s) }}
              className={`flex h-8 cursor-pointer items-center justify-between rounded-sm border-0 px-2.5 text-left text-ink ${test.status === s ? 'bg-accent-tint-3' : 'bg-transparent'}`}
            >
              <span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: `var(--cb-${s})` }} />{t(`runs.testStatus.${s}`)}</span>
              <kbd className="font-mono text-[11px] text-ink-muted">{SHORTCUT[s]}</kbd>
            </button>
          ))}
        </div>
      )}
    </span>
  )
}
