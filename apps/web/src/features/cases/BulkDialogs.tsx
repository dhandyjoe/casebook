import { Check, ChevronRight, Folder, FolderOpen, Search, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { sectionPath, type Person, type Section } from './domain'
import { CARET, INDENT, PAD, folderIcon, rowBase, rowState } from './SectionTree'

function Header({ id, title, onClose }: { id: string; title: string; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-[22px] py-[18px]">
      <h2 id={id} className="m-0 text-lg font-bold">{title}</h2>
      <button type="button" onClick={onClose} aria-label={t('cases.dialog.close')} className="flex size-9 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-secondary">
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  )
}

const footer = 'flex flex-wrap justify-end gap-2 border-t border-border bg-surface-subtle px-[22px] py-3.5'
const btn = 'h-10 cursor-pointer rounded-md px-3.5 font-semibold'

export function MoveDialog({ mode = 'move', open, count, sections, onClose, onMove }: { mode?: 'move' | 'copy'; open: boolean; count: number; sections: Section[]; onClose: () => void; onMove: (sectionId: string) => void }) {
  const { t } = useTranslation()
  const [target, setTarget] = useState(() => sections.find((s) => s.parentId === null)?.id ?? '')
  const [q, setQ] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setCollapsed((prev) => { const next = new Set(prev); if (!next.delete(id)) next.add(id); return next })

  // Urutan pohon seperti panel Section. Saat mencari: tampilkan section yang cocok beserta induknya, semua terbuka.
  const term = q.trim().toLowerCase()
  const kids = (parentId: string | null) => sections.filter((s) => s.parentId === parentId)
  const hasMatch = (s: Section): boolean => s.name.toLowerCase().includes(term) || kids(s.id).some(hasMatch)
  const rows: { s: Section; depth: number; parent: boolean; open: boolean }[] = []
  const walk = (parentId: string | null, depth: number) => kids(parentId).forEach((s) => {
    if (term && !hasMatch(s)) return
    const parent = kids(s.id).length > 0
    const open = !!term || !collapsed.has(s.id)
    rows.push({ s, depth, parent, open })
    if (open) walk(s.id, depth + 1)
  })
  walk(null, 0)
  const label = t('cases.count', { count })
  return (
    <Dialog open={open} onClose={onClose} labelledBy="move-dlg-title" maxWidth={440}>
      <Header id="move-dlg-title" title={t(`cases.${mode}.title`)} onClose={onClose} />
      <div className="flex flex-col gap-3 px-[22px] py-5">
        <p className="m-0 text-ink-secondary">{t(`cases.${mode}.body`, { count: label })}</p>
        <span id="move-target" className="font-medium">{t(`cases.${mode}.destination`)}</span>
        <label className="box-border flex h-9 items-center gap-2 rounded-md border border-border-input bg-surface px-2.5 text-ink-subtle">
          <Search size={16} aria-hidden="true" />
          <input
            type="search" value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('cases.tree.searchLabel')}
            placeholder={t('cases.tree.searchPlaceholder')} className="min-w-0 flex-1 border-0 bg-transparent text-ink outline-none"
          />
        </label>
        <div role="radiogroup" aria-labelledby="move-target" className="flex h-[260px] flex-col overflow-y-auto rounded-md border border-border bg-surface p-1">
          {rows.length === 0 && <p className="m-0 px-2 py-3 text-ink-muted">{t('cases.tree.noMatch', { query: q.trim() })}</p>}
          {rows.map(({ s, depth, parent, open }) => {
            const on = s.id === target
            return (
              <div key={s.id} className={`${rowBase} ${rowState(on)} flex-none`} style={{ paddingLeft: PAD + depth * INDENT }}>
                {Array.from({ length: depth }, (_, i) => (
                  <span key={i} aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0 border-l border-dotted border-[var(--cb-sidebar-guide)]" style={{ left: PAD + i * INDENT + CARET / 2 }} />
                ))}
                {parent && !term ? (
                  <button
                    type="button" aria-expanded={open} onClick={() => toggle(s.id)}
                    aria-label={t(open ? 'cases.tree.collapse' : 'cases.tree.expand', { name: s.name })}
                    className="flex size-4 flex-none cursor-pointer items-center justify-center rounded-xs border-0 bg-transparent p-0 text-inherit"
                  >
                    <ChevronRight size={14} strokeWidth={2.4} aria-hidden="true" className={`transition-transform ${open ? 'rotate-90' : ''}`} />
                  </button>
                ) : (
                  <span className="size-4 flex-none" />
                )}
                <button
                  type="button" role="radio" aria-checked={on} title={sectionPath(sections, s.id)} onClick={() => setTarget(s.id)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent py-[7px] text-left text-inherit"
                >
                  {parent && open ? <FolderOpen size={14} aria-hidden="true" className={folderIcon} /> : <Folder size={14} aria-hidden="true" className={folderIcon} />}
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  {on && <Check size={14} strokeWidth={2.4} aria-hidden="true" className="flex-none" />}
                </button>
              </div>
            )
          })}
        </div>
        {target && <p className="m-0 text-[13px] text-ink-muted">{sectionPath(sections, target)}</p>}
      </div>
      <div className={footer}>
        <button type="button" onClick={onClose} className={`${btn} border-0 bg-transparent text-ink-secondary`}>{t('cases.bulk.cancel')}</button>
        <button type="button" onClick={() => onMove(target)} className={`${btn} border-0 bg-accent text-white`}>{t(`cases.${mode}.confirm`, { count: label })}</button>
      </div>
    </Dialog>
  )
}

export function DeleteDialog({ open, count, onClose, onDelete }: { open: boolean; count: number; onClose: () => void; onDelete: () => void }) {
  const { t } = useTranslation()
  const label = t('cases.count', { count })
  return (
    <Dialog open={open} onClose={onClose} labelledBy="delete-dlg-title" maxWidth={440}>
      <Header id="delete-dlg-title" title={t('cases.delete.title')} onClose={onClose} />
      <p className="m-0 px-[22px] py-5 text-ink-secondary">{t('cases.delete.body', { count: label })}</p>
      <div className={footer}>
        <button type="button" onClick={onClose} className={`${btn} border-0 bg-transparent text-ink-secondary`}>{t('cases.delete.cancel')}</button>
        <button type="button" onClick={onDelete} className={`${btn} border-0 bg-danger text-white`}>{t('cases.delete.confirm', { count: label })}</button>
      </div>
    </Dialog>
  )
}

export function DeleteSectionDialog({ open, name, subsections, cases, onClose, onDelete }: { open: boolean; name: string; subsections: number; cases: number; onClose: () => void; onDelete: () => void }) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onClose={onClose} labelledBy="delete-section-dlg-title" maxWidth={440}>
      <Header id="delete-section-dlg-title" title={t('cases.deleteSection.title')} onClose={onClose} />
      <p className="m-0 px-[22px] py-5 text-ink-secondary">
        {t('cases.deleteSection.body', { name, subsections: t('cases.deleteSection.subsections', { count: subsections }), cases: t('cases.count', { count: cases }) })}
      </p>
      <div className={footer}>
        <button type="button" onClick={onClose} className={`${btn} border-0 bg-transparent text-ink-secondary`}>{t('cases.delete.cancel')}</button>
        <button type="button" onClick={onDelete} className={`${btn} border-0 bg-danger text-white`}>{t('cases.deleteSection.confirm')}</button>
      </div>
    </Dialog>
  )
}

