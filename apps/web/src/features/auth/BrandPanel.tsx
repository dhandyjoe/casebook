import { BookCheck, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const SEGMENTS = [
  { key: 'passed', count: 205, width: '75%', color: 'bg-passed' },
  { key: 'failed', count: 14, width: '5%', color: 'bg-failed' },
  { key: 'blocked', count: 5, width: '2%', color: 'bg-blocked' },
  { key: 'retest', count: 7, width: '2%', color: 'bg-retest' },
  { key: 'untested', count: 43, width: '16%', color: 'bg-untested' },
] as const

function delay(seconds: number) {
  return { animationDelay: `${seconds}s` }
}

export function BrandPanel() {
  const { t } = useTranslation()
  const benefits = t('signIn.benefits', { returnObjects: true }) as string[]

  return (
    <section className="flex flex-1 basis-[520px] flex-col justify-between gap-10 bg-header px-6 py-12 text-white sm:px-14">
      <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
        <span className="flex size-8 animate-pop items-center justify-center rounded-md bg-accent">
          <BookCheck size={18} aria-hidden="true" />
        </span>
        {t('brand')}
      </div>

      <div className="flex max-w-[520px] flex-col gap-7">
        <div>
          <h1 className="mb-3 animate-rise text-4xl leading-tight font-bold tracking-[-0.02em]" style={delay(0.1)}>
            {t('signIn.heroTitle')}
          </h1>
          <p className="animate-rise text-base leading-relaxed text-[#C5D2DE]" style={delay(0.2)}>
            {t('signIn.heroBody')}
          </p>
        </div>

        <div
          aria-hidden="true"
          className="flex animate-rise flex-col gap-3.5 rounded-xl border border-border bg-surface p-5 text-ink shadow-preview"
          style={{ animation: 'cbRise 0.6s ease-out 0.3s both, cbFloat 6s ease-in-out 1.6s infinite' }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-semibold">
                <span className="size-2 rounded-full bg-passed animate-pulse-ring" style={delay(1.4)} />
                {t('signIn.preview.name')}
              </div>
              <div className="mt-0.5 text-xs text-ink-subtle">{t('signIn.preview.meta')}</div>
            </div>
            <div className="animate-fade text-[22px] font-bold" style={delay(1.3)}>84%</div>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-[5px] bg-track">
            <div className="flex w-full animate-fill" style={delay(0.6)}>
              {SEGMENTS.map((s) => (
                <div key={s.key} className={s.color} style={{ width: s.width }} />
              ))}
            </div>
          </div>
          <div className="flex animate-fade flex-wrap gap-3.5 text-xs text-ink-muted" style={delay(1.2)}>
            {SEGMENTS.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5">
                <span className={`size-2 rounded-xs ${s.color}`} />
                {t(`signIn.preview.${s.key}`, { count: s.count })}
              </span>
            ))}
          </div>
        </div>

        <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[#E4ECF3]">
          {benefits.map((text, i) => (
            <li key={text} className="flex animate-rise items-center gap-2.5" style={delay(0.5 + i * 0.1)}>
              <Check size={18} strokeWidth={2.2} aria-hidden="true" className="flex-none animate-pop text-[#7FD18A]" style={delay(0.65 + i * 0.1)} />
              {text}
            </li>
          ))}
        </ul>
      </div>

      <div className="text-xs text-[#A9BBCD]">{t('signIn.copyright')}</div>
    </section>
  )
}
