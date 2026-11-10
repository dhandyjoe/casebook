import { useTranslation } from 'react-i18next'
import { CountBar } from './status'
import { STATUS_ORDER, percentages, totalOf, type Counts } from './domain'

/** Donut + legenda (kiri) dan kartu % passed (kanan), di atas layar eksekusi (RUN-08). */
export function RunSummary({ counts }: { counts: Counts }) {
  const { t } = useTranslation()
  const total = totalOf(counts)
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)
  const exec = total - counts.untested

  let acc = 0
  const stops = percentages(counts).map((p, i) => {
    const from = acc
    acc += p
    return `var(--cb-${STATUS_ORDER[i]}) ${from.toFixed(2)}% ${acc.toFixed(2)}%`
  })
  const label = t('runs.detail.chart', { parts: STATUS_ORDER.map((k) => `${counts[k]} ${t(`runs.testStatus.${k}`)}`).join(', ') })

  return (
    <div className="flex flex-wrap gap-4 px-5 pt-5">
      <section aria-label={t('runs.detail.summary')} className="box-border flex min-w-0 flex-[2_1_520px] flex-wrap items-center gap-x-9 gap-y-6 rounded-xl border border-border bg-surface px-7 py-6">
        <div role="img" aria-label={label} className="relative size-[168px] flex-none rounded-full" style={{ background: `conic-gradient(${stops.join(', ')})` }}>
          <div className="absolute inset-[30px] flex flex-col items-center justify-center rounded-full bg-surface">
            <span className="text-[26px] font-bold tracking-[-0.02em]">{total}</span>
            <span className="text-xs text-ink-muted">{t('runs.detail.totalTests')}</span>
          </div>
        </div>
        <div className="grid flex-[1_1_280px] grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-7 gap-y-[18px]">
          {STATUS_ORDER.map((k) => (
            <div key={k} className="flex items-start gap-3">
              <span className="mt-[3px] size-3.5 flex-none rounded-full shadow-[inset_0_0_0_1px_rgba(22,24,29,0.08)]" style={{ background: `var(--cb-${k})` }} />
              <div>
                <div className="font-semibold">{counts[k]} {t(`runs.testStatus.${k}`)}</div>
                <div className="text-xs text-ink-subtle">{t('runs.detail.ofAll', { pct: pct(counts[k]) })}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-label={t('runs.detail.passedCard')} className="box-border flex min-w-0 flex-[1_1_280px] flex-col items-center justify-center rounded-xl border border-border bg-surface px-7 py-6 text-center">
        <div className="text-[56px] leading-none font-bold tracking-[-0.03em] text-[var(--cb-approved-fg)]">{pct(counts.passed)}%</div>
        <div className="mt-1.5 text-lg text-ink-secondary">{t('runs.detail.passedWord')}</div>
        <div className="mt-3 text-[13px] text-ink-muted">{t('runs.detail.untested', { n: counts.untested, total, pct: pct(counts.untested) })}</div>
        <CountBar counts={counts} className="mt-4 h-2 w-full max-w-[260px] rounded-sm" />
        <div className="mt-1.5 text-xs text-ink-subtle">{t('runs.detail.executed', { pct: pct(exec), tests: t('runs.tests', { count: exec }) })}</div>
      </section>
    </div>
  )
}