export function SendReviewDialog({ open, count = 1, users, loading, failed, meUid, onClose, onSend }: {
  open: boolean; count?: number; users: Person[]; loading: boolean; failed: boolean; meUid: string; onClose: () => void; onSend: (reviewer: Person) => void
}) {
  const { t } = useTranslation()
  const [uid, setUid] = useState(meUid)
  const reviewer = users.find((u) => u.uid === uid)
  return (
    <Dialog open={open} onClose={onClose} labelledBy="review-dlg-title" maxWidth={440}>
      <Header id="review-dlg-title" title={t('cases.detail.reviewTitle')} onClose={onClose} />
      <div className="flex flex-col gap-3 px-[22px] py-5">
        <p className="m-0 text-ink-secondary">{count > 1 ? t('cases.detail.reviewBodyBulk', { count }) : t('cases.detail.reviewBody')}</p>
        <label htmlFor="review-target" className="font-medium">{t('cases.detail.reviewer')}</label>
        <select id="review-target" value={uid} onChange={(e) => setUid(e.target.value)} disabled={loading || failed} className="h-[42px] rounded-md border border-border-input bg-surface px-2.5">
          {loading && <option>{t('cases.detail.usersLoading')}</option>}
          {users.map((u) => <option key={u.uid} value={u.uid}>{u.uid === meUid ? `${u.name} (${t('cases.detail.you')})` : u.name}</option>)}
        </select>
        {failed && <p role="alert" className="m-0 text-danger-text">{t('cases.detail.usersError')}</p>}
      </div>
      <div className={footer}>
        <button type="button" onClick={onClose} className={`${btn} border-0 bg-transparent text-ink-secondary`}>{t('cases.bulk.cancel')}</button>
        <button type="button" disabled={!reviewer} onClick={() => reviewer && onSend(reviewer)} className={`${btn} border-0 bg-accent text-white disabled:cursor-default disabled:bg-accent-disabled`}>{t('cases.detail.send')}</button>
      </div>
    </Dialog>
  )
}
