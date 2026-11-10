import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ProjectShell } from '@/components/layout/ProjectShell'
import { ResizeHandle } from '@/components/ui/ResizeHandle'
import { useAuth } from '@/features/auth/session'
import { useUsers } from '@/features/people/useUsers'
import { useProject } from '@/features/projects/hooks'
import { useRemoveCasesFromRuns } from '@/features/runs/hooks'
import { DeleteDialog, DeleteSectionDialog, MoveDialog, SendReviewDialog } from './BulkDialogs'
import { CaseDetail } from './CaseDetail'
import { CaseDialog } from './CaseDialog'
import { CaseList } from './CaseList'
import {
  STATUSES, ancestorIds, canReview, caseGroups, sectionPath, sectionWithDescendants,
  type CaseEdit, type CaseStatus, type Person,
} from './domain'
import { useCaseActions, useCaseData } from './hooks'
import { SectionTree } from './SectionTree'
import { usePaneSizes } from './usePaneSizes'

const ROUTE = '/p/$projectId/cases' as const
const CASE_PANES = { key: 'casebook.casePanes', tree: 260, detail: 620 }

export function CasesPage() {
  const { t } = useTranslation()
  const { projectId } = useParams({ from: ROUTE })
  const search = useSearch({ from: ROUTE })
  const navigate = useNavigate({ from: ROUTE })
  const session = useAuth((s) => s.session)!
  const { sections, cases, isPending, isError, refetch } = useCaseData(projectId)
  const store = useCaseActions(projectId)
  const project = useProject(projectId)
  const removeFromRuns = useRemoveCasesFromRuns(projectId).mutate

  const layout = useRef<HTMLDivElement>(null)
  const panes = usePaneSizes(layout, CASE_PANES)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<'add' | 'edit' | 'move' | 'copy' | 'delete' | 'deleteSection' | 'review' | null>(null)
  const [reviewId, setReviewId] = useState<string>()
  const users = useUsers(dialog === 'review')
  const me: Person = { uid: session.uid, name: session.name }

  const sectionId = search.section && sections.some((s) => s.id === search.section) ? search.section : 'all'
  const statusFilter = search.status ?? 'all'
  const [expanded, setExpanded] = useState(() => new Set([sectionId, ...ancestorIds(sections, sectionId)]))
  useEffect(() => {
    setExpanded((prev) => new Set([...prev, ...ancestorIds(sections, sectionId)]))
  }, [sectionId, sections])

  const inSection = useMemo(() => {
    if (sectionId === 'all') return cases
    const ids = sectionWithDescendants(sections, sectionId)
    return cases.filter((c) => ids.has(c.sectionId))
  }, [cases, sections, sectionId])
  const visible = statusFilter === 'all' ? inSection : inSection.filter((c) => c.status === statusFilter)
  const groups = caseGroups(sections, visible, sectionId)
  const ordered = groups.flatMap((g) => g.cases)
  const selected = ordered.find((c) => c.id === search.case) ?? ordered[0]
  const checkedVisible = visible.filter((c) => checked.has(c.id))

  if (!project) return <p className="p-6">{t('cases.notFound')}</p>

  const section = sections.find((s) => s.id === sectionId)
  const parents = section ? ancestorIds(sections, section.id).reverse().map((id) => sections.find((s) => s.id === id)!.name) : []
  const doomed = section ? sectionWithDescendants(sections, section.id) : undefined
  const countOf = (status: CaseStatus) => inSection.filter((c) => c.status === status).length

  const go = (patch: { section?: string; status?: CaseStatus; case?: string }, opts?: { replace?: boolean; resetScroll?: boolean }) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: opts?.replace, resetScroll: opts?.resetScroll })
  // Memilih case tidak boleh menggeser halaman ke atas (router me-reset gulir di setiap navigasi).
  const openCase = (id: string) => go({ case: id }, { replace: true, resetScroll: false })
  const step = (d: number) => {
    if (!ordered.length || !selected) return
    openCase(ordered[(ordered.indexOf(selected) + d + ordered.length) % ordered.length]!.id)
  }

  async function add(input: CaseEdit & { status: 'draft' | 'under_review' }) {
    const created = await store.addCase({ ...input, status: 'draft' }, session.name)
    if (!created) return
    const inView = sectionId === 'all' || sectionWithDescendants(sections, sectionId).has(created.sectionId)
    void go({ section: inView ? sectionId : created.sectionId, status: undefined, case: created.id }, { resetScroll: false })
    if (input.status === 'under_review') openReview(created.id)
  }
  const openReview = (id: string) => { setReviewId(id); setDialog('review') }
  const clear = () => setChecked(new Set())

  const toApprove = checkedVisible.filter((c) => canReview(c, session.uid))
  const editing = dialog === 'edit' ? selected : undefined

  return (
    <ProjectShell project={project} active="cases">
      <div
          ref={layout}
          className="flex flex-1 flex-wrap items-stretch lg:flex-nowrap"
          style={{ '--tree-w': `${panes.tree.value}px`, '--detail-w': `${panes.detail.value}px` } as React.CSSProperties}
        >
          <SectionTree
            sections={sections} items={cases} label={t('cases.tree.label')} heading={t('cases.tree.heading')} allLabel={t('cases.tree.all')} selectedId={sectionId} expanded={expanded} canWrite
            onSelect={(id) => { clear(); void go({ section: id === 'all' ? undefined : id, case: undefined }) }}
            onToggle={(id) => setExpanded((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })}
            onAdd={async (name, parentId) => { const s = await store.addSection(name, parentId); if (s) void go({ section: s.id, case: undefined }) }}
          />

          <ResizeHandle label={t('cases.resize.tree')} hint={t('cases.resize.hint')} size={panes.tree} direction={1} />

          <main className="box-border flex min-w-0 flex-[3_1_440px] flex-col gap-3.5 p-5 lg:min-w-[320px] lg:flex-1 lg:basis-0">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                {parents.length > 0 && <div className="text-[13px] text-ink-muted">{parents.join(' › ')} ›</div>}
                <h1 className="mt-0.5 mb-0 text-[22px] font-bold tracking-tight">{section?.name ?? t('cases.tree.all')}</h1>
                <p className="mt-0.5 text-ink-muted">
                  {t('cases.meta', { cases: t('cases.count', { count: inSection.length }), review: countOf('under_review') })}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" aria-haspopup="dialog" disabled={sections.length === 0} title={sections.length === 0 ? t('cases.header.addNeedsSection') : undefined} onClick={() => setDialog('add')} className="flex h-[38px] cursor-pointer items-center gap-2 rounded-md border-0 bg-accent px-3.5 font-semibold text-white hover:bg-accent-hover disabled:cursor-default disabled:opacity-50">
                  <Plus size={16} strokeWidth={2.2} aria-hidden="true" />{t('cases.header.add')}
                </button>
                {section && (
                  <button type="button" aria-haspopup="dialog" aria-label={t('cases.header.deleteSection')} title={t('cases.header.deleteSection')} onClick={() => setDialog('deleteSection')} className="flex size-[38px] cursor-pointer items-center justify-center rounded-md border border-border-strong bg-surface text-danger-text hover:bg-danger-bg">
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {(isError || store.failed) && (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-danger-text">
                {t(isError ? 'cases.loadError' : 'cases.saveError')}
                {isError && <button type="button" onClick={refetch} className="h-[30px] cursor-pointer rounded-sm border border-border-strong bg-surface px-2.5 text-ink">{t('dashboard.retry')}</button>}
              </div>
            )}

            <div role="group" aria-label={t('cases.filterLabel')} className="flex flex-wrap gap-1.5">
              {(['all', ...STATUSES] as const).map((key) => {
                const on = statusFilter === key
                const n = key === 'all' ? inSection.length : countOf(key)
                return (
                  <button
                    key={key} type="button" aria-pressed={on}
                    onClick={() => { clear(); void go({ status: key === 'all' ? undefined : key, case: undefined }) }}
                    className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium ${on ? 'border-[var(--cb-bulkbar)] bg-[var(--cb-bulkbar)] text-white' : 'border-border-strong bg-surface text-ink-secondary'}`}
                  >
                    {t(`cases.status.${key}`)}<span className="text-xs opacity-80">{n}</span>
                  </button>
                )
              })}
            </div>

            {checkedVisible.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-[var(--cb-bulkbar)] px-3 py-2 text-white">
                <span className="mr-1.5 font-semibold">{t('cases.bulk.selected', { count: checkedVisible.length })}</span>
                <BulkButton onClick={() => setDialog('move')}>{t('cases.bulk.move')}</BulkButton>
                <BulkButton onClick={() => setDialog('copy')}>{t('cases.bulk.copy')}</BulkButton>
                <BulkButton disabled={toApprove.length === 0} title={toApprove.length === 0 ? t('cases.bulk.approveNone') : undefined}
                  onClick={() => { store.approveCases(toApprove.map((c) => c.id), me); clear() }}>
                  {t('cases.bulk.approve')}
                </BulkButton>
                <BulkButton danger onClick={() => setDialog('delete')}>{t('cases.bulk.delete')}</BulkButton>
                <button type="button" onClick={clear} className="ml-auto h-[30px] cursor-pointer rounded-sm border-0 bg-transparent px-2.5 text-[var(--cb-bulkbar-muted)]">{t('cases.bulk.cancel')}</button>
              </div>
            )}

            <CaseList
              groups={groups} selectedId={selected?.id} checked={checked}
              onToggle={(id) => setChecked((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })}
              onToggleAll={(ids) => setChecked((prev) => { const n = new Set(prev); const all = ids.every((id) => n.has(id)); ids.forEach((id) => (all ? n.delete(id) : n.add(id))); return n })}
              onOpen={openCase}
              onQuickAdd={sectionId !== 'all'
                ? (title, id) => add({ title, sectionId: id, type: 'Functional', priority: 'Medium', refs: '', preconditions: [], steps: [], expected: [], status: 'draft' })
                : undefined}
              emptyText={isPending ? t('cases.loading') : sections.length === 0 ? t('cases.list.noSections') : statusFilter === 'all' ? '' : t('cases.list.noMatch')}
            />
            <p className="m-0 text-xs text-ink-subtle">{t('cases.list.hint')}</p>
          </main>

          <ResizeHandle label={t('cases.resize.detail')} hint={t('cases.resize.hint')} size={panes.detail} direction={-1} />

          {selected ? (
            <CaseDetail
              key={selected.id}
              testCase={selected} sectionPath={sectionPath(sections, selected.sectionId)} userName={session.name} userUid={session.uid}
              onPrev={() => step(-1)} onNext={() => step(1)} onEdit={() => setDialog('edit')}
              onSubmit={() => openReview(selected.id)}
              onApprove={() => store.approveCases([selected.id], me)}
              onReturn={(note) => store.returnCase(selected.id, note, me)}
            />
          ) : (
            <section className="box-border flex min-w-0 flex-[4_1_520px] items-center justify-center border-l border-border bg-surface p-10 text-center text-ink-muted lg:w-[var(--detail-w)] lg:flex-none">
              {t(cases.length === 0 ? 'cases.detail.noData' : 'cases.detail.none')}
            </section>
          )}
      </div>

      <CaseDialog
        open={dialog === 'add' || dialog === 'edit'} editing={editing} projectName={project.name} sections={sections}
        defaultSectionId={section?.id ?? sections[0]?.id ?? ''}
        // <dialog> memicu close saat open jadi false; jangan menimpa dialog review yang baru dibuka
        onClose={() => setDialog((d) => (d === 'add' || d === 'edit' ? null : d))}
        onSave={(edit, status) => {
          setDialog(null)
          if (editing) store.updateCase(editing.id, edit, session.name)
          else add({ ...edit, status })
        }}
      />
      <SendReviewDialog
        key={reviewId} open={dialog === 'review'} users={users.data ?? []} loading={users.isPending && users.fetchStatus !== 'idle'} failed={users.isError} meUid={session.uid}
        onClose={() => setDialog(null)}
        onSend={(reviewer) => { if (reviewId) store.submit(reviewId, session.name, reviewer); setDialog(null) }}
      />
      <MoveDialog
        mode={dialog === 'copy' ? 'copy' : 'move'} open={dialog === 'move' || dialog === 'copy'} count={checkedVisible.length} sections={sections} onClose={() => setDialog(null)}
        onMove={(target) => {
          const ids = checkedVisible.map((c) => c.id)
          if (dialog === 'copy') store.copyCases(ids, target, session.name)
          else store.moveCases(ids, target)
          clear(); setDialog(null)
        }}
      />
      <DeleteSectionDialog
        open={dialog === 'deleteSection'} name={section?.name ?? ''} subsections={doomed ? doomed.size - 1 : 0} cases={doomed ? cases.filter((c) => doomed.has(c.sectionId)).length : 0}
        onClose={() => setDialog(null)}
        onDelete={() => {
          if (!section) return
          const gone = sectionWithDescendants(sections, section.id)
          removeFromRuns(cases.filter((c) => gone.has(c.sectionId)).map((c) => c.id))
          store.deleteSection(section.id)
          clear(); setDialog(null)
          void go({ section: section.parentId ?? undefined, case: undefined })
        }}
      />
      <DeleteDialog
        open={dialog === 'delete'} count={checkedVisible.length} onClose={() => setDialog(null)}
        onDelete={() => { const ids = checkedVisible.map((c) => c.id); removeFromRuns(ids); store.deleteCases(ids); clear(); setDialog(null) }}
      />
    </ProjectShell>
  )
}

function BulkButton({ danger, ...props }: { danger?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`h-[30px] cursor-pointer rounded-sm border border-[var(--cb-bulkbar-border)] bg-transparent px-2.5 disabled:cursor-default disabled:opacity-50 ${danger ? 'text-[var(--cb-bulkbar-danger)]' : 'text-white'}`}
    />
  )
}
