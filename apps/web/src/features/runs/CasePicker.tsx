import { ChevronRight, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TriBox, ariaChecked, type TriState } from '@/components/ui/TriBox'
import { PRIORITIES, ancestorIds, sectionPath, type Priority, type Section, type TestCase } from '@/features/cases/domain'

interface Props {
  /** semua case; yang belum Approved tidak bisa dipilih */
  cases: TestCase[]
  sections: Section[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
}

const stateOf = (ids: string[], selected: Set<string>): { k: number; st: TriState } => {
  const k = ids.filter((id) => selected.has(id)).length
  return { k, st: k === 0 ? false : k === ids.length ? true : 'mixed' }
}

/** Pemilih case untuk Test Run: pohon section bertingkat (centang tri-state), daftar case, pencarian, filter priority. */
export function CasePicker({ cases, sections, selected, onChange }: Props) {
  const { t } = useTranslation()
  const [focus, setFocus] = useState(() => (sections.some((s) => s.id === 'pay') ? 'pay' : 'all'))
  const [open, setOpen] = useState(() => new Set(ancestorIds(sections, focus)))
  const [q, setQ] = useState('')
  const [priority, setPriority] = useState<'all' | Priority>('all')

  const approved = useMemo(() => cases.filter((c) => c.status === 'active').sort((a, b) => a.number - b.number), [cases])
  const byId = useMemo(() => new Map(cases.map((c) => [c.id, c])), [cases])

  // id case Approved per section, termasuk keturunannya; hidden = yang belum Approved
  const { idsOf, hiddenOf } = useMemo(() => {
    const ids = new Map<string, string[]>([['all', approved.map((c) => c.id)]])
    const hidden = new Map<string, number>([['all', cases.length - approved.length]])
    for (const c of cases) {
      for (const sid of [c.sectionId, ...ancestorIds(sections, c.sectionId)]) {
        if (c.status === 'active') ids.set(sid, [...(ids.get(sid) ?? []), c.id])
        else hidden.set(sid, (hidden.get(sid) ?? 0) + 1)
      }
    }
    return { idsOf: (id: string) => ids.get(id) ?? [], hiddenOf: (id: string) => hidden.get(id) ?? 0 }
  }, [approved, cases, sections])

  const nameOf = (id: string) => (id === 'all' ? t('cases.tree.all') : (sections.find((s) => s.id === id)?.name ?? id))
  const setIds = (ids: string[], on: boolean) => {
    const next = new Set(selected)
    for (const id of ids) on ? next.add(id) : next.delete(id)
    onChange(next)
  }
  const toggleIds = (ids: string[]) => setIds(ids, stateOf(ids, selected).st !== true)

  const query = q.trim().toLowerCase()
  const visibleIds = (query ? idsOf('all') : idsOf(focus)).filter((id) => {
    const c = byId.get(id)!
    return (priority === 'all' || c.priority === priority) && (!query || c.title.toLowerCase().includes(query) || c.id.toLowerCase().includes(query))
  })
  const showPath = !!query || focus === 'all' || sections.some((s) => s.parentId === focus)
  const head = stateOf(visibleIds, selected)

  type Node = { id: string; depth: number; hasKids: boolean }
  const nodes: Node[] = [{ id: 'all', depth: 0, hasKids: false }]
  const walk = (parentId: string | null, depth: number) => {
    for (const s of sections.filter((x) => x.parentId === parentId)) {
      const hasKids = sections.some((x) => x.parentId === s.id)
      nodes.push({ id: s.id, depth, hasKids })
      if (hasKids && open.has(s.id)) walk(s.id, depth + 1)
    }
  }
  walk(null, 0)

  const selectedIds = [...selected].filter((id) => byId.get(id)?.status === 'active')
  const bySection = new Map<string, string[]>()
  for (const id of selectedIds) {
    const sid = byId.get(id)!.sectionId
    bySection.set(sid, [...(bySection.get(sid) ?? []), id])
  }
  const sectionCount = bySection.size
  const scope = query ? t('runs.dialog.searchResults', { count: visibleIds.length }) : nameOf(focus)
  const hiddenHere = query ? 0 : hiddenOf(focus)

  return (
    <>
      <div className="flex flex-wrap overflow-hidden rounded-xl border border-[var(--cb-detail-border)]">
        <div role="tree" aria-label={t('cases.tree.label')} className="box-border h-[404px] max-w-[300px] flex-[1_1_230px] overflow-y-auto border-r border-border bg-[var(--cb-surface-muted)] p-2">
          <div className="px-2 pt-1 pb-2 text-xs text-ink-muted">{t('runs.dialog.treeHint')}</div>
          {nodes.map(({ id, depth, hasKids }) => {
            const ids = idsOf(id)
            const { k, st } = stateOf(ids, selected)
            const focused = focus === id && !query
            const isOpen = open.has(id)
            return (
              <div
                key={id} role="treeitem" aria-level={depth + 1} aria-selected={focused}
                className={`flex items-center gap-1 rounded-[7px] py-0.5 pr-1.5 ${focused ? 'bg-[var(--cb-steps-head)]' : ''}`}
                style={{ paddingLeft: 6 + depth * 22 }}
              >
                <button
                  type="button" tabIndex={hasKids ? 0 : -1} aria-expanded={hasKids ? isOpen : undefined}
                  aria-label={t(isOpen ? 'cases.tree.collapse' : 'cases.tree.expand', { name: nameOf(id) })}
                  onClick={() => setOpen((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })}
                  className={`flex size-[22px] cursor-pointer items-center justify-center rounded-xs border-0 bg-transparent p-0 text-ink-muted ${hasKids ? '' : 'invisible'}`}
                >
                  <ChevronRight size={14} strokeWidth={2.4} aria-hidden="true" className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>
                <button
                  type="button" role="checkbox" aria-checked={ariaChecked(st)} disabled={ids.length === 0}
                  aria-label={t('runs.dialog.selectSection', { name: nameOf(id) })} onClick={() => toggleIds(ids)}
                  className="flex size-[26px] cursor-pointer items-center justify-center border-0 bg-transparent p-0 disabled:cursor-default"
                >
                  <TriBox state={st} disabled={ids.length === 0} />
                </button>
                <button
                  type="button" onClick={() => { setFocus(id); setQ('') }}
                  className={`flex h-[30px] min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-sm border-0 bg-transparent px-1.5 text-left text-ink ${focused ? 'font-semibold' : hasKids || id === 'all' ? 'font-medium' : ''}`}
                >
                  <span className="truncate">{nameOf(id)}</span>
                  <span className={`flex-none rounded-full px-[7px] text-xs font-semibold ${k ? 'bg-accent text-white' : 'bg-track text-[var(--cb-blocked-fg)]'}`}>{k ? `${k}/${ids.length}` : ids.length}</span>
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex h-[404px] min-w-0 flex-[2_1_340px] flex-col">
          <div className="flex flex-col gap-2 border-b border-border px-3 py-2.5">
            <label className="box-border flex h-9 items-center gap-2 rounded-md border border-border-input bg-surface px-2.5 text-ink-subtle">
              <Search size={16} aria-hidden="true" />
              <input
                type="search" value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('runs.dialog.searchLabel')}
                placeholder={t('runs.dialog.searchPlaceholder')} className="min-w-0 flex-1 border-0 bg-transparent text-ink outline-none"
              />
            </label>
            <div role="group" aria-label={t('runs.dialog.priority')} className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-xs text-ink-muted">{t('runs.dialog.priority')}</span>
              {(['all', ...PRIORITIES] as const).map((p) => {
                const on = priority === p
                return (
                  <button
                    key={p} type="button" aria-pressed={on} onClick={() => setPriority(p)}
                    className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold ${on ? 'border-accent bg-accent-tint text-accent-hover' : 'border-border-strong bg-surface text-ink-secondary'}`}
                  >
                    {p !== 'all' && <span className="size-[7px] rounded-full" style={{ background: `var(--cb-priority-${p.toLowerCase()})` }} />}
                    {p === 'all' ? t('runs.dialog.priorityAll') : t(`cases.priority.${p}`)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-1 border-b border-border-subtle bg-surface-subtle py-1.5 pr-3 pl-1.5">
            <button
              type="button" role="checkbox" aria-checked={ariaChecked(head.st)} disabled={visibleIds.length === 0} onClick={() => toggleIds(visibleIds)}
              className="flex h-[30px] cursor-pointer items-center gap-2 rounded-sm border-0 bg-transparent px-2 font-semibold text-ink disabled:cursor-default"
            >
              <TriBox state={head.st} disabled={visibleIds.length === 0} />
              {priority === 'all' ? t('runs.dialog.selectAll', { count: visibleIds.length }) : t('runs.dialog.selectAllPriority', { priority: t(`cases.priority.${priority}`), count: visibleIds.length })}
            </button>
            <span className="ml-auto text-right text-xs text-ink-muted">{hiddenHere ? t('runs.dialog.scopeHidden', { scope, count: hiddenHere }) : scope}</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {visibleIds.map((id) => {
              const c = byId.get(id)!
              const on = selected.has(id)
              return (
                <button
                  key={id} type="button" role="checkbox" aria-checked={on} onClick={() => setIds([id], !on)}
                  className={`grid w-full cursor-pointer grid-cols-[16px_56px_minmax(0,1fr)_auto] items-center gap-2.5 border-0 border-b border-border-subtle px-3.5 py-[9px] text-left text-ink ${on ? 'bg-accent-tint-3' : 'bg-surface'}`}
                >
                  <TriBox state={on} />
                  <span className="font-mono text-xs text-ink-muted">{c.id}</span>
                  <span className="min-w-0">
                    <span className="block truncate">{c.title}</span>
                    {showPath && <span className="block text-xs text-ink-subtle">{sectionPath(sections, c.sectionId)}</span>}
                  </span>
                  <span className="flex min-w-[58px] items-center gap-[5px] text-xs text-ink-muted">
                    <span className="size-[7px] rounded-full" style={{ background: `var(--cb-priority-${c.priority.toLowerCase()})` }} />
                    {t(`cases.priority.${c.priority}`)}
                  </span>
                </button>
              )
            })}
            {visibleIds.length === 0 && <div className="px-4 py-8 text-center text-ink-muted">{t('runs.dialog.noMatch')}</div>}
          </div>
        </div>
      </div>

      <div className={`flex min-h-9 flex-wrap items-center gap-2 rounded-lg px-3 py-2 ${selectedIds.length ? 'bg-accent-tint' : 'bg-page'}`}>
        <span className={`mr-1 font-semibold ${selectedIds.length ? 'text-accent-hover' : 'text-ink-muted'}`}>
          {selectedIds.length
            ? t('runs.dialog.summary', { cases: t('cases.count', { count: selectedIds.length }), sections: t('runs.list.sections', { count: sectionCount }) })
            : t('runs.dialog.summaryNone')}
        </span>
        {[...bySection].map(([sid, ids]) => (
          <span key={sid} className="flex h-7 items-center gap-1 rounded-full border border-[var(--cb-steps-border)] bg-surface pr-1 pl-2.5 text-xs font-semibold text-accent-hover">
            {nameOf(sid)} · {ids.length}
            <button
              type="button" aria-label={t('runs.dialog.clearSection', { name: nameOf(sid) })} onClick={() => setIds(ids, false)}
              className="flex size-5 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-accent-hover"
            >
              <X size={12} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </span>
        ))}
        {selectedIds.length > 0 && (
          <button type="button" onClick={() => onChange(new Set())} className="ml-auto h-7 cursor-pointer rounded-sm border-0 bg-transparent px-2.5 text-[13px] font-semibold text-ink-secondary">
            {t('runs.dialog.clear')}
          </button>
        )}
      </div>
    </>
  )
}
