import type { TFunction } from 'i18next'

/** Waktu relatif sesuai design.md bagian 9; di atas seminggu jadi tanggal "5 Nov 2026, 14:12". */
export function relativeTime(t: TFunction, iso: string, now = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return t('time.justNow')
  if (minutes < 60) return t('time.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('time.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  if (days === 1) return t('time.yesterday')
  if (days < 7) return t('time.daysAgo', { count: days })
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
}

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

/** Tanggal lokal `YYYY-MM-DD`, dipakai sebagai id dokumen `daily`. */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** `n` hari terakhir sampai `now`, terlama di depan. */
export const lastDays = (n: number, now = new Date()) =>
  Array.from({ length: n }, (_, i) => dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1 - i))))

/** Selisih hari kalender dari `now` ke tanggal (positif = di depan). */
export function daysUntil(isoDate: string, now = new Date()): number {
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((day(new Date(`${isoDate}T00:00:00`)) - day(now)) / 86_400_000)
}
