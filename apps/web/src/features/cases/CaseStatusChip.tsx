import { useTranslation } from 'react-i18next'
import type { CaseStatus } from './domain'

const TOKEN: Record<CaseStatus, string> = { draft: 'draft', under_review: 'review', active: 'approved' }

export function CaseStatusChip({ status }: { status: CaseStatus }) {
  const { t } = useTranslation()
  const k = TOKEN[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-semibold whitespace-nowrap"
      style={{ background: `var(--cb-${k}-bg)`, color: `var(--cb-${k}-fg)` }}
    >
      <span className="size-1.5 rounded-full" style={{ background: `var(--cb-${k}-fg)` }} />
      {t(`cases.status.${status}`)}
    </span>
  )
}
