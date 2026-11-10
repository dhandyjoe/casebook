import { renderToBuffer } from '@react-pdf/renderer'
import { emptyCounts } from '@/features/runs/domain'
import { ReportPdf } from './ReportPdf'

it('renders a PDF with the summary and the failed/blocked table', async () => {
  const labels = { passed: 'Passed', failed: 'Failed', blocked: 'Blocked', retest: 'Retest', untested: 'Untested' }
  const buf = await renderToBuffer(
    <ReportPdf
      label="Summary — Milestone" title="Release 3.2" subtitle="Data as of today" rows={[{ id: 'a', name: 'Run A', counts: { ...emptyCounts(), passed: 3, failed: 1 } }]}
      issues={[{ id: 'T-1', testId: 't1', runId: 'r1', title: 'Declined card', run: 'Chrome', status: 'failed', note: 'JIRA-530', who: 'Dimas P.' }]}
      text={{ kpis: [{ label: 'Total tests', value: '4', note: 'across 1 run' }], statusTitle: 'Status by run', statusLabels: labels, noMilestone: 'No milestone', failedBlocked: 'Test Failed & Blocked', noIssues: 'None', page: 'Page', cols: { id: 'ID', title: 'Title', run: 'Run', status: 'Status', note: 'Defect / note', who: 'Tester' } }}
    />,
  )
  expect(buf.subarray(0, 5).toString()).toBe('%PDF-')
})
