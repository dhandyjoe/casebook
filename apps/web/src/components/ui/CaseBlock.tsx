import type { ReactNode } from 'react'

/** Blok isi case berwarna (design.md 2.7). Varian = prefix token --cb-<variant>-*. */
export type BlockVariant = 'detail' | 'pre' | 'steps' | 'exp'

export function CaseBlock({
  variant, icon, title, aside, children,
}: { variant: BlockVariant; icon: ReactNode; title: string; aside?: ReactNode; children: ReactNode }) {
  const v = `var(--cb-${variant}`
  return (
    <section className="overflow-hidden rounded-lg border" style={{ background: `${v}-bg)`, borderColor: `${v}-border)` }}>
      <h3
        className="m-0 flex items-center gap-2 border-b px-4 py-2.5 text-[13px] font-semibold"
        style={{ background: `${v}-head)`, color: `${v}-title)`, borderColor: `${v}-border)` }}
      >
        {icon}
        {title}
        {aside}
      </h3>
      {children}
    </section>
  )
}
