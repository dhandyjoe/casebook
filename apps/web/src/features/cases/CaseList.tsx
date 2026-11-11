import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CaseStatusChip } from './CaseStatusChip'
import type { CaseGroup } from './domain'

interface Props {
  groups: CaseGroup[]
  selectedId: string | undefined
  checked: Set<string>
  onToggle: (id: string) => void
  onToggleAll: (ids: string[]) => void
  onOpen: (id: string) => void
  /** undefined = quick add tidak tersedia (mis. "All cases") */
  onQuickAdd?: (title: string, sectionId: string) => void
  emptyText: string
}

const grid = 'grid grid-cols-[32px_60px_minmax(0,1fr)_auto_24px] items-center gap-2 px-3'

export function CaseList({ groups, selectedId, checked, onToggle, onToggleAll, onOpen, onQuickAdd, emptyText }: Props) {
  const { t } = useTranslation()
  const selectedRow = useRef<HTMLDivElement>(null)

  useEffect(() => {
    selectedRow.current?.scrollIntoView?.({ block: 'nearest' })
  }, [selectedId])

  return (
    <div className="flex flex-col gap-3.5">
      {emptyText && groups.every((g) => g.cases.length === 0) && <p className="m-0 rounded-xl border border-border bg-surface px-5 py-8 text-center text-ink-muted">{emptyText}</p>}
      {groups.map(({ section, depth, cases }) => {
        const allChecked = cases.length > 0 && cases.every((c) => checked.has(c.id))
        return (
          <section
            key={section.id}
            aria-label={section.name}
            style={depth ? { marginLeft: Math.min(depth, 4) * 20 } : undefined}
            className={`flex flex-col gap-2.5 ${depth ? 'border-l border-[var(--cb-sidebar-guide)] pl-3.5' : ''}`}
          >
            <h3 className="m-0 flex items-center gap-2 text-[15px] font-bold">
              {section.name}
              <span className="rounded-full bg-[#DCE2EC] px-2 text-[11px] leading-[18px] font-semibold text-[var(--cb-blocked-fg)]">{cases.length}</span>
            </h3>

            {(cases.length > 0 || onQuickAdd) && (
              <div className="overflow-hidden rounded-xl border border-border bg-surface">
                {cases.length > 0 && <div className={`${grid} h-[38px] border-b border-border bg-surface-subtle text-xs font-semibold tracking-[0.04em] text-ink-muted uppercase`}>
                  <span>
                    <input type="checkbox" aria-label={t('cases.list.selectAll')} checked={allChecked} onChange={() => onToggleAll(cases.map((c) => c.id))} className="m-0 size-4 accent-accent" />
                  </span>
                  <span>{t('cases.list.id')}</span>
                  <span>{t('cases.list.title')}</span>
                  <span>{t('cases.list.status')}</span>
                  <span />
                </div>}

                {cases.map((c) => {
                  const current = c.id === selectedId
                  return (
                    <div
                      key={c.id}
                      ref={current ? selectedRow : undefined}
                      onClick={() => onOpen(c.id)}
                      className={`${grid} cursor-pointer border-b border-border-subtle ${onQuickAdd ? '' : 'last:border-b-0'} ${current ? 'bg-accent-tint-2 shadow-[inset_3px_0_0_var(--cb-accent)]' : checked.has(c.id) ? 'bg-row-checked' : 'bg-surface'}`}
                    >
                      <span onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" aria-label={t('cases.list.select', { id: c.id })} checked={checked.has(c.id)} onChange={() => onToggle(c.id)} className="m-0 size-4 accent-accent" />
                      </span>
                      <span className="font-mono text-xs text-ink-muted">{c.id}</span>
                      <button
                        type="button"
                        aria-current={current ? 'true' : undefined}
                        className={`min-w-0 cursor-pointer truncate border-0 bg-transparent py-2.5 text-left text-ink ${current ? 'font-semibold' : 'font-medium'}`}
                      >
                        {c.title}
                      </button>
                      <CaseStatusChip status={c.status} />
                      {current ? <ChevronLeft size={16} aria-hidden="true" className="text-accent" /> : <ChevronRight size={16} aria-hidden="true" className="text-ink-subtle" />}
                    </div>
                  )
                })}
                {onQuickAdd && <QuickAdd onAdd={(title) => onQuickAdd(title, section.id)} />}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function QuickAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  return (
    // Baris terakhir tabel: kolom grid sama dengan baris case supaya terasa satu daftar.
    <div className={`${grid} bg-surface focus-within:bg-surface-subtle`}>
      <Plus size={16} aria-hidden="true" className="text-ink-subtle" />
      <input
        type="text"
        value={title}
        aria-label={t('cases.list.quickLabel')}
        placeholder={t('cases.list.quickPlaceholder')}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && title.trim()) {
            onAdd(title.trim())
            setTitle('')
          }
        }}
        className="col-span-4 h-10 min-w-0 border-0 bg-transparent text-ink outline-none placeholder:text-ink-subtle"
      />
    </div>
  )
}
