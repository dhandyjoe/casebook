import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { Download } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ProjectShell } from '@/components/layout/ProjectShell'
import { useProject } from '@/features/projects/hooks'
import { STATUS_ORDER } from '@/features/runs/domain'
import { CountBar, TestStatusChip } from '@/features/runs/status'
import { formatDate, formatDateTime } from '@/lib/time'
import { assigneeRows, failedBlocked, kpisOf, projectRows, runRows, type Row, type Template } from './domain'
import { useReportData } from './hooks'

const card = 'rounded-xl border border-border bg-surface p-5'
const SUMMARIES: Template[] = ['project', 'milestone', 'run']
const ghost = 'flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border-strong bg-surface px-3.5 font-semibold text-ink'

export function ReportsPage() {
  const { t } = useTranslation()
  const { projectId } = useParams({ from: '/p/$projectId/reports' })
  const { template, id } = useSearch({ from: '/p/$projectId/reports' })
  const navigate = useNavigate({ from: '/p/$projectId/reports' })
  const project = useProject(projectId)
  const data = useReportData(projectId, template, id)
  const [exporting, setExporting] = useState<'idle' | 'busy' | 'failed'>('idle')

  if (!project) return <p className="p-6">{t('cases.notFound')}</p>

  const pick = (next: Template, nextId?: string) => void navigate({ search: { template: next, id: nextId } })
  const scope = template === 'milestone' ? data.scopeMilestone : template === 'run' ? data.scopeRun : undefined
  const missing = template !== 'project' && !scope
  const rows: Row[] =
    template === 'project' ? projectRows(data.milestones, data.runs)
    : template === 'milestone' ? runRows(data.runs)
    : assigneeRows(data.tests)
  const counts = rows.reduce((acc, r) => Object.fromEntries(STATUS_ORDER.map((k) => [k, acc[k] + r.counts[k]])) as typeof acc, { passed: 0, failed: 0, blocked: 0, retest: 0, untested: 0 })
  const k = kpisOf(counts)
  const issues = failedBlocked(data.tests, data.runs)
  const title = template === 'project' ? project.name : (scope?.name ?? '')
  const detail = (r: Row) => [r.runs === undefined ? '' : t('runs.count', { count: r.runs }), t('reports.rowDetail', r.counts)].filter(Boolean).join(' · ')
  const fmt = (n: number) => n.toLocaleString('en-US')

  const kpiCards = [
    { label: t('reports.kpiTotal'), value: fmt(k.total), note: t('reports.kpiTotalNote', { runs: t('runs.count', { count: data.runs.length }) }) },
    { label: t('reports.kpiExecuted'), value: `${k.executedPct}%`, note: t('reports.kpiExecutedNote', { done: fmt(k.executed), total: fmt(k.total) }) },
    { label: t('reports.kpiPass'), value: `${k.passRate}%`, note: t('reports.kpiPassNote', { passed: fmt(counts.passed), done: fmt(k.executed) }), cls: 'text-passed-fg' },
    { label: t('reports.kpiOpen'), value: fmt(k.failed + k.blocked), note: t('reports.kpiOpenNote', { failed: k.failed, blocked: k.blocked }), cls: 'text-danger-text' },
  ]
  const subtitle = [t('reports.asOf', { when: formatDateTime(data.asOf.toISOString()) }), t('runs.count', { count: data.runs.length }), template === 'milestone' && data.scopeMilestone ? t('milestones.due', { date: formatDate(data.scopeMilestone.dueOn) }) : ''].filter(Boolean).join(' · ')

  // @react-pdf/renderer berat: dimuat hanya saat tombol ditekan (architecture.md: PDF dibuat di browser).
  const exportPdf = async () => {
    setExporting('busy')
    try {
      const [{ pdf }, { ReportPdf }] = await Promise.all([import('@react-pdf/renderer'), import('./ReportPdf')])
      const blob = await pdf(
        <ReportPdf
          label={t(`reports.template.${template}`)} title={title} subtitle={subtitle} rows={rows} issues={template === 'project' ? null : issues}
          text={{
            kpis: kpiCards, statusTitle: t(`reports.statusBy.${template}`), noMilestone: t('reports.noMilestone'), failedBlocked: t('reports.failedBlocked'),
            noIssues: t('reports.noIssues'), page: t('reports.page'),
            statusLabels: Object.fromEntries(STATUS_ORDER.map((s) => [s, t(`runs.testStatus.${s}`)])) as Record<(typeof STATUS_ORDER)[number], string>,
            cols: { id: t('reports.col.id'), title: t('reports.col.title'), run: t('reports.col.run'), status: t('reports.col.status'), note: t('reports.col.note'), who: t('reports.col.tester') },
          }}
        />,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `casebook-${template}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setExporting('idle')
    } catch {
      setExporting('failed')
    }
  }

  const item = (on: boolean) =>
    `flex items-center justify-between rounded-md border-0 p-2 text-left ${on ? 'bg-surface font-semibold text-header shadow-[inset_3px_0_0_var(--cb-header)]' : 'bg-transparent text-ink'}`

  return (
    <ProjectShell project={project} active="reports">
      <div className="flex flex-wrap items-start">
        <aside aria-label={t('reports.templates')} className="box-border flex flex-[1_1_240px] flex-col gap-1 border-r border-sidebar-line bg-sidebar px-4 py-5 lg:max-w-[260px]">
          <span className="px-2 pb-1.5 text-xs font-semibold tracking-[0.06em] text-sidebar-text uppercase">{t('reports.summary')}</span>
          {SUMMARIES.map((s) => (
            <button key={s} type="button" aria-current={template === s ? 'true' : undefined} onClick={() => pick(s)} className={`${item(template === s)} cursor-pointer`}>
              {t(`reports.template.${s}`)}
            </button>
          ))}
        </aside>

        <main className="box-border flex min-w-0 flex-[999_1_620px] flex-col gap-5 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[13px] text-ink-muted">{t(`reports.template.${template}`)}</div>
              <h1 className="m-0 mt-0.5 text-2xl font-bold tracking-tight">{missing ? t('reports.notFound') : title}</h1>
              <p className="m-0 mt-1 text-ink-muted">{subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {template === 'milestone' && (
                <select aria-label={t('reports.pickMilestone')} value={scope?.id ?? ''} onChange={(e) => pick('milestone', e.target.value)} className="h-10 rounded-lg border border-border-strong bg-surface px-3">
                  {data.milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}
              {template === 'run' && (
                <select aria-label={t('reports.pickRun')} value={scope?.id ?? ''} onChange={(e) => pick('run', e.target.value)} className="h-10 max-w-64 rounded-lg border border-border-strong bg-surface px-3">
                  {data.allRuns.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              )}
              <button type="button" onClick={() => void exportPdf()} disabled={missing || exporting === 'busy'} className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border-0 bg-accent px-4 font-semibold text-white disabled:cursor-not-allowed disabled:bg-accent-disabled">
                <Download size={16} aria-hidden="true" />{exporting === 'busy' ? t('reports.exporting') : t('reports.exportPdf')}
              </button>
            </div>
          </div>
          <p role="status" className="m-0 -mt-3 min-h-5 text-[13px] text-ink-muted">{exporting === 'failed' ? t('reports.exportError') : ''}</p>

          {data.error ? (
            <div role="alert" className={`${card} flex flex-col items-center gap-3 text-center text-ink-muted`}>
              <p className="m-0">{t('reports.loadError')}</p>
              <button type="button" onClick={data.retry} className={ghost}>{t('dashboard.retry')}</button>
            </div>
          ) : data.loading ? (
            <p className="m-0 text-ink-muted">{t('reports.loading')}</p>
          ) : missing ? (
            <p className={`${card} m-0 text-ink-muted`}>{t('reports.notFoundBody')}</p>
          ) : rows.length === 0 ? (
            <div className={`${card} flex flex-col items-start gap-2`}>
              <h2 className="m-0 text-base font-semibold">{t('reports.emptyTitle')}</h2>
              <p className="m-0 text-ink-muted">{t('reports.emptyBody')}</p>
              <Link to="/p/$projectId/runs" params={{ projectId }} className="text-[13px] font-semibold text-accent no-underline">{t('overview.viewRuns')}</Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
                {kpiCards.map((c) => (
                  <div key={c.label} className={card}>
                    <div className="text-[13px] text-ink-muted">{c.label}</div>
                    <div className={`mt-1 text-[30px] leading-tight font-bold tracking-tight ${c.cls ?? ''}`}>{c.value}</div>
                    <div className="mt-1 text-xs text-ink-subtle">{c.note}</div>
                  </div>
                ))}
              </div>

              <section aria-labelledby="rp-status" className={`${card} flex flex-col gap-4`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="rp-status" className="m-0 text-[15px] font-semibold">{t(`reports.statusBy.${template}`)}</h2>
                  <ul className="m-0 flex list-none flex-wrap gap-3.5 p-0 text-xs text-ink-muted">
                    {STATUS_ORDER.map((s) => (
                      <li key={s} className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: `var(--cb-${s})` }} />{t(`runs.testStatus.${s}`)}</li>
                    ))}
                  </ul>
                </div>
                {rows.map((r) => (
                  <div key={r.id || 'none'} className="grid grid-cols-[minmax(160px,220px)_minmax(0,1fr)_64px] items-center gap-4">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.name || t('reports.noMilestone')}</div>
                      <div className="text-xs text-ink-subtle">{detail(r)}</div>
                    </div>
                    <CountBar counts={r.counts} className="h-[18px] rounded" />
                    <span className="text-right font-bold">{kpisOf(r.counts).executedPct}%</span>
                  </div>
                ))}
                <p className="m-0 text-xs text-ink-subtle">{t('reports.barNote')}</p>
              </section>

              {template !== 'project' && (
                <section aria-labelledby="rp-fail" className="overflow-hidden rounded-xl border border-border bg-surface">
                  <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <h2 id="rp-fail" className="m-0 text-[15px] font-semibold">{t('reports.failedBlocked')}</h2>
                    {template === 'run' && scope && issues.length > 0 && (
                      <Link to="/p/$projectId/runs/$runId" params={{ projectId, runId: scope.id }} className="text-[13px] font-semibold text-accent no-underline">{t('reports.viewAll', { count: issues.length })}</Link>
                    )}
                  </div>
                  {issues.length === 0 ? (
                    <p className="m-0 px-5 py-4 text-ink-muted">{t('reports.noIssues')}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] border-collapse text-left">
                        <thead>
                          <tr className="border-b border-border bg-surface-subtle text-xs tracking-[0.04em] text-ink-muted uppercase">
                            {(['id', 'title', 'run', 'status', 'note', 'tester'] as const).map((c) => <th key={c} scope="col" className="px-3 py-2.5 font-semibold first:pl-5 last:pr-5">{t(`reports.col.${c}`)}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {issues.map((i) => (
                            <tr key={`${i.runId}-${i.testId}`} className="border-b border-border-subtle last:border-b-0">
                              <td className="py-3 pr-3 pl-5 font-mono text-xs text-ink-muted">{i.id}</td>
                              <td className="px-3 py-3"><Link to="/p/$projectId/runs/$runId" params={{ projectId, runId: i.runId }} search={{ test: i.testId }} className="font-medium text-ink no-underline hover:text-accent">{i.title}</Link></td>
                              <td className="px-3 py-3 text-ink-secondary">{i.run}</td>
                              <td className="px-3 py-3"><TestStatusChip status={i.status} /></td>
                              <td className="px-3 py-3 text-[13px] text-ink-secondary">{i.note}</td>
                              <td className="py-3 pr-5 pl-3 text-[13px] text-ink-secondary">{i.who}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </ProjectShell>
  )
}
