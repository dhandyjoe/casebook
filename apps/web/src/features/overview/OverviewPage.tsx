import { Link, useParams } from '@tanstack/react-router'
import { Flag, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ProjectShell } from '@/components/layout/ProjectShell'
import { useAuth } from '@/features/auth/session'
import { useCaseData } from '@/features/cases/hooks'
import { MilestoneDialog } from '@/features/milestones/MilestoneDialog'
import { milestoneDates, stateOf } from '@/features/milestones/domain'
import { useMilestoneActions, useMilestones } from '@/features/milestones/hooks'
import { StateChip } from '@/features/milestones/StateChip'
import { personOf } from '@/features/people/data'
import { useProject } from '@/features/projects/hooks'
import { useCreateRun, useRuns } from '@/features/runs/hooks'
import { RunDialog } from '@/features/runs/RunDialog'
import { CountBar } from '@/features/runs/status'
import { executedPct, sumCounts, totalOf } from '@/features/runs/domain'
import { relativeTime } from '@/lib/time'
import { DailyChart } from './DailyChart'
import { useDaily, useRecentResults } from './hooks'

const card = 'rounded-xl border border-border bg-surface p-5'
const ghost = 'flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface px-3.5 font-semibold text-ink'
const link = 'text-[13px] font-semibold text-accent no-underline hover:underline'
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

