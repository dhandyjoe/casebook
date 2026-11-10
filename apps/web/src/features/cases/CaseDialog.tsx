import { Info, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { CASE_TYPES, PRIORITIES, sectionPath, type CaseEdit, type Section, type TestCase } from './domain'
import { ExpectedEditor } from './ExpectedEditor'

interface Props {
  open: boolean
  /** undefined = case baru */
  editing?: TestCase
  projectName: string
  sections: Section[]
  defaultSectionId: string
  onClose: () => void
  onSave: (edit: CaseEdit, status: 'draft' | 'under_review') => void
}

const input = 'h-[42px] rounded-md border border-border-input bg-surface px-3 text-ink'
const field = 'flex flex-col gap-1.5'
const labelCls = 'font-medium'
const btn = 'h-10 cursor-pointer rounded-md px-3.5 font-semibold'

export function CaseDialog({ open, editing, projectName, sections, defaultSectionId, onClose, onSave }: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onClose={onClose} labelledBy="case-dlg-title">
      <CaseForm editing={editing} projectName={projectName} sections={sections} defaultSectionId={defaultSectionId} onClose={onClose} onSave={onSave} t={t} />
    </Dialog>
  )
}

function CaseForm({ editing, projectName, sections, defaultSectionId, onClose, onSave, t }: Omit<Props, 'open'> & { t: ReturnType<typeof useTranslation>['t'] }) {
  const [title, setTitle] = useState(editing?.title ?? '')
  const [sectionId, setSectionId] = useState(editing?.sectionId ?? defaultSectionId)
  const [type, setType] = useState(editing?.type ?? 'Functional')
  const [priority, setPriority] = useState(editing?.priority ?? 'Medium')
  const [refs, setRefs] = useState(editing?.refs ?? '')
  const [pre, setPre] = useState<string[]>(editing?.preconditions ?? [])
  const [steps, setSteps] = useState(editing?.steps.length ? editing.steps : [''])
  const [expected, setExpected] = useState<string[]>(editing?.expected ?? [])

  const options = sections.map((s) => ({ id: s.id, path: sectionPath(sections, s.id) })).sort((a, b) => a.path.localeCompare(b.path))
  const noTitle = !title.trim()
  const build = (): CaseEdit => ({
    title: title.trim(), sectionId, type, priority, refs: refs.trim(), preconditions: pre,
    steps: steps.map((s) => s.trim()).filter(Boolean),
    expected,
  })
  const hint = editing ? (editing.status === 'active' ? t('cases.dialog.hintEditApproved') : t('cases.dialog.hintEdit')) : t('cases.dialog.hintAdd')

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border px-[22px] py-[18px]">
        <div>
          <h2 id="case-dlg-title" className="m-0 text-lg font-bold">{editing ? t('cases.dialog.editTitle') : t('cases.dialog.addTitle')}</h2>
          <p className="mt-0.5 text-[13px] text-ink-muted">{editing ? `${editing.id} · ` : ''}{projectName}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t('cases.dialog.close')} className="flex size-9 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-secondary">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto px-[22px] py-5">
        <div className={field}>
          <label htmlFor="nc-title" className={labelCls}>{t('cases.dialog.titleLabel')} <span className="text-danger-text">*</span></label>
          <input id="nc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('cases.dialog.titlePlaceholder')} className={input} />
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3.5">
          <div className={field}>
            <label htmlFor="nc-section" className={labelCls}>{t('cases.dialog.section')}</label>
            <select id="nc-section" value={sectionId} onChange={(e) => setSectionId(e.target.value)} className={`${input} px-2.5`}>
              {options.map((o) => <option key={o.id} value={o.id}>{o.path}</option>)}
            </select>
          </div>
          <div className={field}>
            <label htmlFor="nc-type" className={labelCls}>{t('cases.dialog.type')}</label>
            <select id="nc-type" value={type} onChange={(e) => setType(e.target.value as typeof type)} className={`${input} px-2.5`}>
              {CASE_TYPES.map((v) => <option key={v} value={v}>{t(`cases.type.${v}`)}</option>)}
            </select>
          </div>
          <div className={field}>
            <label htmlFor="nc-pr" className={labelCls}>{t('cases.dialog.priority')}</label>
            <select id="nc-pr" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={`${input} px-2.5`}>
              {PRIORITIES.map((v) => <option key={v} value={v}>{t(`cases.priority.${v}`)}</option>)}
            </select>
          </div>
          <div className={field}>
            <label htmlFor="nc-refs" className={labelCls}>{t('cases.dialog.refs')}</label>
            <input id="nc-refs" value={refs} onChange={(e) => setRefs(e.target.value)} placeholder={t('cases.dialog.refsPlaceholder')} className={input} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--cb-pre-border)] bg-[var(--cb-pre-bg)] px-3.5 py-3">
          <span id="nc-pre-label" className="font-semibold text-[var(--cb-pre-title)]">{t('cases.dialog.pre')}</span>
          <ExpectedEditor id="nc-pre" labelId="nc-pre-label" tone="pre" entries={pre} onChange={setPre} placeholder={t('cases.dialog.prePlaceholder')} />
        </div>

        <fieldset className="m-0 flex flex-col gap-2 rounded-lg border border-[var(--cb-steps-border)] bg-[var(--cb-steps-bg)] px-3.5 py-3">
          <legend className="px-1.5 font-semibold text-[var(--cb-steps-title)]">{t('cases.dialog.steps')}</legend>
          {steps.map((step, i) => (
            <div key={i} className="grid grid-cols-[28px_minmax(0,1fr)_32px] items-start gap-2">
              <span className="mt-2 flex size-6 items-center justify-center rounded-full bg-[var(--cb-step-num-bg)] text-xs font-semibold">{i + 1}</span>
              <textarea
                rows={2} value={step} aria-label={t('cases.dialog.stepN', { n: i + 1 })} placeholder={t('cases.dialog.step')}
                onChange={(e) => setSteps(steps.map((s, j) => (j === i ? e.target.value : s)))}
                className="resize-y rounded-md border border-border-input bg-surface px-2.5 py-2"
              />
              <button
                type="button" aria-label={t('cases.dialog.removeStep', { n: i + 1 })}
                onClick={() => setSteps(steps.length > 1 ? steps.filter((_, j) => j !== i) : [''])}
                className="mt-1 flex size-8 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent text-ink-muted"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setSteps([...steps, ''])} className="mr-10 flex h-[34px] cursor-pointer items-center gap-1.5 self-end rounded-md border border-dashed border-[#AEB6C4] bg-surface px-3 font-medium text-ink-secondary">
            <Plus size={16} aria-hidden="true" />{t('cases.dialog.addStep')}
          </button>
        </fieldset>

        <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--cb-exp-border)] bg-[var(--cb-exp-bg)] px-3.5 py-3">
          <span id="nc-exp-label" className="font-semibold text-[var(--cb-exp-title)]">{t('cases.dialog.exp')}</span>
          <ExpectedEditor id="nc-exp" labelId="nc-exp-label" entries={expected} onChange={setExpected} placeholder={t('cases.dialog.expPlaceholder')} />
        </div>

        <div className="flex gap-2.5 rounded-lg bg-page px-3.5 py-3 text-[13px] text-ink-secondary">
          <Info size={16} aria-hidden="true" className="mt-0.5 flex-none" /><span>{hint}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-subtle px-[22px] py-3.5">
        <span className="text-[13px] text-ink-muted">{noTitle ? t('cases.dialog.needTitle') : ''}</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onClose} className={`${btn} border-0 bg-transparent text-ink-secondary`}>{t('cases.dialog.cancel')}</button>
          {editing ? (
            <button type="button" disabled={noTitle} onClick={() => onSave(build(), editing.status === 'active' ? 'under_review' : 'draft')} className={`${btn} border-0 bg-accent text-white disabled:cursor-default disabled:bg-accent-disabled`}>
              {t('cases.dialog.save')}
            </button>
          ) : (
            <>
              <button type="button" disabled={noTitle} onClick={() => onSave(build(), 'draft')} className={`${btn} border border-border-strong bg-surface text-ink disabled:cursor-default disabled:text-[var(--cb-text-disabled)]`}>
                {t('cases.dialog.saveDraft')}
              </button>
              <button type="button" disabled={noTitle} onClick={() => onSave(build(), 'under_review')} className={`${btn} border-0 bg-accent text-white disabled:cursor-default disabled:bg-accent-disabled`}>
                {t('cases.dialog.saveSubmit')}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
