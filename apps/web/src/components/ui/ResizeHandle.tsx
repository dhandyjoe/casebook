import { GripVertical } from 'lucide-react'
import { useRef, useState } from 'react'

export interface PaneSize {
  value: number
  min: number
  max: number
  set: (v: number) => void
  reset: () => void
}

/**
 * Pemisah kolom yang bisa digeser (mouse/sentuh), diatur dengan panah kiri/kanan
 * (Shift = langkah besar, Home/End = batas), dan dikembalikan ke ukuran awal dengan klik ganda.
 * direction: +1 bila menggeser ke kanan memperbesar kolom, -1 bila memperkecil.
 * Pegangan (grip) selalu terlihat dan menempel di tengah layar saat halaman digulir.
 */
export function ResizeHandle({ label, hint, size, direction }: { label: string; hint: string; size: PaneSize; direction: 1 | -1 }) {
  const drag = useRef<{ x: number; start: number } | null>(null)
  const [active, setActive] = useState(false)
  const clamp = (v: number) => Math.round(Math.min(size.max, Math.max(size.min, v)))

  const stop = () => {
    drag.current = null
    setActive(false)
  }

  return (
    <div className="relative hidden w-0 flex-none self-stretch lg:block">
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        aria-valuenow={Math.round(size.value)}
        aria-valuemin={size.min}
        aria-valuemax={Math.round(size.max)}
        tabIndex={0}
        onPointerDown={(e) => {
          e.preventDefault()
          e.currentTarget.setPointerCapture?.(e.pointerId)
          drag.current = { x: e.clientX, start: size.value }
          setActive(true)
        }}
        onPointerMove={(e) => {
          if (drag.current) size.set(clamp(drag.current.start + direction * (e.clientX - drag.current.x)))
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onDoubleClick={size.reset}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 48 : 16
          const next =
            e.key === 'ArrowRight' ? size.value + direction * step
            : e.key === 'ArrowLeft' ? size.value - direction * step
            : e.key === 'Home' ? size.min
            : e.key === 'End' ? size.max
            : null
          if (next === null) return
          e.preventDefault()
          size.set(clamp(next))
        }}
        className="group absolute inset-y-0 -left-[7px] z-10 w-[14px] cursor-col-resize touch-none outline-none"
      >
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 transition-colors ${
            active ? 'bg-accent' : 'bg-transparent group-hover:bg-accent/60 group-focus-visible:bg-accent'
          }`}
        />
        {/* Jangkar sticky: pegangan tetap terlihat di tengah layar walau daftar sangat panjang. */}
        <div aria-hidden="true" className="pointer-events-none sticky top-[45vh] flex h-0 justify-center">
          <span
            className={`relative -top-5 flex h-10 w-[14px] items-center justify-center rounded-full border shadow-sm transition-colors ${
              active
                ? 'border-accent bg-accent text-white'
                : 'border-border-strong bg-surface text-ink-muted group-hover:border-accent group-hover:bg-accent group-hover:text-white group-focus-visible:border-accent group-focus-visible:bg-accent group-focus-visible:text-white'
            }`}
          >
            <GripVertical size={12} strokeWidth={2.4} />
            <span
              className={`absolute bottom-full mb-2 rounded-md bg-[var(--cb-bulkbar)] px-2 py-1 text-xs font-medium whitespace-nowrap text-white shadow-pop ${
                active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
              }`}
            >
              {active ? `${Math.round(size.value)} px` : hint}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}