export function OverviewPage() {
  const { t } = useTranslation()
  const { projectId } = useParams({ from: '/p/$projectId/overview' })
  const project = useProject(projectId)
  const me = useAuth((s) => s.session)!
  const runsQuery = useRuns(projectId)
  const runs = runsQuery.data ?? []
  const milestones = useMilestones(projectId).data ?? []
  const daily = useDaily(projectId)
  const recent = useRecentResults(projectId, runs)
  const { cases, sections } = useCaseData(projectId)
  const createRun = useCreateRun(projectId)
  const { create: createMilestone } = useMilestoneActions(projectId)
  const [dialog, setDialog] = useState<'run' | 'milestone' | null>(null)

  if (!project) return <p className="p-6">{t('cases.notFound')}</p>

  const total = totalOf(sumCounts(runs))
  const active = runs.filter((r) => r.status === 'active')
  const open = milestones.filter((m) => !m.isCompleted).sort((a, b) => a.dueOn.localeCompare(b.dueOn))
  const next = open[0]
  const scope = next ? runs.filter((r) => r.milestoneId === next.id) : runs
  const scopeCounts = sumCounts(scope)
  const scopeExec = totalOf(scopeCounts) - scopeCounts.untested
  const approved = cases.filter((c) => c.status === 'active').length
  const review = cases.filter((c) => c.status === 'under_review')
  // Waktu kirim terakhir tiap case Under Review; yang terlama menunjukkan antrean paling lama.
  const oldest = review.map((c) => c.history.find((h) => h.action === 'submitted')?.at ?? c.updatedAt).sort()[0]
  const runName = (id: string) => runs.find((r) => r.id === id)?.name ?? ''
  const num = (n: number) => n.toLocaleString('en-US')

  const kpis = [
    { label: t('overview.kpiCases'), value: num(cases.length), note: t('overview.kpiCasesNote', { approved: num(approved), rest: num(cases.length - approved) }), to: '/p/$projectId/cases' as const },
    { label: t('overview.kpiReview'), value: num(review.length), note: oldest ? t('overview.kpiReviewNote', { when: relativeTime(t, oldest) }) : t('overview.kpiReviewNone'), warn: review.length > 0, to: '/p/$projectId/cases' as const, search: { status: 'under_review' as const } },
    { label: t('overview.kpiRuns'), value: num(active.length), note: t('overview.kpiRunsNote', { done: runs.filter((r) => r.status === 'done').length, draft: runs.filter((r) => r.status === 'draft').length }), to: '/p/$projectId/runs' as const },
    { label: next ? t('overview.kpiPassRelease', { name: next.name }) : t('overview.kpiPass'), value: scopeExec ? `${pct(scopeCounts.passed, scopeExec)}%` : '—', note: scopeExec ? t('overview.kpiPassNote', { done: num(scopeCounts.passed + scopeCounts.failed + scopeCounts.blocked + scopeCounts.retest), total: num(scopeExec) }) : t('overview.kpiPassNone'), green: scopeExec > 0, to: '/p/$projectId/reports' as const, search: { template: 'project' } },
  ]

  return (
    <ProjectShell project={project} active="overview">
      <main className="flex w-full flex-col gap-5 px-8 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 max-w-[760px]">
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="size-3 flex-none rounded-[3px]" style={{ background: project.color }} />
              <h1 className="m-0 text-2xl font-bold tracking-tight">{project.name}</h1>
            </div>
            <p className={`mt-1.5 mb-0 whitespace-pre-line ${project.description ? 'text-ink-muted' : 'text-ink-subtle'}`}>{project.description || t('overview.noDescription')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-haspopup="dialog" onClick={() => setDialog('milestone')} className={ghost}>
              <Flag size={16} aria-hidden="true" />{t('milestones.add')}
            </button>
            <button type="button" aria-haspopup="dialog" onClick={() => setDialog('run')} className="flex h-10 cursor-pointer items-center gap-2 rounded-md border-0 bg-accent px-4 font-semibold text-white hover:bg-accent-hover">
              <Plus size={16} strokeWidth={2.2} aria-hidden="true" />{t('overview.addRun')}
            </button>
          </div>
        </div>

        {runsQuery.isError && (
          <div role="alert" className={`${card} flex flex-col items-center gap-3 text-center text-ink-muted`}>
            <p className="m-0">{t('overview.loadError')}</p>
            <button type="button" onClick={() => { void runsQuery.refetch(); void daily.refetch() }} className={ghost}>{t('dashboard.retry')}</button>
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
          {kpis.map((k) => (
            <Link key={k.label} to={k.to} params={{ projectId }} search={k.search as never} className={`${card} flex flex-col gap-1 !p-[18px] text-ink no-underline hover:border-border-strong`}>
              <span className="text-[13px] text-ink-muted">{k.label}</span>
              <span className={`text-[30px] leading-tight font-bold tracking-tight ${k.green ? 'text-[var(--cb-passed-fg)]' : k.warn ? 'text-[#8A5300]' : ''}`}>{k.value}</span>
              <span className="text-xs text-ink-muted">{k.note}</span>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-start gap-5">
          <div className="flex min-w-0 flex-[2_1_640px] flex-col gap-5">
            <DailyChart days={daily.data ?? []} className={card} />

            <section aria-labelledby="ov-runs" className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                <h2 id="ov-runs" className="m-0 flex items-center gap-2 text-base font-semibold">
                  {t('overview.activeRuns')}
                  <span className="rounded-full bg-[#DCE2EC] px-2 text-xs leading-5 font-semibold text-[var(--cb-blocked-fg)]">{active.length}</span>
                </h2>
                <Link to="/p/$projectId/runs" params={{ projectId }} className={link}>{t('overview.viewRuns')}</Link>
              </div>
              {active.length === 0 && <p className="m-0 px-5 py-6 text-center text-ink-muted">{t('overview.noActiveRuns')}</p>}
              {active.map((r) => {
                const rt = totalOf(r.counts)
                const re = rt - r.counts.untested
                const ms = milestones.find((m) => m.id === r.milestoneId)
                return (
                  <Link key={r.id} to="/p/$projectId/runs/$runId" params={{ projectId, runId: r.id }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-border-subtle px-5 py-3.5 text-ink no-underline hover:bg-surface-subtle sm:grid-cols-[minmax(0,1.3fr)_minmax(120px,1fr)_96px]">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{r.name}</span>
                      <span className="block truncate text-xs text-ink-subtle">{[ms?.name, t('milestones.testCount', { count: rt })].filter(Boolean).join(' · ')}</span>
                    </span>
                    <CountBar counts={r.counts} className="order-3 col-span-2 h-2 rounded-sm sm:order-none sm:col-span-1" />
                    <span className="text-right">
                      <span className="block font-bold">{t('milestones.executed', { pct: executedPct(r.counts) })}</span>
                      <span className="block text-xs text-ink-subtle">{re ? t('milestones.passedPct', { pct: pct(r.counts.passed, re) }) : t('milestones.notStartedLower')}</span>
                    </span>
                  </Link>
                )
              })}
              <p className="m-0 px-5 py-3 text-[13px] text-ink-muted">{t('overview.runsFoot', { draft: runs.filter((r) => r.status === 'draft').length, done: runs.filter((r) => r.status === 'done').length })}</p>
            </section>
          </div>

          <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-5">
            <section aria-labelledby="ov-ms" className={`${card} flex flex-col gap-3.5`}>
              <div className="flex items-center justify-between gap-3">
                <h2 id="ov-ms" className="m-0 text-base font-semibold">{t('overview.openMilestones')}</h2>
                <Link to="/p/$projectId/milestones" params={{ projectId }} className={link}>{t('overview.viewMilestones')}</Link>
              </div>
              {open.length === 0 && <p className="m-0 py-3 text-center text-ink-muted">{t('overview.noOpenMilestones')}</p>}
              {open.map((m) => {
                const list = runs.filter((r) => r.milestoneId === m.id)
                const counts = sumCounts(list)
                const mt = totalOf(counts)
                const me = mt - counts.untested
                const state = stateOf(m)
                return (
                  <Link key={m.id} to="/p/$projectId/milestones" params={{ projectId }} className="flex flex-col gap-2.5 rounded-[10px] border border-border p-3.5 text-ink no-underline hover:border-border-strong">
                    <span className="flex items-start justify-between gap-2.5">
                      <span className="flex min-w-0 items-center gap-2 font-semibold"><Flag size={16} aria-hidden="true" className="flex-none text-ink-muted" /><span className="truncate">{m.name}</span></span>
                      <StateChip state={state} label={t(`milestones.state.${state}`)} />
                    </span>
                    <span className="text-xs text-ink-subtle">{milestoneDates(t, m, state)}</span>
                    <CountBar counts={counts} className="h-1.5 rounded-[3px]" />
                    <span className="flex justify-between gap-2.5 text-[13px] text-ink-secondary">
                      <span>{list.length ? t('milestones.runCount', { count: list.length }) : t('milestones.noRunsYet')}</span>
                      <span className="font-semibold">{!list.length ? t('milestones.noRuns') : !me ? t('milestones.notStarted') : t('milestones.summary', { exec: pct(me, mt), passed: pct(counts.passed, me) })}</span>
                    </span>
                  </Link>
                )
              })}
            </section>

            <section aria-labelledby="ov-recent" className={card}>
              <h2 id="ov-recent" className="m-0 mb-1 text-base font-semibold">{t('overview.recent')}</h2>
              {recent.length === 0 && <p className="m-0 py-3 text-ink-muted">{t('overview.noRecent')}</p>}
              <ul className="m-0 flex list-none flex-col p-0">
                {recent.map(({ test, result }) => {
                  const p = personOf(result.who)
                  return (
                    <li key={test.id} className="flex items-start gap-3 border-t border-border-subtle py-3 first:border-t-0">
                      <span title={p.name} className="flex size-8 flex-none items-center justify-center rounded-full text-xs font-semibold" style={{ background: p.bg, color: p.fg }}>{p.key}</span>
                      <div className="min-w-0 flex-1">
                        <div>
                          <strong className="font-semibold">{p.name}</strong>{' '}
                          {t('overview.activityWhat', { test: `T-${test.number}`, status: t(`runs.testStatus.${result.status}`), run: runName(test.runId) })}
                        </div>
                        <Link to="/p/$projectId/runs/$runId" params={{ projectId, runId: test.runId }} search={{ test: test.id }} className="block truncate text-xs text-ink-subtle no-underline hover:text-accent">
                          {test.snapshot.title} · {relativeTime(t, result.at)}
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>
        </div>
      </main>

      <RunDialog
        open={dialog === 'run'} projectName={project.name} milestones={milestones} cases={cases} sections={sections}
        me={me} saving={createRun.isPending} failed={createRun.isError} onClose={() => { createRun.reset(); setDialog(null) }} onSave={() => undefined}
        onCreate={(input) => createRun.mutate(input, { onSuccess: () => setDialog(null), onError: (e) => console.error(e) })}
      />
      <MilestoneDialog
        open={dialog === 'milestone'} projectName={project.name} busy={createMilestone.isPending} failed={createMilestone.isError}
        onClose={() => { createMilestone.reset(); setDialog(null) }}
        onSubmit={(input) => createMilestone.mutate(input, { onSuccess: () => setDialog(null) })}
      />
    </ProjectShell>
  )
}
