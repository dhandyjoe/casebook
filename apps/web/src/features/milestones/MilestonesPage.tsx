import { Link, useParams, useSearch } from '@tanstack/react-router'
import { CalendarDays, Check, Flag, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { ProjectShell } from '@/components/layout/ProjectShell'
import { useProject } from '@/features/projects/hooks'
import { useRuns } from '@/features/runs/hooks'
import { CountBar, RunStatusChip } from '@/features/runs/status'
import { STATUS_ORDER, executedPct, sumCounts, totalOf, type Milestone, type Run } from '@/features/runs/domain'
import { MilestoneDialog } from './MilestoneDialog'
import { elapsed, milestoneDates, stateOf, type MilestoneState } from './domain'
import { StateChip } from './StateChip'
import { useMilestoneActions, useMilestones } from './hooks'

type Tab = 'open' | 'completed' | 'all'
const TABS: Tab[] = ['open', 'completed', 'all']
const outline = 'flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3.5 font-semibold text-ink hover:bg-surface-subtle disabled:cursor-default disabled:text-ink-subtle disabled:hover:bg-surface'
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

export function MilestonesPage() {
  const { t } = useTranslation()
  const { projectId } = useParams({ from: '/p/$projectId/milestones' })
  // ?m= dari global search: pilih milestone itu; tab All supaya yang Completed juga terlihat.
  const { m: target } = useSearch({ from: '/p/$projectId/milestones' })
  const project = useProject(projectId)
  const query = useMilestones(projectId)
  const allRuns = useRuns(projectId).data
  const { create, update, remove } = useMilestoneActions(projectId)
  const [tab, setTab] = useState<Tab>(target ? 'all' : 'open')
  const [picked, setPicked] = useState(target)
  // undefined = tertutup, null = milestone baru, objek = edit
  const [form, setForm] = useState<Milestone | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Milestone | null>(null)
  useEffect(() => {
    if (!target) return
    setPicked(target)
    setTab('all')
  }, [target])

  if (!project) return <p className="p-6">{t('cases.notFound')}</p>

  const rows = (query.data ?? []).map((m) => {
    const runs = (allRuns ?? []).filter((r) => r.milestoneId === m.id)
    return { m, runs, state: stateOf(m), counts: sumCounts(runs) }
  })
  const count = (k: Tab) => rows.filter((r) => k === 'all' || (k === 'completed') === (r.state === 'completed')).length
  const visible = rows.filter((r) => tab === 'all' || (tab === 'completed') === (r.state === 'completed'))
  const cur = visible.find((r) => r.m.id === picked) ?? visible[0]

  const submit = (input: Parameters<typeof create.mutate>[0]) => {
    const done = { onSuccess: () => setForm(undefined) }
    if (form) update.mutate({ id: form.id, patch: input }, done)
    else create.mutate(input, done)
  }
  const saving = form ? update : create
  const add = () => { saving.reset(); setForm(null) }
  const complete = (m: Milestone) => update.mutate({ id: m.id, patch: { isCompleted: true } })

  const dates = (m: Milestone, state: MilestoneState) => milestoneDates(t, m, state)
  const summary = (counts: ReturnType<typeof sumCounts>, runs: Run[]) => {
    const total = totalOf(counts)
    const exec = total - counts.untested
    return !runs.length ? t('milestones.noRuns') : !exec ? t('milestones.notStarted') : t('milestones.summary', { exec: pct(exec, total), passed: pct(counts.passed, exec) })
  }

  const total = cur ? totalOf(cur.counts) : 0
  const exec = cur ? total - cur.counts.untested : 0
  const time = cur ? elapsed(cur.m) : null
  const progressNote = !cur || !total ? t('milestones.addRunsHint') : cur.state === 'completed' ? t('milestones.final') : time && pct(exec, total) < time.pct ? t('milestones.behind') : time ? t('milestones.ahead') : ''
  const stat = 'flex flex-col gap-0.5 rounded-lg border border-border p-4'

  return (
    <ProjectShell project={project} active="milestones">
      <main className="flex w-full flex-wrap items-start gap-6 px-8 py-6">
        <section aria-labelledby="ms-list" className="min-w-0 flex-[1_1_360px] overflow-hidden rounded-xl border border-border bg-surface lg:max-w-[600px]">
          <div className="flex flex-col gap-3.5 border-b border-border px-[18px] pt-[18px] pb-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 id="ms-list" className="m-0 text-xl font-bold tracking-tight">{t('milestones.title')}</h1>
                <p className="mt-0.5 mb-0 text-[13px] text-ink-muted">{t('milestones.listMeta', { open: count('open'), done: count('completed') })}</p>
              </div>
              <button type="button" aria-haspopup="dialog" onClick={add} className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md border-0 bg-accent px-3.5 font-semibold text-white hover:bg-accent-hover">
                <Plus size={15} strokeWidth={2.4} aria-hidden="true" />{t('milestones.add')}
              </button>
            </div>
            <div role="radiogroup" aria-label={t('milestones.show')} className="flex gap-1 rounded-[10px] bg-track p-1">
              {TABS.map((k) => (
                <button key={k} type="button" role="radio" aria-checked={tab === k} onClick={() => setTab(k)} className={`h-[30px] flex-1 cursor-pointer rounded-[7px] border-0 text-[13px] text-ink ${tab === k ? 'bg-surface font-semibold shadow-sm' : 'bg-transparent font-medium'}`}>
                  {t(`milestones.tab.${k}`)} <span className="text-xs text-ink-muted">{count(k)}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            {visible.length === 0 && (
              <div className="flex flex-col items-center gap-1.5 px-[18px] py-10 text-center">
                <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-accent-tint text-accent"><Flag size={24} aria-hidden="true" /></span>
                <p className="m-0 font-semibold">{rows.length ? t('milestones.noneHere') : t('milestones.emptyTitle')}</p>
                <p className="m-0 max-w-[300px] text-[13px] text-ink-muted">{rows.length ? t('milestones.noneHereHint') : t('milestones.emptyHint')}</p>
              </div>
            )}
            {visible.map(({ m, runs, state, counts }) => {
              const on = m.id === cur?.m.id
              return (
                <button key={m.id} type="button" aria-current={on} onClick={() => setPicked(m.id)} className={`flex w-full cursor-pointer flex-col gap-2 border-0 border-b border-border-subtle px-[18px] py-3.5 text-left text-ink hover:bg-surface-subtle ${on ? 'bg-accent-tint shadow-[inset_3px_0_0_var(--cb-accent)]' : 'bg-surface'}`}>
                  <span className="flex w-full items-center justify-between gap-2.5">
                    <span className={`flex min-w-0 items-center gap-2 ${on ? 'font-bold' : 'font-semibold'}`}>
                      <Flag size={16} aria-hidden="true" className="shrink-0 text-ink-muted" />
                      <span className="truncate">{m.name}</span>
                    </span>
                    <StateChip state={state} label={t(`milestones.state.${state}`)} />
                  </span>
                  <span className="text-xs text-ink-muted">{dates(m, state)}</span>
                  <CountBar counts={counts} className="h-1.5 w-full rounded-[3px]" />
                  <span className="flex w-full justify-between gap-2.5 text-xs text-ink-secondary">
                    <span>{runs.length ? t('milestones.runCount', { count: runs.length }) : t('milestones.noRunsYet')}</span>
                    <span className="font-semibold">{summary(counts, runs)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section aria-labelledby="ms-detail" className="flex min-w-0 flex-[2_1_600px] flex-col gap-5 rounded-xl border border-border bg-surface p-[22px]">
          <div className="flex flex-wrap items-start justify-between gap-3.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 id="ms-detail" className="m-0 text-2xl font-bold tracking-tight">{cur?.m.name ?? t('milestones.noSelection')}</h2>
                {cur && <StateChip state={cur.state} label={t(`milestones.state.${cur.state}`)} />}
              </div>
              <p className="mt-1.5 mb-0 flex items-center gap-1.5 text-ink-muted">
                <CalendarDays size={15} aria-hidden="true" />{cur ? dates(cur.m, cur.state) : t('milestones.noDates')}
              </p>
            </div>
            {cur && (
              <div className="flex flex-wrap gap-2">
                {/* Milestone Completed terkunci: tidak bisa diedit atau dibuka lagi. */}
                {!cur.m.isCompleted && (
                  <>
                    <button type="button" onClick={() => { saving.reset(); setForm(cur.m) }} className={outline}>{t('milestones.edit')}</button>
                    <button type="button" onClick={() => complete(cur.m)} className={outline}>
                      <Check size={15} strokeWidth={2.2} aria-hidden="true" />{t('milestones.complete')}
                    </button>
                  </>
                )}
                <button type="button" disabled={cur.runs.length > 0} title={cur.runs.length ? t('milestones.inUse') : undefined} onClick={() => { remove.reset(); setDeleting(cur.m) }} className={outline}>{t('milestones.delete')}</button>
              </div>
            )}
          </div>

          <p className={`m-0 ${cur?.m.description ? 'text-ink-secondary' : 'text-ink-subtle'}`}>{cur?.m.description || t('milestones.noDescription')}</p>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-3.5">
            <div className={stat}>
              <span className="text-[13px] text-ink-muted">{t('runs.testStatus.passed')}</span>
              <span className="text-[30px] leading-tight font-bold tracking-tight text-[var(--cb-passed-fg)]">{exec ? `${pct(cur!.counts.passed, exec)}%` : '—'}</span>
              <span className="text-xs text-ink-muted">{exec ? t('milestones.passSub', { n: cur!.counts.passed, total: exec }) : t('milestones.noResults')}</span>
            </div>
            <div className={stat}>
              <span className="text-[13px] text-ink-muted">{t('milestones.executedLabel')}</span>
              <span className="text-[30px] leading-tight font-bold tracking-tight">{total ? `${executedPct(cur!.counts)}%` : '—'}</span>
              <span className="text-xs text-ink-muted">{total ? t('milestones.execSub', { n: exec, count: total }) : t('milestones.noTests')}</span>
            </div>
            <div className={stat}>
              <span className="text-[13px] text-ink-muted">{t('milestones.timeElapsed')}</span>
              <span className="text-[30px] leading-tight font-bold tracking-tight">{time ? `${time.pct}%` : '—'}</span>
              <span className="text-xs text-ink-muted">{time ? t('milestones.timeSub', { spent: time.spent, total: time.total }) : t('milestones.noSchedule')}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap justify-between gap-2.5 text-[13px]">
              <span className="font-semibold">{t('milestones.progress')}</span>
              <span className="text-ink-muted">{progressNote}</span>
            </div>
            <CountBar counts={cur?.counts ?? { passed: 0, failed: 0, blocked: 0, retest: 0, untested: 0 }} className="h-3.5 rounded-[7px]" />
            <div aria-hidden="true" className="h-1.5 rounded-[3px] bg-track">
              <div className="h-full rounded-[3px] bg-[#9FBAD6]" style={{ width: `${time?.pct ?? 0}%` }} />
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-ink-muted">
              {STATUS_ORDER.map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: `var(--cb-${k})` }} />
                  <strong className="font-semibold text-ink">{cur?.counts[k] ?? 0}</strong> {t(`runs.testStatus.${k}`).toLowerCase()}
                </span>
              ))}
              <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-[18px] rounded-[3px] bg-[#9FBAD6]" />{t('milestones.timeElapsedLegend')}</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-[10px] border border-border">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-subtle px-4 py-3">
              <h3 className="m-0 text-sm font-semibold">{t('milestones.runsTitle')}</h3>
              <Link to="/p/$projectId/runs" params={{ projectId }} className="text-[13px] font-semibold text-accent no-underline hover:underline">{t('milestones.addRun')}</Link>
            </div>
            {!cur?.runs.length && <p className="m-0 px-4 py-6 text-center text-ink-muted">{t('milestones.runsEmpty')}</p>}
            {cur?.runs.map((r) => {
              const rt = totalOf(r.counts)
              const re = rt - r.counts.untested
              return (
                <Link key={r.id} to="/p/$projectId/runs/$runId" params={{ projectId, runId: r.id }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2 border-b border-border-subtle px-4 py-3 text-ink no-underline last:border-b-0 hover:bg-surface-subtle sm:grid-cols-[minmax(0,1.4fr)_78px_minmax(100px,1fr)_48px]">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.name}</span>
                    <span className="block text-xs text-ink-muted">{t('milestones.testCount', { count: rt })} · {re ? t('milestones.passedPct', { pct: pct(r.counts.passed, re) }) : t('milestones.notStartedLower')}</span>
                  </span>
                  <span><RunStatusChip status={r.status} /></span>
                  <CountBar counts={r.counts} className="col-span-2 h-2 rounded-sm sm:col-span-1" />
                  <span className="hidden text-right font-bold sm:block">{executedPct(r.counts)}%</span>
                </Link>
              )
            })}
          </div>
        </section>
      </main>

      <MilestoneDialog
        open={form !== undefined} editing={form ?? undefined} projectName={project.name}
        busy={saving.isPending} failed={saving.isError} onClose={() => setForm(undefined)} onSubmit={submit}
      />
      <Dialog open={!!deleting} onClose={() => setDeleting(null)} labelledBy="ms-del-title" maxWidth={440}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-[22px] py-[18px]">
          <h2 id="ms-del-title" className="m-0 text-lg font-bold">{t('milestones.deleteTitle')}</h2>
          <button type="button" onClick={() => setDeleting(null)} aria-label={t('runs.dialog.close')} className="flex size-9 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-secondary">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p className="m-0 px-[22px] py-5">{t('milestones.deleteBody', { name: deleting?.name })}</p>
        {remove.isError && <p role="alert" className="m-0 px-[22px] pb-4 text-danger-text">{t('milestones.inUse')}</p>}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-subtle px-[22px] py-3.5">
          <button type="button" onClick={() => setDeleting(null)} className="h-10 cursor-pointer rounded-md border-0 bg-transparent px-3.5 font-semibold text-ink-secondary">{t('runs.dialog.cancel')}</button>
          <button type="button" disabled={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })} className="h-10 cursor-pointer rounded-md border-0 bg-danger px-4 font-semibold text-white disabled:cursor-default disabled:opacity-60">
            {t('milestones.deleteConfirm')}
          </button>
        </div>
      </Dialog>
    </ProjectShell>
  )
}
