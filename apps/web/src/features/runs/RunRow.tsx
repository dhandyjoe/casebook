import { Link } from '@tanstack/react-router'
import { Flag, Layers } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { personOf } from '@/features/people/data'
import { relativeTime } from '@/lib/time'
import { CountBar, RunStatusChip } from './status'
import { executedPct, planStatus, sumCounts, totalOf, type Counts, type Run, type RunStatus } from './domain'

/** Kepala milestone (nama, meta, bar progres) di atas daftar run; `name` null = run tanpa milestone. */
export function MilestoneSection({ name, meta, counts, children }: { name: string; meta: string; counts: Counts; children: ReactNode }) {
  const { t } = useTranslation()
  const exec = totalOf(counts) - counts.untested
  const pct = totalOf(counts) ? Math.round((exec / totalOf(counts)) * 100) : 0
  return (
    <section aria-label={name} className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-5 py-[18px]">
        <div className="min-w-0 flex-[1_1_260px]">
          <div className="flex items-center gap-2 text-ink-muted">
            <Flag size={14} aria-hidden="true" />
            <span className="text-xs font-semibold tracking-[0.05em] uppercase">{t('runs.list.milestone')}</span>
          </div>
          <h2 className="mt-1 mb-0 text-lg font-bold">{name}</h2>
          <p className="mt-0.5 text-ink-muted">{meta}</p>
        </div>
        <div className="flex flex-[1_1_320px] flex-col gap-2">
          <CountBar counts={counts} className="h-2.5 rounded-[5px]" />
          <div className="flex justify-between text-[13px] text-ink-muted">
            <span>{t('runs.list.executed', { pct })}</span>
            <span className="font-semibold text-ink">{exec ? t('runs.list.passed', { pct: Math.round((counts.passed / exec) * 100) }) : t('runs.list.noResults')}</span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto"><div className="min-w-[860px]">{children}</div></div>
    </section>
  )
}

/** Satu baris run; `people` berisi inisial assignee, `sectionCount` hanya bila daftar test diketahui. */
export function RunRow({ projectId, run, people, sectionCount, inPlan = false }: { projectId: string; run: Run; people: string[]; sectionCount?: number; inPlan?: boolean }) {
  const { t } = useTranslation()
  const total = totalOf(run.counts)
  const exec = total - run.counts.untested
  const fresh = Date.now() - new Date(run.createdAt).getTime() < 5 * 60_000
  const cases = t('runs.approvedCases', { count: total })
  const meta = run.description
    ? run.description.split('\n')[0]
    : run.status === 'draft'
      ? t('runs.list.metaDraft', { cases })
      : sectionCount === undefined
        ? t('runs.list.metaCreatedShort', { when: relativeTime(t, run.createdAt), cases })
        : t('runs.list.metaCreated', { when: relativeTime(t, run.createdAt), cases, where: t('runs.list.sections', { count: sectionCount }) })

  return (
    <Link
      to="/p/$projectId/runs/$runId" params={{ projectId, runId: run.id }}
      className={`grid grid-cols-[minmax(260px,1.4fr)_110px_minmax(180px,1fr)_56px_96px] items-center gap-4 border-b border-border-subtle py-3.5 pr-5 text-ink no-underline hover:bg-surface-subtle ${fresh ? 'bg-accent-tint-3' : 'bg-surface'}`}
      style={{ paddingLeft: inPlan ? 46 : 20 }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 font-semibold">{run.name}<RunStatusChip status={run.status} /></div>
        <div className="mt-0.5 truncate text-xs text-ink-subtle">{meta}</div>
      </div>
      <div className="flex">
        {people.map((k) => {
          const p = personOf(k)
          return <span key={k} title={p.name} className="-mr-1.5 flex size-7 items-center justify-center rounded-full border-2 border-surface text-[11px] font-semibold" style={{ background: p.bg, color: p.fg }}>{k}</span>
        })}
      </div>
      <CountBar counts={run.counts} />
      <span className="text-right font-bold">{total ? Math.round((exec / total) * 100) : 0}%</span>
      <span className="text-right text-[13px] text-ink-muted">{exec} / {total}</span>
    </Link>
  )
}

export type Filter = 'all' | RunStatus

/** Tab filter status run (design.md Test Runs). */
export function RunFilterBar({ filter, onChange, total, count }: { filter: Filter; onChange: (f: Filter) => void; total: number; count: (s: RunStatus) => number }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label={t('runs.list.filterLabel')} className="flex gap-1 rounded-lg bg-track p-1">
        {(['all', 'active', 'draft', 'done'] as const).map((key) => {
          const on = filter === key
          return (
            <button
              key={key} type="button" aria-pressed={on} onClick={() => onChange(key)}
              className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-[7px] border-0 px-3.5 text-ink ${on ? 'bg-surface font-semibold shadow-segment' : 'bg-transparent font-medium'}`}
            >
              {key === 'all' ? t('runs.list.tabAll') : t(`runs.status.${key}`)}
              <span className="text-xs text-ink-muted">{key === 'all' ? total : count(key)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Baris kepala test plan di dalam milestone; progres dihitung dari run-nya. */
export function PlanRow({ name, runs }: { name: string; runs: Run[] }) {
  const { t } = useTranslation()
  const counts = sumCounts(runs)
  const total = totalOf(counts)
  return (
    <div className="flex items-center gap-2.5 border-b border-border-subtle bg-surface-subtle px-5 py-3">
      <Layers size={16} aria-hidden="true" className="flex-none text-ink-muted" />
      <span className="font-semibold">{name}</span>
      <span className="rounded-full bg-[var(--cb-draft-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--cb-blocked-fg)]">{t('runs.list.plan', { runs: t('runs.count', { count: runs.length }) })}</span>
      <RunStatusChip status={planStatus(runs)} />
      <span className="ml-auto text-[13px] text-ink-muted">{runs.length ? t('runs.list.planMeta', { tests: t('runs.tests', { count: total }), pct: executedPct(counts) }) : t('runs.list.planEmpty')}</span>
    </div>
  )
}
