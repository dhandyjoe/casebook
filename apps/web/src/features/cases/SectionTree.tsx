import { ChevronRight, Folder, FolderOpen, Layers, Plus } from 'lucide-react'
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ancestorIds, type Section } from './domain'

interface Props {
  sections: Section[]
  /** apa pun yang berada di sebuah section (case atau test); dipakai untuk jumlah per section */
  items: { sectionId: string }[]
  label: string
  heading: string
  allLabel: string
  showCounts?: boolean
  selectedId: string
  expanded: Set<string>
  canWrite: boolean
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  onAdd: (name: string, parentId: string | null) => void
}

export const INDENT = 18
export const PAD = 6
export const CARET = 16

// Dipakai juga oleh pemilih section di dialog Move/Copy supaya tampilannya sama.
export const rowBase = 'relative flex items-center gap-1 rounded-xs pr-2 text-ink'
export const rowState = (current: boolean) =>
  current ? 'bg-accent font-semibold text-white' : 'hover:bg-page'
export const folderIcon = 'flex-none fill-[var(--cb-folder)] text-[var(--cb-folder-edge)]'
const nameBtn = 'flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent py-[5px] text-left text-inherit'

export function SectionTree({ sections, items, label, heading, allLabel, showCounts = true, selectedId, expanded, canWrite, onSelect, onToggle, onAdd }: Props) {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of items) for (const id of [c.sectionId, ...ancestorIds(sections, c.sectionId)]) map.set(id, (map.get(id) ?? 0) + 1)
    return map
  }, [items, sections])

  const parent = sections.find((s) => s.id === selectedId)
  const children = (parentId: string | null) => sections.filter((s) => s.parentId === parentId)

  const done = useRef(false)
  function start() {
    if (adding) return setAdding(false)
    done.current = false
    // buka induk supaya baris input terlihat di posisi section baru
    if (parent && !expanded.has(parent.id)) onToggle(parent.id)
    setAdding(true)
  }
  function finish(save: boolean) {
    if (done.current) return
    done.current = true
    if (save && name.trim()) onAdd(name, parent?.id ?? null)
    setAdding(false)
    setName('')
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') finish(true)
    if (e.key === 'Escape') finish(false)
  }

  function draftRow(depth: number) {
    return (
      <li key="draft" className="list-none">
        <div className={`${rowBase} py-1`} style={{ paddingLeft: PAD + depth * INDENT }}>
          <span className="size-4 flex-none" />
          <Folder size={14} aria-hidden="true" className={folderIcon} />
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onKey}
            onBlur={() => finish(true)}
            aria-label={t('cases.tree.newName')}
            placeholder={parent ? t('cases.tree.newIn', { parent: parent.name }) : t('cases.tree.newTop')}
            className="h-7 min-w-0 flex-1 rounded-xs border border-border-input bg-surface px-2"
          />
        </div>
      </li>
    )
  }

  function node(s: Section, depth: number) {
    const kids = children(s.id)
    const open = expanded.has(s.id)
    const current = s.id === selectedId
    return (
      <li key={s.id} className="list-none">
        <div className={`${rowBase} ${rowState(current)}`} style={{ paddingLeft: PAD + depth * INDENT }}>
          {Array.from({ length: depth }, (_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 w-0 border-l border-dotted border-[var(--cb-sidebar-guide)]"
              style={{ left: PAD + i * INDENT + CARET / 2 }}
            />
          ))}
          {kids.length > 0 ? (
            <button
              type="button"
              aria-expanded={open}
              aria-label={t(open ? 'cases.tree.collapse' : 'cases.tree.expand', { name: s.name })}
              onClick={() => onToggle(s.id)}
              className="flex size-4 flex-none cursor-pointer items-center justify-center rounded-xs border-0 bg-transparent p-0 text-inherit"
            >
              <ChevronRight size={14} strokeWidth={2.4} aria-hidden="true" className={`transition-transform ${open ? 'rotate-90' : ''}`} />
            </button>
          ) : (
            <span className="size-4 flex-none" />
          )}
          <button
            type="button"
            title={s.name}
            aria-current={current ? 'true' : undefined}
            onClick={() => {
              onSelect(s.id)
              if (kids.length && !open) onToggle(s.id)
            }}
            className={nameBtn}
          >
            {open && kids.length > 0 ? <FolderOpen size={14} aria-hidden="true" className={folderIcon} /> : <Folder size={14} aria-hidden="true" className={folderIcon} />}
            <span className="truncate">{s.name}</span>
            {showCounts && <span className={`ml-auto flex-none pl-2 text-xs ${current ? '' : 'font-normal text-ink-muted'}`}>{counts.get(s.id) ?? 0}</span>}
          </button>
        </div>
        {open && (kids.length > 0 || (adding && parent?.id === s.id)) && (
          <ul className="m-0 flex list-none flex-col p-0">
            {kids.map((k) => node(k, depth + 1))}
            {adding && parent?.id === s.id && draftRow(depth + 1)}
          </ul>
        )}
      </li>
    )
  }

  return (
    <aside aria-label={label} className="box-border min-w-0 flex-[1_1_260px] border-r border-sidebar-line bg-sidebar lg:w-[var(--tree-w)] lg:flex-none">
      <div className="flex flex-col px-3 py-5 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto">
      <div className="flex items-center justify-between gap-2 px-2 pb-1">
        <span className="text-xs font-semibold tracking-[0.06em] text-sidebar-text uppercase">{heading}</span>
        {canWrite && (
          <button
            type="button"
            aria-expanded={adding}
            onClick={start}
            className="flex h-7 cursor-pointer items-center gap-1 rounded-sm border border-border bg-surface px-2 text-[13px] font-medium text-ink-secondary hover:bg-white/70"
          >
            <Plus size={14} aria-hidden="true" />
            {t('cases.tree.add')}
          </button>
        )}
      </div>
      {showCounts && (
        <p className="m-0 px-2 pb-2 text-xs text-sidebar-text">{t('cases.tree.summary', { sections: sections.length, cases: items.length })}</p>
      )}
      <div className="rounded-md border border-border bg-surface p-1">
      <div className={`${rowBase} ${rowState(selectedId === 'all')}`} style={{ paddingLeft: PAD }}>
        <span className="size-4 flex-none" />
        <button type="button" aria-current={selectedId === 'all' ? 'true' : undefined} onClick={() => onSelect('all')} className={nameBtn}>
          <Layers size={14} aria-hidden="true" className="flex-none" />
          <span className="truncate">{allLabel}</span>
          {showCounts && <span className={`ml-auto flex-none pl-2 text-xs ${selectedId === 'all' ? '' : 'font-normal text-ink-muted'}`}>{items.length}</span>}
        </button>
      </div>
      <ul className="m-0 flex list-none flex-col p-0">{children(null).map((s) => node(s, 0))}{adding && !parent && draftRow(0)}</ul>
      </div>
      {sections.length === 0 && <p className="m-0 px-2 py-4 text-ink-muted">{t('cases.tree.empty')}</p>}
      </div>
    </aside>
  )
}
