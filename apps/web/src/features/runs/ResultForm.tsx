import { ImagePlus } from 'lucide-react'
import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { MAX_IMAGES, compressImage, validateImages } from '@/lib/evidence'
import { RESULT_STATUSES, SHORTCUT, type Evidence, type ResultInput, type ResultStatus } from './domain'
import { EvidenceCard } from './EvidenceShot'

interface Props {
  blocked: 'draft' | null
  onSave: (input: ResultInput, andNext: boolean) => void
}

const typing = (el: EventTarget | null) => {
  const n = el as HTMLElement | null
  return !!n && (/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName) || n.isContentEditable)
}

/** Form Add result: status (P/F/B/R), satu kolom Comment & evidence (teks + gambar lewat upload, paste, atau drag & drop). */
export function ResultForm({ blocked, onSave }: Props) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<ResultStatus | null>(null)
  const [comment, setComment] = useState('')
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [problems, setProblems] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const picker = useRef<HTMLInputElement>(null)
  const canSave = !blocked && !!status && !busy

  function save(andNext: boolean) {
    if (!canSave || !status) return
    onSave({ status, comment, evidence }, andNext)
    setStatus(null); setComment(''); setEvidence([]); setProblems([])
  }

  async function addFiles(files: File[]) {
    if (blocked || files.length === 0) return
    const { accepted, issues } = validateImages(files, evidence.length)
    const messages = issues.map((i) => t(i.kind === 'type' ? 'runs.detail.errType' : i.kind === 'size' ? 'runs.detail.errSize' : 'runs.detail.errLimit', { name: i.name }))
    setBusy(true)
    const added: Evidence[] = []
    for (const file of accepted) {
      try { added.push(await compressImage(file)) } catch { messages.push(t('runs.detail.errFailed', { name: file.name })) }
    }
    setEvidence((prev) => [...prev, ...added].slice(0, MAX_IMAGES))
    setProblems(messages)
    setBusy(false)
  }

  // Pintasan keyboard: P/F/B/R memilih status, Ctrl/Cmd+Enter menyimpan; tidak aktif saat mengetik di kolom teks.
  const latest = useRef(save)
  latest.current = save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); latest.current(true); return }
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || blocked) return
      const hit = RESULT_STATUSES.find((s) => SHORTCUT[s].toLowerCase() === e.key.toLowerCase())
      if (hit) setStatus(hit)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [blocked])

  const onPaste = (e: ClipboardEvent) => {
    const images = [...e.clipboardData.files].filter((f) => f.type.startsWith('image/'))
    if (images.length) { e.preventDefault(); void addFiles(images) }
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); void addFiles([...e.dataTransfer.files]) }

  const hint = blocked ? t('runs.detail.blockedDraft') : busy ? t('runs.detail.compressing') : status ? t('runs.detail.hintReady') : t('runs.detail.hintNeedStatus')

  return (
    <div className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface-subtle p-4">
      <h3 className="m-0 text-[15px] font-semibold">{t('runs.detail.addResult')}</h3>
      <div role="group" aria-label={t('runs.detail.resultStatus')} className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2">
        {RESULT_STATUSES.map((s) => {
          const on = status === s
          return (
            <button
              key={s} type="button" aria-pressed={on} disabled={!!blocked} onClick={() => setStatus(s)}
              className="flex h-11 cursor-pointer items-center justify-between gap-1.5 rounded-lg px-2.5 font-semibold disabled:cursor-default disabled:opacity-60"
              style={{
                background: on ? `var(--cb-${s}-bg)` : 'var(--cb-surface)', color: on ? `var(--cb-${s}-fg)` : 'var(--cb-text)',
                border: on ? `2px solid ${s === 'retest' ? 'var(--cb-retest-line)' : `var(--cb-${s})`}` : '1px solid var(--cb-border-strong)',
              }}
            >
              <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: `var(--cb-${s})` }} />{t(`runs.testStatus.${s}`)}</span>
              <kbd className="rounded-xs border border-border-strong bg-surface px-[5px] py-px font-mono text-[11px] text-ink-muted">{SHORTCUT[s]}</kbd>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="font-medium">{t('runs.detail.comment')}</label>
        <div className="flex flex-col overflow-hidden rounded-lg border border-border-input bg-surface" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          <textarea
            id="note" rows={3} value={comment} disabled={!!blocked}
            onChange={(e) => setComment(e.target.value)} onPaste={onPaste} placeholder={t('runs.detail.commentPlaceholder')}
            className="min-h-[84px] resize-y border-0 bg-transparent px-3.5 py-3 text-ink outline-none"
          />
          {evidence.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3.5 pb-3">
              {evidence.map((ev, i) => <EvidenceCard key={`${ev.name}-${i}`} ev={ev} onRemove={() => setEvidence((prev) => prev.filter((_, j) => j !== i))} />)}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle bg-surface-subtle px-2.5 py-2">
            <input
              ref={picker} type="file" multiple hidden accept="image/png,image/jpeg,image/gif,image/webp" aria-label={t('runs.detail.attach')}
              onChange={(e) => { void addFiles([...(e.target.files ?? [])]); e.target.value = '' }}
            />
            <button type="button" disabled={!!blocked || busy || evidence.length >= MAX_IMAGES} onClick={() => picker.current?.click()} className="flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-border-strong bg-surface px-2.5 font-medium text-ink-secondary disabled:cursor-default disabled:opacity-50">
              <ImagePlus size={16} aria-hidden="true" />{t('runs.detail.attach')}
            </button>
            <span className="text-xs text-ink-subtle">{t('runs.detail.evCount', { count: evidence.length })}</span>
          </div>
        </div>
        {problems.length > 0 && (
          <ul role="alert" className="m-0 flex list-none flex-col gap-0.5 p-0 text-[13px] text-danger-text">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!canSave} onClick={() => save(true)} className="flex h-11 flex-[1_1_200px] cursor-pointer items-center justify-center gap-2 rounded-md border-0 bg-accent font-semibold text-white disabled:cursor-default disabled:bg-accent-disabled">
          {t('runs.detail.saveNext')}<kbd className="rounded-xs bg-white/20 px-1.5 py-px font-mono text-[11px]">Ctrl+Enter</kbd>
        </button>
        <button type="button" disabled={!canSave} onClick={() => save(false)} className="h-11 cursor-pointer rounded-md border border-border-strong bg-surface px-4 font-semibold text-ink disabled:cursor-default disabled:text-[var(--cb-text-disabled)]">
          {t('runs.detail.save')}
        </button>
      </div>
      <span className="text-xs text-ink-subtle">{hint}</span>
    </div>
  )
}
