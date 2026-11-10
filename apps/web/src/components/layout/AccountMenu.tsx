import { LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { signOut } from '@/features/auth/api'
import { useAuth } from '@/features/auth/session'

export function AccountMenu() {
  const { t } = useTranslation()
  const session = useAuth((s) => s.session)!
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
        aria-label={t('header.account', { name: session.name })}
        onClick={() => setOpen((o) => !o)}
        className="flex size-[38px] cursor-pointer items-center justify-center rounded-full border-0 bg-[#D6E4F2] font-semibold text-[#1F4F82]"
      >
        {session.initials}
      </button>
      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 z-20 flex w-[220px] flex-col rounded-lg border border-border bg-surface p-1.5 text-ink shadow-pop">
          <div className="truncate px-2.5 py-1.5 text-[13px] font-semibold">{session.name}</div>
          <button
            type="button"
            onClick={() => signOut()}
            className="flex h-8 cursor-pointer items-center gap-2 rounded-sm border-0 bg-transparent px-2.5 text-left text-ink hover:bg-accent-tint-2"
          >
            <LogOut size={14} aria-hidden="true" />
            {t('header.signOut')}
          </button>
        </div>
      )}
    </div>
  )
}
