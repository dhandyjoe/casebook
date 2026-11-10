import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ProjectShell } from '@/components/layout/ProjectShell'
import { ResizeHandle } from '@/components/ui/ResizeHandle'
import { useAuth } from '@/features/auth/session'
import { ancestorIds, caseGroups, sectionPath, sectionWithDescendants } from '@/features/cases/domain'
import { SectionTree } from '@/features/cases/SectionTree'
import { useCaseData } from '@/features/cases/hooks'
import { usePaneSizes } from '@/features/cases/usePaneSizes'
import { useProject } from '@/features/projects/hooks'
import { countTests, totalOf, type ResultInput, type RunTest, type TestStatus } from './domain'
import { RunDialog } from './RunDialog'
import { RunStatusChip } from './status'
import { RunSummary } from './RunSummary'
import { usePlans, useRunData, useTestResults } from './hooks'
import { useMilestones } from '@/features/milestones/hooks'
import { TestDetail } from './TestDetail'
import { TestList } from './TestList'

const ROUTE = '/p/$projectId/runs/$runId' as const
const RUN_PANES = { key: 'casebook.runPanes', tree: 248, detail: 620 }

export function RunDetailPage() {
  const { t } = useTranslation()
  const { projectId, runId } = useParams({ from: ROUTE })
  const search = useSearch({ from: ROUTE })
  const navigate = useNavigate({ from: ROUTE })
  const session = useAuth((s) => s.session)!
  const data = useRunData(projectId, runId)
  const { run, tests, plan } = data
  const milestones = useMilestones(projectId).data ?? []
  const plans = usePlans(projectId).data
  const { sections, cases } = useCaseData(projectId)
  const project = useProject(projectId)

  const layout = useRef<HTMLDivElement>(null)
  const panes = usePaneSizes(layout, RUN_PANES)
  const [query, setQuery] = useState('')
  const [statuses, setStatuses] = useState<Set<TestStatus>>(new Set())
  const [mine, setMine] = useState(false)
  const [editing, setEditing] = useState(false)

  // Folder = section yang berisi test di run ini (beserta induknya).
  const folders = useMemo(() => {
    const used = new Set<string>()
    for (const x of tests) [x.sectionId, ...ancestorIds(sections, x.sectionId)].forEach((id) => used.add(id))
    return sections.filter((s) => used.has(s.id))
  }, [tests, sections])
  const folderId = search.folder && folders.some((f) => f.id === search.folder) ? search.folder : 'all'
  const [expanded, setExpanded] = useState(() => new Set([folderId, ...ancestorIds(sections, folderId)]))
  useEffect(() => { setExpanded((prev) => new Set([...prev, ...ancestorIds(folders, folderId)])) }, [folderId, folders])

  const inFolder = useMemo(() => {
    if (folderId === 'all') return tests
    const ids = sectionWithDescendants(folders, folderId)
    return tests.filter((x) => ids.has(x.sectionId))
  }, [tests, folders, folderId])

  const q = query.trim().toLowerCase()
  const filtered = inFolder.filter((x) =>
    (statuses.size === 0 || statuses.has(x.status)) &&
    (!mine || x.assignee === session.initials) &&
    (!q || x.snapshot.title.toLowerCase().includes(q) || `t-${x.number}`.includes(q) || x.caseId.toLowerCase().includes(q)),
  )
  const groups = useMemo(
    () => caseGroups(folders, filtered, folderId).map((g) => ({ id: g.section.id, name: g.section.name, depth: g.depth, tests: g.cases.sort((a, b) => a.number - b.number) })),
    [folders, filtered, folderId],
  )
  const nav = groups.flatMap((g) => g.tests)
  const selected = nav.find((x) => x.id === search.test) ?? nav[0]
  const index = selected ? nav.indexOf(selected) : -1

  const go = (patch: { folder?: string; test?: string }, replace = false) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace, resetScroll: false })
  const step = (d: number) => { if (nav.length) go({ test: nav[(index + d + nav.length) % nav.length]!.id }, true) }

  // N = test berikutnya (tidak aktif saat mengetik)
  const stepRef = useRef(step)
  stepRef.current = step
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable) return
      stepRef.current(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const results = useTestResults(projectId, runId, selected?.id, projectId !== 'store')

  if (data.loading) return null
  if (!project || !run) return <p className="p-6">{t('runs.notFound')}</p>

  const blocked = run.status === 'draft' ? 'draft' : null
  const milestone = milestones.find((m) => m.id === run.milestoneId)
  const remaining = run.counts.untested + run.counts.retest
  const hint = run.status === 'done' ? t('runs.detail.hintDone') : run.status === 'draft' ? t('runs.detail.hintDraft') : t('runs.detail.hintActive', { count: remaining })
  const folderTitle = folderId === 'all' ? t('runs.detail.allTests') : sectionPath(sections, folderId)
  const folderCounts = countTests(inFolder)

  const record = (test: RunTest, input: ResultInput) => data.record(test.id, input, session.initials)

  return (
    <ProjectShell project={project} active="runs">
      <div className="flex flex-col">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5">
          <div className="min-w-0">
            <nav aria-label={t('runs.detail.breadcrumb')} className="flex flex-wrap gap-1.5 text-[13px] text-ink-muted">
              <Link to="/p/$projectId/runs" params={{ projectId }} className="text-inherit no-underline">{t('runs.detail.testRuns')}</Link>
              {milestone && (<><span aria-hidden="true">›</span><Link to="/p/$projectId/runs" params={{ projectId }} className="text-inherit no-underline">{milestone.name}</Link></>)}
              {plan && (<><span aria-hidden="true">›</span><span>{plan.name}</span></>)}
            </nav>
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <h1 className="m-0 text-[22px] font-bold tracking-tight">{run.name}</h1>
              <RunStatusChip status={run.status} small={false} />
              <span className="text-xs text-ink-subtle">{hint}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {run.status === 'draft' && (
              <button type="button" disabled={totalOf(run.counts) === 0} onClick={() => data.start()} className="flex h-[38px] cursor-pointer items-center gap-2 rounded-md border-0 bg-accent px-3.5 font-semibold text-white hover:bg-accent-hover disabled:cursor-default disabled:bg-accent-disabled">
                <Play size={15} aria-hidden="true" />{t('runs.detail.startRun')}
              </button>
            )}
            <button type="button" aria-haspopup="dialog" onClick={() => setEditing(true)} className="h-[38px] cursor-pointer rounded-md border border-border-strong bg-surface px-3.5 font-semibold text-ink">{t('runs.detail.editRun')}</button>
          </div>
        </div>

        <div className="pb-5"><RunSummary counts={run.counts} /></div>

        <div ref={layout} className="flex flex-wrap items-stretch lg:flex-nowrap" style={{ '--tree-w': `${panes.tree.value}px`, '--detail-w': `${panes.detail.value}px` } as React.CSSProperties}>
          <SectionTree
            sections={folders} items={tests} label={t('runs.detail.folders')} heading={t('runs.detail.folderHeading')} allLabel={t('runs.detail.allTests')}
            showCounts={false} canWrite={false} selectedId={folderId} expanded={expanded}
            onSelect={(id) => go({ folder: id === 'all' ? undefined : id, test: undefined })}
            onToggle={(id) => setExpanded((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })}
            onAdd={() => undefined}
          />
          <ResizeHandle label={t('cases.resize.tree')} hint={t('cases.resize.hint')} size={panes.tree} direction={1} />

          <TestList
            title={folderTitle} total={inFolder.length} executed={inFolder.length - folderCounts.untested}
            groups={groups} selectedId={selected?.id}
            query={query} onQuery={setQuery} statuses={statuses} onStatuses={setStatuses} mine={mine} onMine={setMine}
            disabledReason={blocked ? t('runs.detail.changeBlockedDraft') : undefined}
            onOpen={(id) => go({ test: id }, true)}
            onPick={(test, status) => record(test, { status, comment: t('runs.detail.changedFromList'), evidence: [] })}
          />

          <ResizeHandle label={t('cases.resize.detail')} hint={t('cases.resize.hint')} size={panes.detail} direction={-1} />
          {selected ? (
            <TestDetail
              key={selected.id} projectId={projectId} test={projectId === 'store' ? selected : { ...selected, results: results.data ?? [] }} position={t('runs.detail.position', { i: index + 1, n: nav.length })} blocked={blocked}
              onPrev={() => step(-1)} onNext={() => step(1)}
              onSave={(input, andNext) => {
                const next = nav[(index + 1) % nav.length]
                record(selected, input)
                if (andNext && next) go({ test: next.id }, true)
              }}
            />
          ) : (
            <section className="box-border flex min-w-0 flex-[4_1_540px] items-start justify-center border-l border-border bg-surface p-10 text-ink-muted lg:w-[var(--detail-w)] lg:flex-none">{t('runs.detail.noTests')}</section>
          )}
        </div>
      </div>

      <RunDialog
        open={editing} editing={run} caseIds={data.setCases && tests.map((x) => x.caseId)} saving={data.saving} failed={data.failed} projectName={project.name} milestones={milestones} plans={plans} cases={cases} sections={sections}
        me={{ uid: session.uid, name: session.name }} onClose={() => setEditing(false)} onCreate={() => undefined}
        onSave={(patch, ids) => (ids && data.setCases ? data.setCases(patch, cases, ids, () => setEditing(false)) : (data.update(patch), setEditing(false)))}
      />
    </ProjectShell>
  )
}
