import { Info, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import type { Person, Section, TestCase } from '@/features/cases/domain'
import { useUsers } from '@/features/people/useUsers'
import { CasePicker } from './CasePicker'
import type { Milestone, Plan, Run } from './domain'
import type { NewRun } from './store'

interface Props {
  open: boolean
  /** undefined = run baru; ada = edit run */
  editing?: Run
  /** case yang sudah ada di run; bila diisi, Edit run juga bisa menambah/melepas case (hanya project Firestore) */
  caseIds?: string[]
  projectName: string
  milestones: Milestone[]
  /** test plan project; plan hanya bisa dipilih bila milestone-nya terpilih */
  plans?: Plan[]
  cases: TestCase[]
  sections: Section[]
  /** user yang login: terpilih awal di "Assign to" dan tetap tersedia walau daftar user dari BE gagal dimuat */
  me: Person
  /** penyimpanan async (Firestore): tombol mati selama menyimpan, dan pesan gagal tampil di footer */
  saving?: boolean
  failed?: boolean
  onClose: () => void
  /** assignee di input = uid; assigneeName untuk penyimpanan yang memakai inisial (mock) */
  onCreate: (input: NewRun, assigneeName: string) => void
  onSave: (patch: Pick<Run, 'name' | 'milestoneId' | 'planId' | 'description'>, caseIds?: Set<string>) => void
}

const input = 'h-[42px] rounded-md border border-border-input bg-surface px-3 text-ink'
const select = 'h-[42px] rounded-md border border-border-input bg-surface px-2.5 text-ink'
const field = 'flex flex-col gap-1.5'
const btn = 'h-10 cursor-pointer rounded-md px-3.5 font-semibold'

export function RunDialog(props: Props) {
  const fetched = useUsers(props.open && !props.editing).data ?? []
  const users = [props.me, ...fetched.filter((u) => u.uid !== props.me.uid)]
  return (
    <Dialog open={props.open} onClose={props.onClose} labelledBy="run-dlg-title" maxWidth={props.editing && !props.caseIds ? 440 : 1120}>
      <RunForm {...props} users={users} />
    </Dialog>
  )
}

function RunForm({ editing, caseIds, projectName, milestones, plans = [], cases, sections, me, users, saving, failed, onClose, onCreate, onSave }: Props & { users: Person[] }) {
  const { t } = useTranslation()
  // Milestone yang sudah selesai tidak ditawarkan, kecuali yang sedang dipakai run ini.
  const choices = milestones.filter((m) => !m.isCompleted || m.id === editing?.milestoneId)
  const [name, setName] = useState(editing?.name ?? '')
  const [milestoneId, setMilestoneId] = useState(editing?.milestoneId ?? '')
  const [planId, setPlanId] = useState(editing?.planId ?? '')
  const planChoices = plans.filter((p) => p.milestoneId === milestoneId)
  const [assignee, setAssignee] = useState(editing?.assignee ?? me.uid)
  const [description, setDescription] = useState(editing?.description ?? '')
  const [mode, setMode] = useState<'pick' | 'all'>('pick')
  const [selected, setSelected] = useState<Set<string>>(() => new Set(caseIds))
  const editCases = !!editing && !!caseIds
  const picking = !editing || editCases

  const approved = useMemo(() => cases.filter((c) => c.status === 'active'), [cases])
  const topSections = sections.filter((s) => s.parentId === null)
  const chosen = mode === 'all' ? approved : approved.filter((c) => selected.has(c.id))
  const added = editCases ? [...selected].filter((id) => !caseIds!.includes(id)).length : 0
  const removed = editCases ? caseIds!.filter((id) => !selected.has(id)).length : 0
  const noName = !name.trim()
  const assigneeName = users.find((u) => u.uid === assignee)?.name
  const blocked = saving || noName || (editCases ? selected.size === 0 : !editing && (chosen.length === 0 || !assigneeName))
  const hidden = cases.length - approved.length

  const create = (start: boolean) => !blocked && onCreate({ name, milestoneId: milestoneId || null, planId: planId || null, assignee, description, cases: chosen, start }, assigneeName!)
  const hint = failed ? t('runs.dialog.saveFailed') : noName ? t('runs.dialog.needName') : !editing && approved.length === 0 ? t('runs.dialog.noActive') : !editing && chosen.length === 0 ? t('runs.dialog.needCases') : !editing && !assigneeName ? t('runs.dialog.needAssignee') : editCases ? (selected.size === 0 ? t('runs.dialog.needCases') : added + removed === 0 ? '' : t('runs.dialog.editSummary', { added, removed })) : editing ? '' : t('runs.dialog.willAdd', { cases: t('cases.count', { count: chosen.length }) })

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border px-[22px] py-[18px]">
        <div>
          <h2 id="run-dlg-title" className="m-0 text-lg font-bold">{editing ? t('runs.dialog.editTitle') : t('runs.dialog.addTitle')}</h2>
          <p className="mt-0.5 text-[13px] text-ink-muted">{projectName}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t('runs.dialog.close')} className="flex size-9 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-secondary">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-wrap items-start gap-[22px] overflow-y-auto px-[22px] py-5">
        <div className={`flex flex-[1_1_260px] flex-col gap-3.5 ${editing && !editCases ? '' : 'max-w-[320px]'}`}>
          <h3 className="m-0 text-[13px] font-semibold tracking-[0.05em] text-ink-muted uppercase">{t('runs.dialog.details')}</h3>
          <div className={field}>
            <label htmlFor="run-name" className="font-medium">{t('runs.dialog.name')} <span className="text-danger-text">*</span></label>
            <input id="run-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('runs.dialog.namePlaceholder')} className={input} />
          </div>
          <div className={field}>
            <label htmlFor="run-ms" className="font-medium">{t('runs.dialog.milestone')} <span className="font-normal text-ink-subtle">{t('runs.dialog.optional')}</span></label>
            <select id="run-ms" value={milestoneId} onChange={(e) => { setMilestoneId(e.target.value); setPlanId('') }} className={select}>
              <option value="">{t('runs.dialog.noMilestone')}</option>
              {choices.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          {planChoices.length > 0 && (
            <div className={field}>
              <label htmlFor="run-plan" className="font-medium">{t('runs.dialog.plan')} <span className="font-normal text-ink-subtle">{t('runs.dialog.optional')}</span></label>
              <select id="run-plan" value={planId} onChange={(e) => setPlanId(e.target.value)} className={select}>
                <option value="">{t('runs.dialog.noPlan')}</option>
                {planChoices.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          {!editing && (
            <div className={field}>
              <label htmlFor="run-who" className="font-medium">{t('runs.dialog.assign')}</label>
              <select id="run-who" value={assignee} onChange={(e) => setAssignee(e.target.value)} className={select}>
                {users.map((u) => <option key={u.uid} value={u.uid}>{u.name}</option>)}
              </select>
            </div>
          )}
          <div className={field}>
            <label htmlFor="run-desc" className="font-medium">{t('runs.dialog.description')} <span className="font-normal text-ink-subtle">{t('runs.dialog.optional')}</span></label>
            <textarea id="run-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('runs.dialog.descPlaceholder')} className="resize-y rounded-md border border-border-input bg-surface px-3 py-2.5 text-ink" />
          </div>
        </div>

        {picking && (
          <div className="flex min-w-0 flex-[3_1_560px] flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <h3 className="m-0 text-[13px] font-semibold tracking-[0.05em] text-ink-muted uppercase">{editing ? t('runs.dialog.casesInRun') : t('runs.dialog.cases')}</h3>
              {!editing && <div role="radiogroup" aria-label={t('runs.dialog.modeLabel')} className="flex gap-1 rounded-lg bg-track p-1">
                {(['pick', 'all'] as const).map((m) => {
                  const on = mode === m
                  const n = m === 'all' ? approved.length : selected.size
                  return (
                    <button
                      key={m} type="button" role="radio" aria-checked={on} onClick={() => setMode(m)}
                      className={`h-8 cursor-pointer rounded-[7px] border-0 px-3.5 text-ink ${on ? 'bg-surface font-semibold shadow-segment' : 'bg-transparent font-medium'}`}
                    >
                      {t(m === 'pick' ? 'runs.dialog.modePick' : 'runs.dialog.modeAll')} <span className="text-xs text-ink-muted">{n || ''}</span>
                    </button>
                  )
                })}
              </div>}
            </div>

            <div className="flex items-center gap-2.5 rounded-lg border border-[var(--cb-passed-border)] bg-[var(--cb-success-bg)] px-3.5 py-2.5 text-[13px] text-[var(--cb-approved-fg)]">
              <Info size={16} aria-hidden="true" className="flex-none" />
              <span>
                <Trans i18nKey="runs.dialog.approvedOnly" components={{ strong: <strong className="font-semibold" /> }} />{' '}
                {hidden > 0 && t('runs.dialog.hidden', { count: hidden })}
              </span>
            </div>

            {editCases && removed > 0 && editing!.status !== 'draft' && (
              <div role="note" className="flex items-center gap-2.5 rounded-lg border border-[var(--cb-pre-border)] bg-[var(--cb-pre-bg)] px-3.5 py-2.5 text-[13px] text-[var(--cb-pre-text)]">
                <Info size={16} aria-hidden="true" className="flex-none" />
                <span>{t('runs.dialog.removeWarn')}</span>
              </div>
            )}

            {mode === 'all' && !editing ? (
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="flex items-center justify-between border-b border-border bg-surface-subtle px-4 py-3">
                  <span className="font-semibold">
                    {t('runs.dialog.allTitle', { cases: t('runs.approvedCases', { count: approved.length }), sections: t('runs.list.sections', { count: topSections.length }) })}
                  </span>
                  <span className="text-[13px] text-ink-muted">{t('runs.dialog.allNote')}</span>
                </div>
                {topSections.map((s) => (
                  <div key={s.id} className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5">
                    <span>{s.name}</span>
                    <span className="text-[13px] font-semibold">
                      {t('cases.count', { count: approved.filter((c) => c.sectionId === s.id || isUnder(sections, c.sectionId, s.id)).length })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <CasePicker cases={cases} sections={sections} selected={selected} onChange={setSelected} />
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-subtle px-[22px] py-3.5">
        <span role={failed ? 'alert' : undefined} className={`flex-[1_1_220px] text-[13px] ${failed ? 'text-danger-text' : blocked ? 'text-ink-muted' : 'text-[var(--cb-approved-fg)]'}`}>{hint}</span>
        <button type="button" onClick={onClose} className={`${btn} border-0 bg-transparent text-ink-secondary`}>{t('runs.dialog.cancel')}</button>
        {editing ? (
          <button
            type="button" disabled={blocked}
            onClick={() => onSave({ name, milestoneId: milestoneId || null, planId: planId || null, description }, editCases ? selected : undefined)}
            className={`${btn} border-0 bg-accent text-white disabled:cursor-default disabled:bg-accent-disabled`}
          >
            {t('runs.dialog.save')}
          </button>
        ) : (
          <>
            <button type="button" disabled={blocked} onClick={() => create(false)} className={`${btn} border border-border-strong bg-surface text-ink disabled:cursor-default disabled:text-[var(--cb-text-disabled)]`}>
              {t('runs.dialog.saveDraft')}
            </button>
            <button type="button" disabled={blocked} onClick={() => create(true)} className={`${btn} border-0 bg-accent text-white disabled:cursor-default disabled:bg-accent-disabled`}>
              {t('runs.dialog.saveStart')}
            </button>
          </>
        )}
      </div>
    </>
  )
}

function isUnder(sections: Section[], sectionId: string, ancestorId: string): boolean {
  let parent = sections.find((s) => s.id === sectionId)?.parentId ?? null
  while (parent) {
    if (parent === ancestorId) return true
    parent = sections.find((s) => s.id === parent)?.parentId ?? null
  }
  return false
}
