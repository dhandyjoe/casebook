import { useEffect, useRef, type ReactNode } from 'react'

/** Dialog modal bawaan browser: focus trap, Esc, dan fokus kembali ke pembuka sudah ditangani <dialog>. */
export function Dialog({
  open, onClose, labelledBy, maxWidth = 720, children,
}: { open: boolean; onClose: () => void; labelledBy: string; maxWidth?: number; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      style={{ maxWidth }}
      className="m-auto w-full flex-col overflow-hidden rounded-2xl border-0 bg-surface p-0 text-ink shadow-dialog backdrop:bg-[var(--cb-overlay)] open:flex max-h-[calc(100vh-48px)]"
    >
      {open && children}
    </dialog>
  )
}
