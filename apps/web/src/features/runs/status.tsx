import { useTranslation } from 'react-i18next'
import { STATUS_ORDER, percentages, type Counts, type RunStatus, type TestStatus } from './domain'

const RUN_TOKEN: Record<RunStatus, [bg: string, fg: string]> = {
  draft: ['--cb-draft-bg', '--cb-draft-fg'],
  active: ['--cb-run-active-bg', '--cb-run-active-fg'],
  done: ['--cb-run-done-bg', '--cb-run-done-fg'],
}

/** Status run / plan: Draft, Active, Done (design.md 2.6). */
export function RunStatusChip({ status, small = true }: { status: RunStatus; small?: boolean }) {
  const { t } = useTranslation()
  const [bg, fg] = RUN_TOKEN[status]
  return (
    <span
      className={`rounded-full font-semibold ${small ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-[3px] text-xs'}`}
      style={{ background: `var(${bg})`, color: `var(${fg})` }}
    >
      {t(`runs.status.${status}`)}
    </span>
  )
}

/** Status hasil test: warna, label, dan titik yang sama di seluruh app (design.md 2.4). */
export function TestStatusChip({ status }: { status: TestStatus }) {
  const { t } = useTranslation()
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-xs font-semibold"
      style={{ background: `var(--cb-${status}-bg)`, color: `var(--cb-${status}-fg)`, borderColor: `var(--cb-${status}-border)` }}
    >
      <span className="size-1.5 rounded-full" style={{ background: `var(--cb-${status})` }} />
      {t(`runs.testStatus.${status}`)}
    </span>
  )
}

/** Progress bar bertumpuk Passed → Failed → Blocked → Retest → Untested. */
export function CountBar({ counts, className = 'h-2 rounded-sm' }: { counts: Counts; className?: string }) {
  const pct = percentages(counts)
  return (
    <div aria-hidden="true" className={`flex overflow-hidden bg-track ${className}`}>
      {STATUS_ORDER.map((k, i) => (
        <div key={k} style={{ width: `${pct[i]}%`, background: `var(--cb-${k})` }} />
      ))}
    </div>
  )
}
