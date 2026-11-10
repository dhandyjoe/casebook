import { ChevronDown, Folder, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { personOf } from '@/features/people/data'
import { CountBar } from './status'
import { StatusMenu } from './StatusMenu'
import { STATUS_ORDER, countTests, type ResultStatus, type RunTest, type TestStatus } from './domain'

export interface TestGroup { id: string; name: string; depth: number; tests: RunTest[] }

interface Props {
  title: string
  total: number
  executed: number
  groups: TestGroup[]
  selectedId: string | undefined
  query: string
  onQuery: (q: string) => void
  statuses: Set<TestStatus>
  onStatuses: (s: Set<TestStatus>) => void
  mine: boolean
  onMine: (m: boolean) => void
  disabledReason?: string
  onOpen: (id: string) => void
  onPick: (test: RunTest, status: ResultStatus) => void
}

const row = 'grid grid-cols-[62px_minmax(0,1fr)_28px_128px] items-center gap-2.5 px-3.5'
const empty = (c: ReturnType<typeof countTests>) => c

export function TestList(p: Props) {
  const { t } = useTranslation()
  const [menu, setMenu] = useState(false)
  const menuRoot = useRef<HTMLDivElement>(null)
  const selectedRow = useRef<HTMLDivElement>(null)
  const shown = p.groups.reduce((n, g) => n + g.tests.length, 0)

  useEffect(() => { selectedRow.current?.scrollIntoView?.({ block: 'nearest' }) }, [p.selectedId])
  useEffect(() => {
    if (!menu) return
    const close = (e: Event) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return
      if (e.type === 'mousedown' && menuRoot.current?.contains(e.target as Node)) return
      setMenu(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [menu])

  return (
    <section aria-labelledby="list-title" className="box-border flex min-w-0 flex-[3_1_420px] flex-col gap-3 p-5 lg:min-w-[320px] lg:flex-1 lg:basis-0">
      <div className="flex flex-wrap items-center gap-2.5 text-ink-secondary">
        <Folder size={18} aria-hidden="true" />
        <h2 id="list-title" className="m-0 text-base font-bold text-ink">{p.title}</h2>
        <span className="rounded-full bg-[#DCE2EC] px-2 text-xs leading-5 font-semibold text-[var(--cb-blocked-fg)]">{t('runs.tests', { count: p.total })}</span>
        <span className="ml-auto text-[13px] text-ink-muted">{t('runs.detail.executedCount', { done: p.executed, total: p.total })}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="box-border flex h-9 flex-[1_1_200px] items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-ink-subtle">
          <Search size={16} aria-hidden="true" />
          <input type="search" value={p.query} onChange={(e) => p.onQuery(e.target.value)} aria-label={t('runs.detail.searchLabel')} placeholder={t('runs.detail.searchPlaceholder')} className="min-w-0 flex-1 border-0 bg-transparent text-ink outline-none" />
        </label>
        <div ref={menuRoot} className="relative">
          <button
            type="button" aria-haspopup="true" aria-expanded={menu} onClick={() => setMenu((m) => !m)}
            className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-md border bg-surface px-3 text-ink-secondary ${p.statuses.size ? 'border-accent text-accent-hover' : 'border-border-strong'}`}
          >
            {t('runs.detail.statusFilter')}{p.statuses.size > 0 && <span className="rounded-full bg-accent px-1.5 text-xs font-semibold text-white">{p.statuses.size}</span>}
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {menu && (
            <div role="group" aria-label={t('runs.detail.statusFilterLabel')} className="absolute top-10 left-0 z-10 flex w-48 flex-col gap-0.5 rounded-lg border border-border bg-surface p-1.5 shadow-pop">
              {STATUS_ORDER.map((s) => (
                <label key={s} className="flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 hover:bg-accent-tint-3">
                  <input
                    type="checkbox" checked={p.statuses.has(s)} className="m-0 size-4 accent-accent"
                    onChange={() => { const n = new Set(p.statuses); if (n.has(s)) n.delete(s); else n.add(s); p.onStatuses(n) }}
                  />
                  <span className="size-2 rounded-full" style={{ background: `var(--cb-${s})` }} />
                  {t(`runs.testStatus.${s}`)}
                </label>
              ))}
            </div>
          )}
        </div>
        <label className="flex h-9 cursor-pointer items-center gap-2 text-ink-secondary">
          <input type="checkbox" checked={p.mine} onChange={(e) => p.onMine(e.target.checked)} className="m-0 size-4 accent-accent" />
          {t('runs.detail.assignedToMe')}
        </label>
      </div>

      <div className="flex flex-col gap-3.5">
        {p.groups.map((g) => {
          const counts = empty(countTests(g.tests))
          return (
            <section
              key={g.id} aria-label={g.name}
              style={g.depth ? { marginLeft: Math.min(g.depth, 4) * 20 } : undefined}
              className={`flex flex-col gap-2.5 ${g.depth ? 'border-l border-[var(--cb-sidebar-guide)] pl-3.5' : ''}`}
            >
              <h3 className="m-0 flex items-center gap-2 text-[15px] font-bold">
                {g.name}
                <span className="rounded-full bg-[#DCE2EC] px-2 text-[11px] leading-[18px] font-semibold text-[var(--cb-blocked-fg)]">{g.tests.length}</span>
                {g.tests.length > 0 && <CountBar counts={counts} className="h-1.5 w-16 rounded-[3px]" />}
                {g.tests.length > 0 && <span className="ml-auto text-[13px] font-medium text-ink-muted">{t('runs.detail.executedCount', { done: g.tests.length - counts.untested, total: g.tests.length })}</span>}
              </h3>
              {g.tests.length > 0 && (
                <div className="rounded-xl border border-border bg-surface">
                  <div className={`${row} h-[38px] rounded-t-xl border-b border-border bg-surface-subtle text-xs font-semibold tracking-[0.04em] text-ink-muted uppercase`}>
                    <span>{t('cases.list.id')}</span>
                    <span>{t('cases.list.title')}</span>
                    <span />
                    <span>{t('cases.list.status')}</span>
                  </div>
                  {g.tests.map((test) => {
                    const current = test.id === p.selectedId
                    const who = personOf(test.assignee)
                    const last = test.results[0]
                    return (
                      <div
                        key={test.id} ref={current ? selectedRow : undefined}
                        className={`${row} relative border-b border-border-subtle last:rounded-b-xl last:border-b-0 ${current ? 'bg-accent-tint-2 shadow-[inset_3px_0_0_var(--cb-accent)]' : 'bg-surface'}`}
                      >
                        <span className="font-mono text-xs text-ink-muted">T-{test.number}</span>
                        <button type="button" aria-current={current ? 'true' : undefined} onClick={() => p.onOpen(test.id)} className={`min-w-0 cursor-pointer truncate border-0 bg-transparent py-2.5 text-left text-ink ${current ? 'font-semibold' : 'font-medium'}`}>
                          {test.snapshot.title}
                        </button>
                        <span title={who.name} className="flex size-[26px] items-center justify-center rounded-full text-[10px] font-semibold" style={{ background: who.bg, color: who.fg }}>{who.key}</span>
                        <StatusMenu test={test} disabledReason={p.disabledReason} onPick={(s) => p.onPick(test, s)} />
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
        {shown === 0 && <p className="m-0 rounded-xl border border-border bg-surface px-5 py-8 text-center text-ink-muted">{t('runs.detail.noTests')}</p>}
      </div>
      <p className="m-0 text-xs text-ink-subtle">{t('runs.detail.listHint')}</p>
    </section>
  )
}
