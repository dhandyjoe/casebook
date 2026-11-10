import type { MilestoneState } from './domain'

const TOKEN: Record<MilestoneState, string> = { open: 'run-active', upcoming: 'draft', completed: 'run-done' }

export function StateChip({ state, label }: { state: MilestoneState; label: string }) {
  return (
    <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: `var(--cb-${TOKEN[state]}-bg)`, color: `var(--cb-${TOKEN[state]}-fg)` }}>{label}</span>
  )
}
