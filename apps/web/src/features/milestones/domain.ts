import type { TFunction } from 'i18next'
import { daysUntil, formatDate } from '@/lib/time'
import type { Milestone } from '@/features/runs/domain'

export type MilestoneState = 'open' | 'upcoming' | 'completed'

export const stateOf = (m: Milestone, now = new Date()): MilestoneState =>
  m.isCompleted ? 'completed' : m.startOn && daysUntil(m.startOn, now) > 0 ? 'upcoming' : 'open'

/** Waktu berjalan dari startOn ke dueOn; null bila startOn tidak diisi. */
export function elapsed(m: Milestone, now = new Date()): { pct: number; spent: number; total: number } | null {
  if (!m.startOn) return null
  const total = daysUntil(m.dueOn, now) - daysUntil(m.startOn, now)
  const spent = Math.min(Math.max(-daysUntil(m.startOn, now), 0), Math.max(total, 0))
  const pct = m.isCompleted ? 100 : total > 0 ? Math.round((spent / total) * 100) : 0
  return { pct, spent, total }
}

/** "27 Oct 2026 – 20 Nov 2026 · 15 days left" */
export function milestoneDates(t: TFunction, m: Milestone, state: MilestoneState): string {
  const range = m.startOn ? `${formatDate(m.startOn)} – ${formatDate(m.dueOn)}` : t('milestones.due', { date: formatDate(m.dueOn) })
  const days = daysUntil(m.dueOn)
  const note =
    state === 'completed' ? (m.completedOn ? t('milestones.completedOn', { date: formatDate(m.completedOn) }) : '')
    : state === 'upcoming' ? t('milestones.startsIn', { count: daysUntil(m.startOn) })
    : days < 0 ? t('milestones.overdue', { count: -days }) : days === 0 ? t('milestones.dueToday') : t('milestones.daysLeft', { count: days })
  return [range, note].filter(Boolean).join(' · ')
}
