import { X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import type { Milestone } from '@/features/runs/domain'
import type { MilestoneInput } from './api'

/** editing undefined = milestone baru */
interface Props { open: boolean; editing?: Milestone; projectName: string; busy: boolean; failed: boolean; onClose: () => void; onSubmit: (input: MilestoneInput) => void }

export function MilestoneDialog({ open, onClose, ...rest }: Props) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="ms-dlg-title" maxWidth={440}>
      <MilestoneForm onClose={onClose} {...rest} />
    </Dialog>
  )
}

// Seluruh lebar field membuka picker, bukan hanya ikonnya. showPicker bisa melempar di browser lama; input tetap bisa diketik.
const openPicker = (el: HTMLInputElement) => { try { el.showPicker() } catch { /* fallback ke input biasa */ } }

function MilestoneForm({ editing, projectName, busy, failed, onClose, onSubmit }: Omit<Props, 'open'>) {
  const { t } = useTranslation()
  const [name, setName] = useState(editing?.name ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [startOn, setStartOn] = useState(editing?.startOn ?? '')
  const [dueOn, setDueOn] = useState(editing?.dueOn ?? '')
  const invalid = !name.trim() ? t('milestones.needName') : !dueOn ? t('milestones.needDue') : startOn && startOn > dueOn ? t('milestones.needRange') : ''
  const hint = invalid || (failed ? t('milestones.failed') : '')
  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border px-[22px] py-[18px]">
        <div>
          <h2 id="ms-dlg-title" className="m-0 text-lg font-bold">{editing ? t('milestones.editTitle') : t('milestones.dialogTitle')}</h2>
          <p className="mt-0.5 text-[13px] text-ink-muted">{projectName}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t('runs.dialog.close')} className="flex size-9 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-secondary">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-col gap-3.5 px-[22px] py-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ms-name" className="font-medium">{t('milestones.name')} <span className="text-danger-text">*</span></label>
          <input id="ms-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('milestones.namePlaceholder')} className="h-[42px] rounded-md border border-border-input bg-surface px-3 text-ink" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ms-desc" className="font-medium">{t('milestones.description')} <span className="font-normal text-ink-subtle">{t('milestones.optional')}</span></label>
          <textarea id="ms-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} placeholder={t('milestones.descriptionPlaceholder')} className="resize-y rounded-md border border-border-input bg-surface px-3 py-2.5 text-ink" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ms-start" className="font-medium">{t('milestones.startOn')} <span className="font-normal text-ink-subtle">{t('milestones.optional')}</span></label>
          <input id="ms-start" type="date" value={startOn} onClick={(e) => openPicker(e.currentTarget)} onChange={(e) => setStartOn(e.target.value)} className="h-[42px] rounded-md border border-border-input bg-surface px-3 text-ink" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ms-due" className="font-medium">{t('milestones.dueOn')} <span className="text-danger-text">*</span></label>
          <input id="ms-due" type="date" value={dueOn} min={startOn || undefined}
            onClick={(e) => {
              const el = e.currentTarget
              // Kosong + start sudah ada: isi dengan start supaya picker terbuka di bulan/tahun start.
              if (!dueOn && startOn) { el.value = startOn; setDueOn(startOn) }
              openPicker(el)
            }}
            onChange={(e) => setDueOn(e.target.value)} className="h-[42px] rounded-md border border-border-input bg-surface px-3 text-ink" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-subtle px-[22px] py-3.5">
        <span className="flex-[1_1_160px] text-[13px] text-ink-muted">{hint}</span>
        <button type="button" onClick={onClose} className="h-10 cursor-pointer rounded-md border-0 bg-transparent px-3.5 font-semibold text-ink-secondary">{t('runs.dialog.cancel')}</button>
        <button type="button" disabled={!!invalid || busy} onClick={() => onSubmit({ name, description, startOn, dueOn })} className="h-10 cursor-pointer rounded-md border-0 bg-accent px-4 font-semibold text-white disabled:cursor-default disabled:bg-accent-disabled">
          {editing ? t('milestones.save') : t('milestones.create')}
        </button>
      </div>
    </>
  )
}
