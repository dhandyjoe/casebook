import { Link } from '@tanstack/react-router'
import { Check, Layers, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ProjectShell } from '@/components/layout/ProjectShell'
import { useAuth } from '@/features/auth/session'
import { useCaseData } from '@/features/cases/hooks'
import { useMilestones } from '@/features/milestones/hooks'
import { useUsers } from '@/features/people/useUsers'
import type { useProject } from '@/features/projects/hooks'
import { daysUntil, formatDate, relativeTime } from '@/lib/time'
import { useCreatePlan, useCreateRun, usePlans, useRuns } from './hooks'
import { PlanDialog } from './PlanDialog'
import { RunDialog } from './RunDialog'
import { MilestoneSection, PlanRow, RunFilterBar, RunRow, type Filter } from './RunRow'
import { initialsOf, sumCounts, totalOf, type RunStatus } from './domain'

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

/** Halaman Test Runs & Results untuk project Firestore: run dikelompokkan per milestone seperti design 04. */
export function ProjectRuns({ project }: { project: NonNullable<ReturnType<typeof useProject>> }) {
  const { t } = useTranslation()
  const me = useAuth((s) => s.session)!
  const { cases, sections } = useCaseData(project.id)
  const milestones = useMilestones(project.id).data ?? []
  const runs = useRuns(project.id).data ?? []
  const plans = usePlans(project.id).data ?? []
  const users = useUsers(runs.length > 0).data
  const create = useCreateRun(project.id)
  const createPlan = useCreatePlan(project.id)
  const [open, setOpen] = useState<'run' | 'plan' | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const count = (s: RunStatus) => runs.filter((r) => r.status === s).length
  const initials = (uid: string) => initialsOf(users?.find((u) => u.uid === uid)?.name ?? '')
  const closedIds = new Set(milestones.filter((m) => m.isCompleted).map((m) => m.id))
  // Run Done milik milestone yang sudah selesai pindah ke daftar arsip di bawah.
  const past = runs.filter((r) => r.status === 'done' && r.milestoneId && closedIds.has(r.milestoneId))
  const current = runs.filter((r) => !past.includes(r))
  const visible = current.filter((r) => filter === 'all' || r.status === filter)
  const groups = [...milestones.filter((m) => !m.isCompleted), null]
    .map((m) => {
      const key = m?.id ?? null
      return { m, all: current.filter((r) => r.milestoneId === key), mine: visible.filter((r) => r.milestoneId === key) }
    })
    // Plan kosong tetap tampil di "All" supaya run bisa ditambahkan ke dalamnya.
    .map((g) => ({ ...g, plans: plans.filter((p) => p.milestoneId === g.m?.id && (g.mine.some((r) => r.planId === p.id) || filter === 'all')) }))
    .filter((g) => g.mine.length > 0 || g.plans.length > 0)
  const withRuns = new Set(runs.map((r) => r.milestoneId).filter(Boolean)).size

  return (
    <ProjectShell project={project} active="runs">
      <main className="flex w-full flex-col gap-5 px-8 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="m-0 text-2xl font-bold tracking-tight">{t('runs.list.title')}</h1>
            <p className="mt-1 mb-0 text-ink-muted">
              {t('runs.list.subtitle', { active: count('active'), draft: count('draft'), done: count('done'), milestones: t('runs.list.milestones', { count: withRuns }) })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-haspopup="dialog" onClick={() => setOpen('plan')} className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface px-3.5 font-semibold text-ink">
              <Layers size={16} aria-hidden="true" />{t('runs.list.addPlan')}
            </button>
            <button type="button" aria-haspopup="dialog" onClick={() => setOpen('run')} className="flex h-10 cursor-pointer items-center gap-2 rounded-md border-0 bg-accent px-4 font-semibold text-white hover:bg-accent-hover">
              <Plus size={16} strokeWidth={2.2} aria-hidden="true" />{t('runs.list.addRun')}
            </button>
          </div>
        </div>

        <RunFilterBar filter={filter} onChange={setFilter} total={runs.length} count={count} />

        {groups.map(({ m, all, mine, plans: inGroup }) => {
          const counts = sumCounts(all)
          const days = m ? daysUntil(m.dueOn) : 0
          const due = m ? [
            t('runs.list.due', { date: formatDate(m.dueOn) }),
            days === 0 ? t('runs.list.dueToday') : days > 0 && days <= 30 ? t('runs.list.dueIn', { count: days }) : days < 0 ? t('runs.list.overdue', { count: -days }) : '',
          ].filter(Boolean).join(' · ') : ''
          const tests = t('runs.tests', { count: totalOf(counts) })
          const runCount = t('runs.count', { count: all.length })
          return (
            <MilestoneSection
              key={m?.id ?? 'none'} name={m?.name ?? t('runs.list.noMilestone')} counts={counts}
              meta={m ? t('runs.list.milestoneMeta', { due, tests, runs: runCount }) : t('runs.list.noMilestoneMeta', { tests, runs: runCount })}
            >
              {inGroup.flatMap((p) => [
                <PlanRow key={p.id} name={p.name} runs={all.filter((r) => r.planId === p.id)} />,
                ...mine.filter((r) => r.planId === p.id).map((r) => <RunRow key={r.id} projectId={project.id} run={r} inPlan people={r.assignee ? [initials(r.assignee)] : []} />),
              ])}
              {mine.filter((r) => !inGroup.some((p) => p.id === r.planId)).map((r) => <RunRow key={r.id} projectId={project.id} run={r} people={r.assignee ? [initials(r.assignee)] : []} />)}
            </MilestoneSection>
          )
        })}

        {groups.length === 0 && (
          <div className="rounded-xl border border-dashed border-border-strong px-5 py-10 text-center text-ink-muted">
            {runs.length === 0 ? (
              <>
                <h2 className="m-0 mb-1 text-lg font-bold text-ink">{t('runs.empty.title')}</h2>
                <p className="m-0">{t('runs.empty.body')}</p>
              </>
            ) : t('runs.list.noRuns')}
          </div>
        )}

        {(filter === 'all' || filter === 'done') && (
          <section aria-labelledby="past-runs" className="flex flex-col gap-2">
            <h2 id="past-runs" className="m-0 text-[15px] font-semibold">{t('runs.list.past')}</h2>
            <div className="rounded-xl border border-border bg-surface">
              {past.length === 0 && <p className="m-0 px-5 py-4 text-ink-muted">{t('runs.list.pastEmpty')}</p>}
              {past.map((r) => {
                const exec = totalOf(r.counts) - r.counts.untested
                return (
                  <Link key={r.id} to="/p/$projectId/runs/$runId" params={{ projectId: project.id, runId: r.id }} className="flex flex-wrap items-center gap-3 border-b border-border-subtle px-5 py-3 text-ink no-underline last:border-b-0 hover:bg-surface-subtle">
                    <span className="flex size-5 items-center justify-center rounded-full bg-[var(--cb-run-done-bg)] text-[var(--cb-run-done-fg)]"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>
                    <span className="flex-[1_1_220px] font-medium">{r.name}</span>
                    <span className="text-[13px] text-ink-muted">{t('runs.list.pastWhen', { when: relativeTime(t, r.doneAt ?? r.createdAt) })}</span>
                    <span className="min-w-24 text-right text-[13px] font-semibold">{t('runs.list.passed', { pct: pct(r.counts.passed, exec) })}</span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </main>

      <RunDialog
        open={open === 'run'} projectName={project.name} milestones={milestones} plans={plans} cases={cases} sections={sections}
        me={me} saving={create.isPending} failed={create.isError} onClose={() => { create.reset(); setOpen(null) }} onSave={() => undefined}
        onCreate={(input) => create.mutate(input, { onSuccess: () => setOpen(null), onError: (e) => console.error(e) })}
      />
      <PlanDialog
        open={open === 'plan'} projectName={project.name} milestones={milestones.filter((m) => !m.isCompleted)} onClose={() => setOpen(null)}
        onCreate={(input) => createPlan.mutate(input, { onSuccess: () => { setFilter('all'); setOpen(null) }, onError: (e) => console.error(e) })}
      />
    </ProjectShell>
  )
}
