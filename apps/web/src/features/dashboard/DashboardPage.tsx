import { Link } from '@tanstack/react-router'
import { Pin, PinOff, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppHeader } from '@/components/layout/AppHeader'
import { useAuth } from '@/features/auth/session'
import { initialsOf } from '@/features/runs/domain'
import { useUsers } from '@/features/people/useUsers'
import { personOf } from '@/features/people/data'
import { relativeTime } from '@/lib/time'
import { useProjects, usePinned } from '@/features/projects/hooks'
import { ProjectDialog } from '@/features/projects/ProjectDialog'
import { REVIEWS_SHOWN } from './api'
import { useDashboard } from './hooks'
import { StatusBar, STATUS_DOT, STATUS_KEYS } from './StatusBar'

const card = 'rounded-xl border border-border bg-surface'
const pinButton =
  'relative z-10 flex size-8 flex-none cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent text-ink-muted hover:border-border-strong hover:text-ink'

function greetingKey(hour: number) {
  return hour < 12 ? 'dashboard.greeting_morning' : hour < 18 ? 'dashboard.greeting_afternoon' : 'dashboard.greeting_evening'
}

export function DashboardPage() {
  const { t } = useTranslation()
  const session = useAuth((s) => s.session)!
  const { data } = useProjects()
  const { failed, toggle } = usePinned()
  const projects = data ?? []
  const [creating, setCreating] = useState(false)
  const [allReviews, setAllReviews] = useState(false)
  const dash = useDashboard(data)
  const users = useUsers(!!dash.data?.activity.length).data
  const stats = dash.data?.stats
  const review = dash.data?.review ?? []
  const activity = dash.data?.activity ?? []
  const now = new Date()
  const date = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)
  const pinned = projects.filter((p) => p.pinned)
  const others = projects.filter((p) => !p.pinned)

  return (
    <div className="min-h-screen bg-page">
      <AppHeader />
      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 pt-8 pb-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="m-0 text-[26px] font-bold tracking-tight">{t(greetingKey(now.getHours()), { name: session.name.split(' ')[0] })}</h1>
            <p className="mt-1.5 text-ink-muted">
              {t('dashboard.summary', { date })}
            </p>
          </div>
          <button type="button" onClick={() => setCreating(true)} className="flex h-10 cursor-pointer items-center gap-2 rounded-md border-0 bg-accent px-4 font-semibold text-white hover:bg-accent-hover">
            <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
            {t('dashboard.newProject')}
          </button>
        </div>

        <div className="flex flex-wrap items-start gap-6">
          <section aria-labelledby="h-projects" className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="h-projects" className="m-0 text-base font-semibold">{t('dashboard.projects')}</h2>
              <ul className="m-0 flex list-none flex-wrap gap-3.5 p-0 text-xs text-ink-muted">
                {STATUS_KEYS.map((k, i) => (
                  <li key={k} className="flex items-center gap-1.5">
                    <span className={`size-2.5 rounded-xs ${STATUS_DOT[i]}`} />
                    {t(`dashboard.status.${k}`)}
                  </li>
                ))}
              </ul>
            </div>

            {failed && <p role="alert" className="m-0 text-danger-text">{t('dashboard.pinError')}</p>}
            {projects.length === 0 && (
              <div className={`${card} flex flex-col items-center gap-3 p-8 text-center text-ink-muted`}>
                <p className="m-0">{t('dashboard.noProjects')}</p>
                <button type="button" onClick={() => setCreating(true)} className="h-10 cursor-pointer rounded-md border border-border-strong bg-surface px-4 font-semibold text-ink">{t('dashboard.newProject')}</button>
              </div>
            )}
            {projects.length > 0 && pinned.length === 0 && <p className={`${card} m-0 p-8 text-center text-ink-muted`}>{t('dashboard.noPinned')}</p>}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
              {pinned.map((p) => {
                const s = stats?.[p.id] ?? { cases: 0, activeRuns: 0, segs: [0, 0, 0, 0, 100] as const }
                const executed = Math.round(100 - s.segs[4])
                const passed = executed ? Math.round((s.segs[0] / (100 - s.segs[4])) * 100) : 0
                const active = s.activeRuns > 0
                return (
                  <div key={p.id} className={`${card} relative flex flex-col gap-3.5 p-5`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-base font-semibold">
                          <span className="size-2.5 flex-none rounded-xs" style={{ background: p.color }} />
                          <Link to="/p/$projectId/cases" params={{ projectId: p.id }} className="text-ink no-underline after:absolute after:inset-0 after:rounded-xl">{p.name}</Link>
                        </div>
                        <div className="mt-1 text-[13px] text-ink-muted">{p.description}</div>
                      </div>
                      <div className="-mt-1 -mr-2 flex flex-none items-center gap-1">
                        <span
                          className={`rounded-full px-2.5 py-[3px] text-xs font-semibold ${
                            active ? 'bg-[var(--cb-run-active-bg)] text-[var(--cb-run-active-fg)]' : 'bg-[var(--cb-draft-bg)] text-blocked-fg'
                          }`}
                        >
                          {t('dashboard.activeRuns', { count: s.activeRuns })}
                        </span>
                        <button type="button" aria-label={t('dashboard.unpin', { name: p.name })} onClick={() => toggle(p)} className={pinButton}>
                          <PinOff size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <StatusBar segs={[...s.segs]} />
                    <div className="flex justify-between gap-3 text-[13px] text-ink-muted">
                      <span>{t('dashboard.cases', { count: s.cases })}</span>
                      <span className="font-medium text-ink-secondary">{executed ? t('dashboard.progress', { executed, passed }) : t('dashboard.noExecuted')}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {others.length > 0 && (
              <section aria-labelledby="h-other" className={`${card} p-5`}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <h2 id="h-other" className="m-0 text-base font-semibold">{t('dashboard.otherProjects')}</h2>
                  <span className="text-xs text-ink-subtle">{others.length}</span>
                </div>
                <ul className="m-0 flex list-none flex-col p-0">
                  {others.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 border-t border-border-subtle first:border-t-0">
                      <Link to="/p/$projectId/cases" params={{ projectId: p.id }} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-ink no-underline">
                        <span className="size-2.5 flex-none rounded-xs" style={{ background: p.color }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{p.name}</span>
                          <span className="block truncate text-xs text-ink-subtle">{p.description}</span>
                        </span>
                        <span className="flex-none text-[13px] text-ink-muted">{stats?.[p.id] ? t('dashboard.cases', { count: stats[p.id]!.cases }) : ''}</span>
                      </Link>
                      <button type="button" aria-label={t('dashboard.pin', { name: p.name })} onClick={() => toggle(p)} className={pinButton}>
                        <Pin size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </section>

          <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
            <section aria-labelledby="h-review" className={`${card} flex flex-col gap-1 p-5`}>
              <div className="mb-2 flex items-center justify-between">
                <h2 id="h-review" className="m-0 text-base font-semibold">{t('dashboard.awaitingReview')}</h2>
                {review.length > 0 && <span className="text-xs text-ink-subtle">{review.length}</span>}
              </div>
              {dash.isError && <p role="alert" className="m-0 text-danger-text">{t('dashboard.summaryError')}</p>}
              {!dash.isError && review.length === 0 && <p className="m-0 text-ink-muted">{t('dashboard.noReview')}</p>}
              <ul className={`m-0 flex list-none flex-col p-0 ${allReviews ? 'max-h-[340px] overflow-y-auto' : ''}`}>
                {(allReviews ? review : review.slice(0, REVIEWS_SHOWN)).map((r) => (
                  <li key={`${r.projectId}/${r.testCase.id}`} className="flex items-center gap-3 border-t border-border-subtle py-2.5 first:border-t-0">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{r.testCase.title}</div>
                      <div className="truncate text-xs text-ink-subtle">C{r.testCase.number} · {r.projectName} · {relativeTime(t, r.submittedAt)}</div>
                    </div>
                    <Link to="/p/$projectId/cases" params={{ projectId: r.projectId }} search={{ status: 'under_review', section: r.testCase.sectionId, case: r.testCase.id }} className="flex-none rounded-md border border-border-strong px-3 py-1 text-[13px] font-semibold text-ink no-underline hover:bg-surface-subtle">{t('dashboard.review')}</Link>
                  </li>
                ))}
              </ul>
              {!allReviews && review.length > REVIEWS_SHOWN && (
                <button type="button" onClick={() => setAllReviews(true)} className="mt-2 h-9 cursor-pointer rounded-md border border-border-strong bg-surface font-semibold text-ink hover:bg-surface-subtle">
                  {t('dashboard.viewMore', { count: review.length - REVIEWS_SHOWN })}
                </button>
              )}
            </section>

            <section aria-labelledby="h-activity" className={`${card} p-5`}>
              <h2 id="h-activity" className="m-0 mb-3 text-base font-semibold">{t('dashboard.recentActivity')}</h2>
              {!dash.isError && activity.length === 0 && <p className="m-0 text-ink-muted">{t('dashboard.noActivity')}</p>}
              {/* ±6 baris terlihat; sisanya (maks. 20) di-scroll di dalam kartu. */}
              <ul className="m-0 flex max-h-[400px] list-none flex-col overflow-y-auto p-0">
                {activity.map((a) => {
                  const name = a.kind === 'result' ? (users?.find((u) => u.uid === a.who)?.name ?? '') : a.who
                  const p = personOf(initialsOf(name))
                  return (
                    <li key={a.id} className="flex items-start gap-3 border-t border-border-subtle py-3 first:border-t-0">
                      <span title={name} className="flex size-8 flex-none items-center justify-center rounded-full text-xs font-semibold" style={{ background: p.bg, color: p.fg }}>{p.key}</span>
                      <div className="min-w-0 flex-1">
                        <div>
                          <strong className="font-semibold">{name}</strong>{' '}
                          {a.kind === 'result'
                            ? t('overview.activityWhat', { test: `T-${a.test}`, status: t(`runs.testStatus.${a.status}`), run: a.runName })
                            : t(`cases.history.${a.action}`)}
                        </div>
                        <div className="truncate text-xs text-ink-subtle">{a.title} · {a.projectName} · {relativeTime(t, a.at)}</div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          </aside>
        </div>
      </main>
      <ProjectDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
