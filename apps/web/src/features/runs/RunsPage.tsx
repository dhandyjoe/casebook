import { useParams } from '@tanstack/react-router'
import { Check, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ProjectShell } from '@/components/layout/ProjectShell'
import { useAuth } from '@/features/auth/session'
import { useCasesStore } from '@/features/cases/store'
import { useProject } from '@/features/projects/hooks'
import { daysUntil, formatDate, relativeTime } from '@/lib/time'
import { ProjectRuns } from './ProjectRuns'
import { MilestoneSection, PlanRow, RunFilterBar, RunRow, type Filter } from './RunRow'
import { RunDialog } from './RunDialog'
import { CountBar, RunStatusChip } from './status'
import { executedPct, initialsOf, planStatus, sumCounts, totalOf, type Run, type RunStatus } from './domain'
import { PAST_RUNS_TOTAL } from './seed'
import { useRunsStore } from './store'
import { useMilestones } from '@/features/milestones/hooks'

const ROUTE = '/p/$projectId/runs' as const


export function RunsPage() {
  const { t } = useTranslation()
  const { projectId } = useParams({ from: ROUTE })
  const project = useProject(projectId)
  const session = useAuth((s) => s.session)!
  const store = useRunsStore()
  const { plans, runs, tests, pastRuns } = store
  const milestones = useMilestones(projectId).data ?? []
  const cases = useCasesStore((s) => s.cases)
  const sections = useCasesStore((s) => s.sections)

  const [filter, setFilter] = useState<Filter>('all')
  const [dialog, setDialog] = useState<'run' | null>(null)

  const visible = runs.filter((r) => filter === 'all' || r.status === filter)
  const count = (s: RunStatus) => runs.filter((r) => r.status === s).length

  // null = run tanpa milestone; tampil sebagai grup terakhir.
  const groups = [...milestones, null]
    .map((m) => {
      const all = runs.filter((r) => r.milestoneId === (m?.id ?? null))
      const mine = visible.filter((r) => r.milestoneId === (m?.id ?? null))
      const rows: ({ kind: 'plan'; id: string; name: string; runs: Run[] } | { kind: 'run'; run: Run; inPlan: boolean })[] = []
      for (const plan of m ? plans.filter((p) => p.milestoneId === m.id) : []) {
        const planAll = all.filter((r) => r.planId === plan.id)
        const planMine = mine.filter((r) => r.planId === plan.id)
        if (planMine.length === 0 && !(planAll.length === 0 && filter === 'all')) continue
        rows.push({ kind: 'plan', id: plan.id, name: plan.name, runs: planAll })
        planMine.forEach((run) => rows.push({ kind: 'run', run, inPlan: true }))
      }
      mine.filter((r) => !plans.some((p) => p.id === r.planId)).forEach((run) => rows.push({ kind: 'run', run, inPlan: false }))
      return { milestone: m, all, rows, counts: sumCounts(all) }
    })
    .filter((g) => g.rows.length > 0)

  const withRuns = milestones.filter((m) => runs.some((r) => r.milestoneId === m.id)).length

  if (!project) return <p className="p-6">{t('cases.notFound')}</p>
  if (projectId !== 'store') return <ProjectRuns project={project} />

  return (
    <ProjectShell project={project} active="runs">
      <main className="flex w-full flex-col gap-5 px-8 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="m-0 text-2xl font-bold tracking-tight">{t('runs.list.title')}</h1>
            <p className="mt-1 text-ink-muted">
              {t('runs.list.subtitle', { active: count('active'), draft: count('draft'), done: count('done'), milestones: t('runs.list.milestones', { count: withRuns }) })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-haspopup="dialog" onClick={() => setDialog('run')} className="flex h-10 cursor-pointer items-center gap-2 rounded-md border-0 bg-accent px-4 font-semibold text-white hover:bg-accent-hover">
              <Plus size={16} strokeWidth={2.2} aria-hidden="true" />{t('runs.list.addRun')}
            </button>
          </div>
        </div>

        <RunFilterBar filter={filter} onChange={setFilter} total={runs.length} count={count} />

        {groups.map(({ milestone: m, all, rows, counts }) => {
          const total = totalOf(counts)
          const exec = total - counts.untested
          const days = m ? daysUntil(m.dueOn) : 0
          const due = m ? [
            t('runs.list.due', { date: formatDate(m.dueOn) }),
            days === 0 ? t('runs.list.dueToday') : days > 0 && days <= 30 ? t('runs.list.dueIn', { count: days }) : days < 0 ? t('runs.list.overdue', { count: -days }) : '',
          ].filter(Boolean).join(' · ') : ''
          const name = m?.name ?? t('runs.list.noMilestone')
          const testsLabel = t('runs.tests', { count: total })
          const runsLabel = t('runs.count', { count: all.length })
          const meta = m ? t('runs.list.milestoneMeta', { due, tests: testsLabel, runs: runsLabel }) : t('runs.list.noMilestoneMeta', { tests: testsLabel, runs: runsLabel })
          return (
            <MilestoneSection key={m?.id ?? 'none'} name={name} meta={meta} counts={counts}>
              {rows.map((row) => {
                if (row.kind === 'plan') return <PlanRow key={row.id} name={row.name} runs={row.runs} />
                const mine = tests[row.run.id] ?? []
                return <RunRow key={row.run.id} projectId={projectId} run={row.run} inPlan={row.inPlan} people={[...new Set(mine.map((x) => x.assignee))].slice(0, 3)} sectionCount={new Set(mine.map((x) => x.sectionId)).size} />
              })}
            </MilestoneSection>
          )
        })}

        {groups.length === 0 && <div className="rounded-xl border border-dashed border-border-strong px-5 py-10 text-center text-ink-muted">{t('runs.list.noRuns')}</div>}

        {(filter === 'all' || filter === 'done') && (
          <section aria-labelledby="past-runs" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 id="past-runs" className="m-0 text-[15px] font-semibold">{t('runs.list.past')}</h2>
              <a href="#" className="text-[13px] font-semibold text-accent no-underline">{t('runs.list.pastAll', { count: PAST_RUNS_TOTAL })}</a>
            </div>
            <div className="rounded-xl border border-border bg-surface">
              {pastRuns.map((p) => (
                <a key={p.id} href="#" className="flex flex-wrap items-center gap-3 border-b border-border-subtle px-5 py-3 text-ink no-underline last:border-b-0">
                  <span className="flex size-5 items-center justify-center rounded-full bg-[var(--cb-run-done-bg)] text-[var(--cb-run-done-fg)]"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>
                  <span className="flex-[1_1_220px] font-medium">{p.name}</span>
                  <span className="text-[13px] text-ink-muted">{t('runs.list.pastWhen', { when: relativeTime(t, p.doneAt) })}</span>
                  <span className="min-w-24 text-right text-[13px] font-semibold">{t('runs.list.passed', { pct: p.passPct })}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>

      <RunDialog
        open={dialog === 'run'} projectName={project.name} milestones={milestones} cases={cases} sections={sections}
        me={{ uid: session.uid, name: session.name }} onClose={() => setDialog(null)} onSave={() => undefined}
        onCreate={(input, assigneeName) => { store.createRun({ ...input, assignee: initialsOf(assigneeName) }, session.initials); setFilter('all'); setDialog(null) }}
      />
    </ProjectShell>
  )
}
