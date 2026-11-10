import { Link } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Info, ListOrdered } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CaseBlock } from '@/components/ui/CaseBlock'
import { ExpectedView } from '@/features/cases/ExpectedView'
import { personOf } from '@/features/people/data'
import { formatDateTime, relativeTime } from '@/lib/time'
import { EvidenceButton } from './EvidenceShot'
import { Lightbox } from './Lightbox'
import { ResultForm } from './ResultForm'
import { TestStatusChip } from './status'
import type { Evidence, ResultInput, RunTest } from './domain'

interface Props {
  projectId: string
  test: RunTest
  position: string
  blocked: 'draft' | null
  onPrev: () => void
  onNext: () => void
  onSave: (input: ResultInput, andNext: boolean) => void
}

const iconBtn = 'flex size-[34px] cursor-pointer items-center justify-center rounded-md border border-border-strong bg-surface text-ink-secondary'

export function TestDetail({ projectId, test, position, blocked, onPrev, onNext, onSave }: Props) {
  const { t } = useTranslation()
  const [shots, setShots] = useState<{ items: Evidence[]; index: number | null }>({ items: [], index: null })
  const snap = test.snapshot
  const who = personOf(test.assignee)

  return (
    <section aria-labelledby="t-title" className="box-border flex min-w-0 flex-[4_1_540px] flex-col self-start border-l border-border bg-surface lg:sticky lg:top-0 lg:max-h-screen lg:w-[var(--detail-w)] lg:flex-none lg:overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border px-5 py-3">
        <span className="font-mono text-[13px] text-ink-muted">T-{test.number} · {test.caseId}</span>
        <TestStatusChip status={test.status} />
        <div className="ml-auto flex items-center gap-1.5">
          <span className="mr-1 text-xs text-ink-muted">{position}</span>
          <button type="button" onClick={onPrev} aria-label={t('runs.detail.prev')} className={iconBtn}><ChevronLeft size={16} aria-hidden="true" /></button>
          <button type="button" onClick={onNext} aria-label={t('runs.detail.next')} className={iconBtn}><ChevronRight size={16} aria-hidden="true" /></button>
        </div>
      </div>

      <div className="flex flex-col gap-[18px] p-5">
        <div>
          <h2 id="t-title" className="m-0 text-xl font-bold tracking-tight">{snap.title}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: `var(--cb-priority-${snap.priority.toLowerCase()})` }} />{t(`cases.priority.${snap.priority}`)}</span>
            <span aria-hidden="true">·</span>
            <span>{t('runs.detail.assigned', { name: who.name })}</span>
            <span aria-hidden="true">·</span>
            <Link to="/p/$projectId/cases" params={{ projectId }} search={{ section: test.sectionId, case: test.caseId }} className="font-semibold text-accent no-underline">{t('runs.detail.openCase', { id: test.caseId })}</Link>
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <CaseBlock variant="pre" icon={<AlertTriangle size={16} aria-hidden="true" />} title={t('runs.detail.pre')}>
            {snap.preconditions.length === 0 ? <p className="m-0 px-4 py-3.5 text-[var(--cb-pre-text)]">{t('cases.detail.empty')}</p> : <div className="px-4 py-3.5"><ExpectedView entries={snap.preconditions} tone="pre" /></div>}
          </CaseBlock>
          <CaseBlock
            variant="steps" icon={<ListOrdered size={16} aria-hidden="true" />} title={t('runs.detail.steps')}
            aside={<span className="ml-auto rounded-full border border-[var(--cb-steps-border)] bg-surface px-2 py-px text-xs font-semibold">{t('cases.steps', { count: snap.steps.length })}</span>}
          >
            {snap.steps.length === 0 ? <p className="m-0 px-4 py-3.5 text-ink-muted">{t('cases.detail.empty')}</p> : (
              <ol className="m-0 flex list-none flex-col gap-1.5 p-2">
                {snap.steps.map((s, i) => (
                  <li key={i} className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-3 rounded-md border border-[var(--cb-step-card-border)] bg-surface p-2.5">
                    <span className="flex size-6 items-center justify-center rounded-full bg-[var(--cb-steps-head)] text-xs font-bold text-[var(--cb-steps-title)]">{i + 1}</span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            )}
          </CaseBlock>
          <CaseBlock variant="exp" icon={<CheckCircle2 size={16} aria-hidden="true" />} title={t('runs.detail.exp')}>
            {snap.expected.length === 0 ? <p className="m-0 px-4 py-3.5 text-ink-muted">{t('cases.detail.empty')}</p> : <div className="px-4 py-3.5"><ExpectedView entries={snap.expected} /></div>}
          </CaseBlock>
          <div className="flex items-center gap-1.5 text-xs text-ink-subtle"><Info size={14} aria-hidden="true" />{t('runs.detail.snapshot')}</div>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="m-0 text-[15px] font-semibold">{t('runs.detail.history')}</h3>
            <span className="text-xs text-ink-subtle">{test.results.length ? t('runs.detail.historyCount', { count: test.results.length }) : ''}</span>
          </div>
          {test.results.length === 0 && <p className="m-0 rounded-lg border border-dashed border-border-strong px-4 py-3.5 text-ink-subtle">{t('runs.detail.noHistory')}</p>}
          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {test.results.map((r) => {
              const p = personOf(r.who)
              return (
                <li key={`${r.at}-${r.status}`} className="grid grid-cols-[minmax(120px,168px)_minmax(0,1fr)] overflow-hidden rounded-lg border border-border bg-surface">
                  <div className="flex flex-col items-start gap-2 border-r border-border bg-surface-subtle p-3.5">
                    <TestStatusChip status={r.status} />
                    <span className="text-xs text-ink-secondary">{formatDateTime(r.at)} · {relativeTime(t, r.at)}</span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold">
                      <span className="flex size-[22px] items-center justify-center rounded-full text-[9px]" style={{ background: p.bg, color: p.fg }}>{p.key}</span>{p.short}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-col gap-2.5 p-3.5">
                    <p className="m-0 whitespace-pre-line text-ink">{r.comment || <span className="text-ink-subtle italic">{t('runs.detail.noComment')}</span>}</p>
                    {r.evidence.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {r.evidence.map((ev, i) => <EvidenceButton key={`${ev.name}-${i}`} ev={ev} onOpen={() => setShots({ items: r.evidence, index: i })} />)}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        <ResultForm blocked={blocked} onSave={onSave} />
      </div>

      <Lightbox items={shots.items} index={shots.index} onIndex={(i) => setShots((s) => ({ ...s, index: i }))} onClose={() => setShots((s) => ({ ...s, index: null }))} />
    </section>
  )
}
