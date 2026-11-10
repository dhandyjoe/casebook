import { Link, useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjects } from './hooks'

export function ProjectSearch() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: projects = [] } = useProjects()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

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
  const results = term ? projects.filter((p) => `${p.name} ${p.description}`.toLowerCase().includes(term)) : []

  function go(id: string) {
    setOpen(false)
    setQ('')
    void navigate({ to: '/p/$projectId/cases', params: { projectId: id } })
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
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); input.current?.blur() }
            if (e.key === 'Enter' && results[0]) go(results[0].id)
          }}
          className="min-w-0 flex-1 border-0 bg-transparent text-ink outline-none"
        />
        <kbd className="rounded-xs border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">/</kbd>
      </label>
      {open && term && (
        <ul aria-label={t('header.searchResults')} className="absolute top-[calc(100%+6px)] right-0 left-0 z-20 m-0 flex list-none flex-col rounded-lg border border-border bg-surface p-1.5 text-ink shadow-pop">
          {results.length === 0 && <li className="px-2.5 py-2 text-ink-muted">{t('header.searchEmpty', { query: q.trim() })}</li>}
          {results.map((p) => (
            <li key={p.id}>
              <Link to="/p/$projectId/cases" params={{ projectId: p.id }} onClick={() => { setOpen(false); setQ('') }} className="flex h-8 items-center gap-2 rounded-sm px-2.5 text-ink no-underline hover:bg-accent-tint-2">
                <span className="size-2.5 flex-none rounded-xs" style={{ background: p.color }} />
                <span className="truncate">{p.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
