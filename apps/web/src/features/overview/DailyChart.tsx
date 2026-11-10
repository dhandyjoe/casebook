import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RESULT_STATUSES } from '@/features/runs/domain'
import { formatDate } from '@/lib/time'
import type { Day } from './api'

const RANGES = [7, 14]
const totalOf = (d: Day) => RESULT_STATUSES.reduce((n, s) => n + d[s], 0)
const isWeekend = (day: string) => [0, 6].includes(new Date(`${day}T00:00:00`).getDay())
const monthShort = (day: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${day}T00:00:00`))

/** Bar bertumpuk jumlah hasil per hari dengan pilihan 7/14 hari; tabel tersembunyi untuk pembaca layar. */
export function DailyChart({ days: all, className }: { days: Day[]; className: string }) {
  const { t } = useTranslation()
  const [range, setRange] = useState(14)
  const days = all.slice(-range)
  const sum = Object.fromEntries(RESULT_STATUSES.map((s) => [s, days.reduce((n, d) => n + d[s], 0)])) as Record<(typeof RESULT_STATUSES)[number], number>
  // Sumbu Y dibagi 4 garis; batas atas dibulatkan agar tick-nya bilangan bulat.
  const max = Math.max(4, Math.ceil(Math.max(...days.map(totalOf)) / 4) * 4)
  const empty = days.every((d) => totalOf(d) === 0)
  const title = t('overview.dailyTitle', { count: days.length })

  return (
    <section aria-labelledby="ov-daily" className={`${className} flex flex-col gap-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="ov-daily" className="m-0 text-base font-semibold">{t('overview.chartTitle')}</h2>
          <p className="mt-0.5 mb-0 text-[13px] text-ink-muted">{t('overview.chartSub')}</p>
        </div>
        <div role="radiogroup" aria-label={t('overview.chartRange')} className="flex gap-1 rounded-[10px] bg-track p-1">
          {RANGES.map((r) => (
            <button key={r} type="button" role="radio" aria-checked={range === r} onClick={() => setRange(r)} className={`h-[30px] cursor-pointer rounded-[7px] border-0 px-3 text-[13px] text-ink ${range === r ? 'bg-surface font-semibold shadow-sm' : 'bg-transparent font-medium'}`}>
              {t('overview.rangeDays', { count: r })}
            </button>
          ))}
        </div>
      </div>

      <ul className="m-0 flex list-none flex-wrap gap-3.5 p-0 text-xs text-ink-muted">
        {RESULT_STATUSES.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: `var(--cb-${s})` }} />
            {t(`runs.testStatus.${s}`)}
          </li>
        ))}
      </ul>

      <div className="flex gap-2.5">
        <div aria-hidden="true" className="flex h-[220px] w-7 flex-none flex-col justify-between text-right text-[11px] text-ink-muted">
          {[4, 3, 2, 1, 0].map((k) => <span key={k} className="leading-none">{(max / 4) * k}</span>)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div role="img" aria-label={`${title}: ${RESULT_STATUSES.map((s) => `${sum[s]} ${t(`runs.testStatus.${s}`).toLowerCase()}`).join(', ')}`} className="relative flex h-[220px] items-end gap-1.5 border-b border-border-strong sm:gap-2">
            {[25, 50, 75].map((p) => <div key={p} aria-hidden="true" className="absolute inset-x-0 border-t border-border-subtle" style={{ bottom: `${p}%` }} />)}
            {empty && <p className="absolute inset-0 m-0 flex items-center justify-center text-ink-muted">{t('overview.noDaily')}</p>}
            {days.map((d) => (
              <div key={d.day} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
                <div className="flex flex-col-reverse overflow-hidden rounded-t-[4px]" style={{ height: `${(totalOf(d) / max) * 100}%` }}>
                  {RESULT_STATUSES.filter((s) => d[s] > 0).map((s) => (
                    <div key={s} style={{ flex: `${d[s]} 1 0`, background: `var(--cb-${s})` }} />
                  ))}
                </div>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max -translate-x-1/2 rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md group-hover:block">
                  <div className="mb-1 font-semibold">{formatDate(`${d.day}T00:00:00`)}</div>
                  {RESULT_STATUSES.map((s) => <div key={s} className="text-ink-secondary">{d[s]} {t(`runs.testStatus.${s}`)}</div>)}
                </div>
              </div>
            ))}
          </div>
          <div aria-hidden="true" className="flex gap-1.5 sm:gap-2">
            {days.map((d, i) => (
              <span key={d.day} className={`min-w-0 flex-1 text-center text-[11px] whitespace-nowrap ${i === days.length - 1 ? 'font-bold text-ink-secondary' : isWeekend(d.day) ? 'text-ink-subtle' : 'text-ink-muted'}`}>
                {i === 0 || d.day.endsWith('-01') ? monthShort(d.day) : Number(d.day.slice(8))}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="m-0 text-[13px] text-ink-secondary">
        {t('overview.chartSummary', { count: days.length, passed: sum.passed, failed: sum.failed, blocked: sum.blocked, retest: sum.retest })}
      </p>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead><tr><th>{t('overview.date')}</th>{RESULT_STATUSES.map((s) => <th key={s}>{t(`runs.testStatus.${s}`)}</th>)}</tr></thead>
        <tbody>
          {days.map((d) => <tr key={d.day}><th>{formatDate(`${d.day}T00:00:00`)}</th>{RESULT_STATUSES.map((s) => <td key={s}>{d[s]}</td>)}</tr>)}
        </tbody>
      </table>
    </section>
  )
}
