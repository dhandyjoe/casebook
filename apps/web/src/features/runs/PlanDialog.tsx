import { X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import type { Milestone } from './domain'

interface Props { open: boolean; projectName: string; milestones: Milestone[]; onClose: () => void; onCreate: (input: { name: string; milestoneId: string }) => void }

export function PlanDialog({ open, onClose, ...rest }: Props) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="plan-dlg-title" maxWidth={440}>
      <PlanForm onClose={onClose} {...rest} />
    </Dialog>
  )
}

function PlanForm({ projectName, milestones, onClose, onCreate }: Omit<Props, 'open'>) {
  const { t } = useTranslation()
  const choices = milestones.filter((m) => !m.isCompleted)
  const [name, setName] = useState('')
  const [milestoneId, setMilestoneId] = useState(choices[0]?.id ?? '')
  const noName = !name.trim()
  const noMilestone = !milestoneId
  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border px-[22px] py-[18px]">
        <div>
          <h2 id="plan-dlg-title" className="m-0 text-lg font-bold">{t('runs.dialog.planAddTitle')}</h2>
          <p className="mt-0.5 text-[13px] text-ink-muted">{projectName}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t('runs.dialog.close')} className="flex size-9 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-secondary">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-col gap-3.5 px-[22px] py-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="plan-name" className="font-medium">{t('runs.dialog.planName')} <span className="text-danger-text">*</span></label>
          <input id="plan-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('runs.dialog.planPlaceholder')} className="h-[42px] rounded-md border border-border-input bg-surface px-3 text-ink" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="plan-ms" className="font-medium">{t('runs.dialog.milestone')}</label>
          <select id="plan-ms" value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)} className="h-[42px] rounded-md border border-border-input bg-surface px-2.5 text-ink">
            {choices.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-subtle px-[22px] py-3.5">
        <span className="flex-[1_1_160px] text-[13px] text-ink-muted">{noName ? t('runs.dialog.planNeedName') : noMilestone ? t('runs.dialog.needMilestone') : ''}</span>
        <button type="button" onClick={onClose} className="h-10 cursor-pointer rounded-md border-0 bg-transparent px-3.5 font-semibold text-ink-secondary">{t('runs.dialog.cancel')}</button>
        <button type="button" disabled={noName || noMilestone} onClick={() => onCreate({ name, milestoneId })} className="h-10 cursor-pointer rounded-md border-0 bg-accent px-4 font-semibold text-white disabled:cursor-default disabled:bg-accent-disabled">
          {t('runs.dialog.planCreate')}
        </button>
      </div>
    </>
  )
}
