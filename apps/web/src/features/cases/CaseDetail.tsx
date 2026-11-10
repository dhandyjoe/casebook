import { AlertTriangle, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, Info, List, ListOrdered, Send, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CaseBlock } from '@/components/ui/CaseBlock'
import { relativeTime } from '@/lib/time'
import { ExpectedView } from './ExpectedView'
import { CaseStatusChip } from './CaseStatusChip'
import { canReview, pendingReturn, type TestCase } from './domain'

interface Props {
  testCase: TestCase
  sectionPath: string
  userName: string
  userUid: string
  onPrev: () => void
  onNext: () => void
  onEdit: () => void
  onSubmit: () => void
  onApprove: () => void
  onReturn: (note: string) => void
}

const iconBtn = 'flex size-[34px] cursor-pointer items-center justify-center rounded-md border border-border-strong bg-surface text-ink-secondary'
const dotColor: Record<string, string> = {
  created: 'var(--cb-draft-dot)', edited: 'var(--cb-draft-dot)', submitted: 'var(--cb-review-dot)',
  edited_review: 'var(--cb-review-dot)', approved: 'var(--cb-approved-dot)', returned: 'var(--cb-priority-high)',
}

export function CaseDetail({ testCase: c, sectionPath, userName, userUid, onPrev, onNext, onEdit, onSubmit, onApprove, onReturn }: Props) {
  const { t } = useTranslation()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const returned = pendingReturn(c)
  const dash = t('cases.detail.empty')

  const fields: [string, React.ReactNode][] = [
    ['section', sectionPath],
    ['type', t(`cases.type.${c.type}`)],
    ['priority', <span key="p" className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: `var(--cb-priority-${c.priority.toLowerCase()})` }} />{t(`cases.priority.${c.priority}`)}</span>],
    ['refs', c.refs ? <a key="r" href="#" className="text-accent no-underline">{c.refs}</a> : dash],
  ]

  return (
    <section aria-labelledby="d-title" className="box-border flex min-w-0 flex-[4_1_520px] flex-col self-start lg:w-[var(--detail-w)] lg:flex-none border-l border-border bg-surface lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border px-5 py-3">
        <span className="font-mono text-[13px] text-ink-muted">{c.id}</span>
        <CaseStatusChip status={c.status} />
        <div className="ml-auto flex gap-1.5">
          <button type="button" onClick={onPrev} aria-label={t('cases.detail.prev')} className={iconBtn}><ChevronLeft size={16} aria-hidden="true" /></button>
          <button type="button" onClick={onNext} aria-label={t('cases.detail.next')} className={iconBtn}><ChevronRight size={16} aria-hidden="true" /></button>
          <button type="button" onClick={onEdit} className="h-[34px] cursor-pointer rounded-md border border-border-strong bg-surface px-3 font-semibold text-ink">
            {t('cases.detail.edit')}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-[18px] p-5">
        <div>
          <h2 id="d-title" className="m-0 text-xl font-bold tracking-tight">{c.title}</h2>
          <p className="mt-1 text-[13px] text-ink-muted">{t('cases.detail.meta', { author: c.author, when: relativeTime(t, c.updatedAt) })}</p>
        </div>

        {c.status === 'draft' && (
          <div className="flex flex-col gap-3 rounded-lg border border-border-strong bg-page px-4 py-3.5">
            <div className="flex gap-2.5 text-ink-secondary"><Info size={18} aria-hidden="true" className="mt-0.5 flex-none" /><span>{t('cases.detail.draftBanner')}</span></div>
            {returned && (
              <div className="rounded-md border border-border bg-surface px-3 py-2.5">
                <div className="text-xs font-semibold text-ink-muted">
                  {returned.who === userName
                    ? t('cases.detail.returnedByYou', { when: relativeTime(t, returned.at) })
                    : t('cases.detail.returnedBy', { who: returned.who, when: relativeTime(t, returned.at) })}
                </div>
                <div className="mt-0.5">“{returned.note}”</div>
              </div>
            )}
            <button type="button" onClick={onSubmit} className="flex h-10 cursor-pointer items-center gap-2 self-start rounded-md border-0 bg-accent px-4 font-semibold text-white hover:bg-accent-hover">
              <Send size={16} aria-hidden="true" />{t('cases.detail.sendReview')}
            </button>
          </div>
        )}

        {c.status === 'under_review' && (
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--cb-retest-border)] bg-[var(--cb-pending-bg)] px-4 py-3.5">
            <div className="flex gap-2.5 text-[var(--cb-pending-fg)]"><Clock size={18} aria-hidden="true" className="mt-0.5 flex-none" /><span>{c.reviewer ? t('cases.detail.pendingBanner', { reviewer: c.reviewer.uid === userUid ? t('cases.detail.you') : c.reviewer.name }) : t('cases.detail.pendingBannerAny')}</span></div>
            {canReview(c, userUid) && !rejecting && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onApprove} className="flex h-10 cursor-pointer items-center gap-2 rounded-md border-0 bg-approved px-4 font-semibold text-white">
                  <Check size={16} aria-hidden="true" />{t('cases.detail.approve')}
                </button>
                <button type="button" onClick={() => setRejecting(true)} className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface px-4 font-semibold text-ink-secondary">
                  <Undo2 size={16} aria-hidden="true" />{t('cases.detail.returnToDraft')}
                </button>
              </div>
            )}
            {canReview(c, userUid) && rejecting && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reason" className="font-medium text-ink">{t('cases.detail.reasonLabel')} <span className="text-danger-text">{t('cases.detail.required')}</span></label>
                <textarea
                  id="reason" rows={3} value={reason} autoFocus
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('cases.detail.reasonPlaceholder')}
                  className="resize-y rounded-md border border-border-input bg-surface px-3 py-2.5 text-ink"
                />
                <div className="mt-1 flex gap-2">
                  <button
                    type="button" disabled={!reason.trim()}
                    onClick={() => { onReturn(reason); setRejecting(false); setReason('') }}
                    className="h-10 cursor-pointer rounded-md border-0 bg-danger px-4 font-semibold text-white disabled:cursor-default disabled:bg-danger-disabled"
                  >
                    {t('cases.detail.returnToDraft')}
                  </button>
                  <button type="button" onClick={() => { setRejecting(false); setReason('') }} className="h-10 cursor-pointer rounded-md border border-border-strong bg-surface px-3.5 font-semibold text-ink">
                    {t('cases.detail.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <CaseBlock variant="detail" icon={<List size={16} aria-hidden="true" />} title={t('cases.detail.blocks.detail')}>
          <dl className="m-0 grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-5 gap-y-3.5 p-4">
            {fields.map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs text-ink-muted">{t(`cases.detail.fields.${key}`)}</dt>
                <dd className="m-0 mt-0.5 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CaseBlock>

        <CaseBlock variant="pre" icon={<AlertTriangle size={16} aria-hidden="true" />} title={t('cases.detail.blocks.pre')}>
          {c.preconditions.length === 0 ? (
            <p className="m-0 px-4 py-3.5 text-[var(--cb-pre-text)]">{dash}</p>
          ) : (
            <div className="px-4 py-3.5"><ExpectedView entries={c.preconditions} tone="pre" /></div>
          )}
        </CaseBlock>

        <CaseBlock
          variant="steps" icon={<ListOrdered size={16} aria-hidden="true" />} title={t('cases.detail.blocks.steps')}
          aside={<span className="ml-auto rounded-full border border-[var(--cb-steps-border)] bg-surface px-2 py-px text-xs font-semibold">{t('cases.steps', { count: c.steps.length })}</span>}
        >
          {c.steps.length === 0 ? (
            <p className="m-0 px-4 py-3.5 text-ink-muted">{dash}</p>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-1.5 p-2">
              {c.steps.map((step, i) => (
                <li key={i} className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-3 rounded-md border border-[var(--cb-step-card-border)] bg-surface p-2.5">
                  <span className="flex size-6 items-center justify-center rounded-full bg-[var(--cb-steps-head)] text-xs font-bold text-[var(--cb-steps-title)]">{i + 1}</span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          )}
        </CaseBlock>

        <CaseBlock variant="exp" icon={<CheckCircle2 size={16} aria-hidden="true" />} title={t('cases.detail.blocks.exp')}>
          {c.expected.length === 0 ? (
            <p className="m-0 px-4 py-3.5 text-ink-muted">{dash}</p>
          ) : (
            <div className="px-4 py-3.5"><ExpectedView entries={c.expected} /></div>
          )}
        </CaseBlock>

        <div>
          <h3 className="m-0 mb-2 text-sm font-semibold">{t('cases.detail.history')}</h3>
          <ol className="m-0 flex list-none flex-col p-0">
            {c.history.map((h) => (
              <li key={`${h.at}-${h.action}`} className="flex gap-2.5 border-t border-border-subtle py-2">
                <span className="mt-1.5 size-2 flex-none rounded-full" style={{ background: dotColor[h.action] }} />
                <div>
                  <span><strong className="font-semibold">{h.who}</strong> {t(`cases.history.${h.action}`)}</span>
                  <div className="text-xs text-ink-subtle">{relativeTime(t, h.at)}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
