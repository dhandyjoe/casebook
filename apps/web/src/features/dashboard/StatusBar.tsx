import type { Segments } from '@/features/projects/api'

const COLORS = ['bg-passed', 'bg-failed', 'bg-blocked', 'bg-retest', 'bg-untested']

export function StatusBar({ segs }: { segs: Segments }) {
  return (
    <div aria-hidden="true" className="flex h-2 overflow-hidden rounded-sm bg-track">
      {segs.map((w, i) => (
        <div key={i} className={COLORS[i]} style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

export const STATUS_KEYS = ['passed', 'failed', 'blocked', 'retest', 'untested'] as const
export const STATUS_DOT = COLORS
