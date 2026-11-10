import { X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { sectionPath, type Person, type Section } from './domain'

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
  const options = sections.map((s) => ({ id: s.id, path: sectionPath(sections, s.id) })).sort((a, b) => a.path.localeCompare(b.path))
  const [target, setTarget] = useState(options[0]?.id ?? '')
  const label = t('cases.count', { count })
  return (
    <Dialog open={open} onClose={onClose} labelledBy="move-dlg-title" maxWidth={440}>
      <Header id="move-dlg-title" title={t(`cases.${mode}.title`)} onClose={onClose} />
      <div className="flex flex-col gap-3 px-[22px] py-5">
        <p className="m-0 text-ink-secondary">{t(`cases.${mode}.body`, { count: label })}</p>
        <label htmlFor="move-target" className="font-medium">{t(`cases.${mode}.destination`)}</label>
        <select id="move-target" value={target} onChange={(e) => setTarget(e.target.value)} className="h-[42px] rounded-md border border-border-input bg-surface px-2.5">
          {options.map((o) => <option key={o.id} value={o.id}>{o.path}</option>)}
        </select>
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

export function SendReviewDialog({ open, users, loading, failed, meUid, onClose, onSend }: {
  open: boolean; users: Person[]; loading: boolean; failed: boolean; meUid: string; onClose: () => void; onSend: (reviewer: Person) => void
}) {
  const { t } = useTranslation()
  const [uid, setUid] = useState(meUid)
  const reviewer = users.find((u) => u.uid === uid)
  return (
    <Dialog open={open} onClose={onClose} labelledBy="review-dlg-title" maxWidth={440}>
      <Header id="review-dlg-title" title={t('cases.detail.reviewTitle')} onClose={onClose} />
      <div className="flex flex-col gap-3 px-[22px] py-5">
        <p className="m-0 text-ink-secondary">{t('cases.detail.reviewBody')}</p>
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
