import { X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { useCreateProject } from './hooks'

const input = 'h-[42px] rounded-md border border-border-input bg-surface px-3 text-ink'

export function ProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="project-dlg-title" maxWidth={480}>
      <ProjectForm onClose={onClose} />
    </Dialog>
  )
}

function ProjectForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const create = useCreateProject()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const hint = create.isError ? t('dashboard.project.error') : !name.trim() ? t('dashboard.project.needName') : ''

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border px-[22px] py-[18px]">
        <h2 id="project-dlg-title" className="m-0 text-lg font-bold">{t('dashboard.project.title')}</h2>
        <button type="button" onClick={onClose} aria-label={t('dashboard.project.close')} className="flex size-9 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-secondary">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-col gap-3.5 px-[22px] py-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="project-name" className="font-medium">{t('dashboard.project.name')} <span className="text-danger-text">*</span></label>
          <input id="project-name" autoFocus maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('dashboard.project.namePlaceholder')} className={input} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="project-desc" className="font-medium">{t('dashboard.project.description')}</label>
          <textarea id="project-desc" rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('dashboard.project.descriptionPlaceholder')} className={`${input} h-auto py-2.5`} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-subtle px-[22px] py-3.5">
        <span role={create.isError ? 'alert' : undefined} className="flex-[1_1_160px] text-[13px] text-ink-muted">{hint}</span>
        <button type="button" onClick={onClose} className="h-10 cursor-pointer rounded-md border-0 bg-transparent px-3.5 font-semibold text-ink-secondary">{t('dashboard.project.cancel')}</button>
        <button
          type="button"
          disabled={!name.trim() || create.isPending}
          onClick={() => create.mutate({ name: name.trim(), description: description.trim() }, { onSuccess: onClose })}
          className="h-10 cursor-pointer rounded-md border-0 bg-accent px-4 font-semibold text-white disabled:cursor-default disabled:bg-accent-disabled"
        >
          {create.isPending ? t('dashboard.project.creating') : t('dashboard.project.create')}
        </button>
      </div>
    </>
  )
}
