import { Link } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Project } from '@/features/projects/api'
import { useProjects } from '@/features/projects/hooks'

export function ProjectSwitcher({ project }: { project: Project }) {
  const { t } = useTranslation()
  const { data: projects = [] } = useProjects()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return
      if (e.type === 'mousedown' && root.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t('header.switchProject', { name: project.name })}
        onClick={() => setOpen((o) => !o)}
        className="flex h-[38px] cursor-pointer items-center gap-2 rounded-md border border-header-line bg-transparent px-3 font-medium text-white"
      >
        <span className="size-2.5 rounded-xs" style={{ background: project.color }} />
        {project.name}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <ul className="absolute top-[calc(100%+6px)] left-0 z-20 m-0 flex w-[260px] list-none flex-col rounded-lg border border-border bg-surface p-1.5 text-ink shadow-pop">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                to="/p/$projectId/cases"
                params={{ projectId: p.id }}
                onClick={() => setOpen(false)}
                aria-current={p.id === project.id ? 'true' : undefined}
                className="flex h-8 items-center gap-2 rounded-sm px-2.5 text-ink no-underline hover:bg-accent-tint-2 aria-[current=true]:font-semibold"
              >
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
