import { useQueries } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listCases } from '@/features/cases/api'
import { listMilestones } from '@/features/milestones/api'
import type { Project } from '@/features/projects/api'
import { useProjects } from '@/features/projects/hooks'
import { listRuns } from '@/features/runs/api'

type Kind = 'project' | 'milestone' | 'run' | 'case'
type Hit = { kind: Kind; id: string; name: string; project: Project; sectionId?: string }

const PER_KIND = 5
const MENU: Record<Kind, string> = { project: 'nav.cases', milestone: 'nav.milestones', run: 'nav.runs', case: 'nav.cases' }

/**
 * Cari project, milestone, test run, dan test case di semua project workspace.
 * Data dibaca saat kotak pertama kali difokus, memakai kunci cache yang sama dengan halaman masing-masing.
 * shortcut: baca semua milestone, run, dan case per project; ganti ke index pencarian bila workspace tumbuh ke ribuan case.
 */
export function GlobalSearch() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: projects = [] } = useProjects()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [armed, setArmed] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  const milestones = useQueries({ queries: projects.map((p) => ({ queryKey: ['milestones', p.id], queryFn: () => listMilestones(p.id), enabled: armed })) })
  const runs = useQueries({ queries: projects.map((p) => ({ queryKey: ['runs', p.id], queryFn: () => listRuns(p.id), enabled: armed })) })
  const cases = useQueries({ queries: projects.map((p) => ({ queryKey: ['cases', p.id, 'list'], queryFn: () => listCases(p.id), enabled: armed })) })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key !== '/' || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return
      e.preventDefault()
      input.current?.focus()
    }
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [])

  const term = q.trim().toLowerCase()
  const has = (text: string) => text.toLowerCase().includes(term)
  const top = (hits: Hit[]) => hits.slice(0, PER_KIND)
  const hits: Hit[] = term ? [
    ...top(projects.filter((p) => has(`${p.name} ${p.description}`)).map((p) => ({ kind: 'project', id: p.id, name: p.name, project: p }))),
    ...top(projects.flatMap((p, i) => (milestones[i]?.data ?? []).filter((m) => has(m.name)).map((m): Hit => ({ kind: 'milestone', id: m.id, name: m.name, project: p })))),
    ...top(projects.flatMap((p, i) => (runs[i]?.data ?? []).filter((r) => has(r.name)).map((r): Hit => ({ kind: 'run', id: r.id, name: r.name, project: p })))),
    ...top(projects.flatMap((p, i) => (cases[i]?.data ?? []).filter((c) => has(`${c.id} ${c.title}`)).map((c): Hit => ({ kind: 'case', id: c.id, name: c.title, project: p, sectionId: c.sectionId })))),
  ] : []
  const loading = [...milestones, ...runs, ...cases].some((r) => r.isPending)

  function go(h: Hit) {
    setOpen(false)
    setQ('')
    input.current?.blur()
    const params = { projectId: h.project.id }
    if (h.kind === 'project') void navigate({ to: '/p/$projectId/cases', params })
    else if (h.kind === 'milestone') void navigate({ to: '/p/$projectId/milestones', params, search: { m: h.id } })
    else if (h.kind === 'run') void navigate({ to: '/p/$projectId/runs/$runId', params: { ...params, runId: h.id } })
    else void navigate({ to: '/p/$projectId/cases', params, search: { section: h.sectionId, case: h.id } })
  }

  return (
    <div ref={root} className="relative w-full max-w-[380px]">
      <label className="flex h-[38px] w-full items-center gap-2 rounded-md bg-header-search px-3 text-sidebar-text">
        <Search size={16} aria-hidden="true" />
        <input
          ref={input}
          type="search"
          value={q}
          aria-label={t('header.searchLabel')}
          placeholder={t('header.searchPlaceholder')}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => { setArmed(true); setOpen(true) }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); input.current?.blur() }
            if (e.key === 'Enter' && hits[0]) go(hits[0])
          }}
          className="min-w-0 flex-1 border-0 bg-transparent text-ink outline-none"
        />
        <kbd className="rounded-xs border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">/</kbd>
      </label>
      {open && term && (
        <ul aria-label={t('header.searchResults')} className="absolute top-[calc(100%+6px)] right-0 left-0 z-20 m-0 flex max-h-[420px] list-none flex-col overflow-y-auto rounded-lg border border-border bg-surface p-1.5 text-ink shadow-pop">
          {hits.map((h) => (
            <li key={`${h.kind}/${h.project.id}/${h.id}`}>
              <button type="button" onClick={() => go(h)} className="flex w-full cursor-pointer items-center gap-2.5 rounded-sm border-0 bg-transparent px-2.5 py-1.5 text-left text-ink hover:bg-accent-tint-2">
                <span className="size-2.5 flex-none rounded-xs" style={{ background: h.project.color }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{h.kind === 'case' ? `${h.id} · ${h.name}` : h.name}</span>
                  <span className="block truncate text-xs text-ink-subtle">{h.kind === 'project' ? t(MENU.project) : `${h.project.name} · ${t(MENU[h.kind])}`}</span>
                </span>
                <span className="flex-none rounded-full bg-[var(--cb-draft-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--cb-blocked-fg)]">{t(`header.kind.${h.kind}`)}</span>
              </button>
            </li>
          ))}
          {hits.length === 0 && <li className="px-2.5 py-2 text-ink-muted">{loading ? t('header.searching') : t('header.searchEmpty', { query: q.trim() })}</li>}
          {hits.length > 0 && loading && <li className="px-2.5 py-1.5 text-xs text-ink-subtle">{t('header.searching')}</li>}
        </ul>
      )}
    </div>
  )
}
