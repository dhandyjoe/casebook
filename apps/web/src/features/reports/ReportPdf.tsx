import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { STATUS_ORDER } from '@/features/runs/domain'
import { kpisOf, type IssueRow, type Row } from './domain'

// Warna status dari design.md 2.4 (react-pdf tidak membaca CSS variable).
const COLOR = { passed: '#34A865', failed: '#C62828', blocked: '#4B5160', retest: '#F2B705', untested: '#D5D9E0' } as const

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: '#16181D', fontFamily: 'Helvetica' },
  muted: { color: '#5A6170' },
  h1: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  h2: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 18, marginBottom: 8 },
  kpis: { flexDirection: 'row', gap: 8, marginTop: 14 },
  kpi: { flex: 1, borderWidth: 1, borderColor: '#E3E6EB', borderRadius: 6, padding: 8 },
  kpiValue: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  bar: { flex: 1, height: 10, flexDirection: 'row', backgroundColor: '#E9ECF1', borderRadius: 2, overflow: 'hidden' },
  th: { flexDirection: 'row', backgroundColor: '#FAFBFC', borderBottomWidth: 1, borderColor: '#E3E6EB', paddingVertical: 4 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#EEF0F3', paddingVertical: 4 },
  footer: { position: 'absolute', bottom: 16, left: 32, right: 32, fontSize: 8, color: '#5A6170', textAlign: 'right' },
})

const COLS = [{ k: 'id', w: 8 }, { k: 'title', w: 34 }, { k: 'run', w: 20 }, { k: 'status', w: 10 }, { k: 'note', w: 18 }, { k: 'who', w: 10 }] as const

export interface ReportPdfProps {
  label: string
  title: string
  subtitle: string
  rows: Row[]
  issues: IssueRow[] | null
  /** Semua teks sudah diterjemahkan oleh pemanggil (t()). */
  text: {
    kpis: { label: string; value: string; note: string }[]
    statusTitle: string
    statusLabels: Record<(typeof STATUS_ORDER)[number], string>
    noMilestone: string
    failedBlocked: string
    noIssues: string
    cols: Record<(typeof COLS)[number]['k'], string>
    page: string
  }
}

export function ReportPdf({ label, title, subtitle, rows, issues, text }: ReportPdfProps) {
  return (
    <Document title={`${label} — ${title}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.muted}>{label}</Text>
        <Text style={s.h1}>{title}</Text>
        <Text style={s.muted}>{subtitle}</Text>

        <View style={s.kpis}>
          {text.kpis.map((k) => (
            <View key={k.label} style={s.kpi}>
              <Text style={s.muted}>{k.label}</Text>
              <Text style={s.kpiValue}>{k.value}</Text>
              <Text style={[s.muted, { fontSize: 8 }]}>{k.note}</Text>
            </View>
          ))}
        </View>

        <Text style={s.h2}>{text.statusTitle}</Text>
        {rows.map((r) => {
          const total = STATUS_ORDER.reduce((n, k) => n + r.counts[k], 0)
          return (
            <View key={r.id || 'none'} style={s.row} wrap={false}>
              <Text style={{ width: 130 }}>{r.name || text.noMilestone}</Text>
              <View style={s.bar}>
                {STATUS_ORDER.map((k) => <View key={k} style={{ width: `${total ? (r.counts[k] / total) * 100 : 0}%`, backgroundColor: COLOR[k] }} />)}
              </View>
              <Text style={{ width: 34, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>{kpisOf(r.counts).executedPct}%</Text>
            </View>
          )
        })}
        <View style={[s.row, { marginTop: 4 }]}>
          {STATUS_ORDER.map((k) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <View style={{ width: 7, height: 7, backgroundColor: COLOR[k] }} />
              <Text style={[s.muted, { fontSize: 8 }]}>{text.statusLabels[k]}</Text>
            </View>
          ))}
        </View>

        {issues && (
          <>
            <Text style={s.h2}>{text.failedBlocked}</Text>
            {issues.length === 0 ? (
              <Text style={s.muted}>{text.noIssues}</Text>
            ) : (
              <View>
                <View style={s.th} fixed>
                  {COLS.map((c) => <Text key={c.k} style={{ width: `${c.w}%`, fontFamily: 'Helvetica-Bold', paddingHorizontal: 3 }}>{text.cols[c.k]}</Text>)}
                </View>
                {issues.map((i) => (
                  <View key={`${i.runId}-${i.testId}`} style={s.tr} wrap={false}>
                    {COLS.map((c) => <Text key={c.k} style={{ width: `${c.w}%`, paddingHorizontal: 3 }}>{c.k === 'status' ? text.statusLabels[i.status] : i[c.k]}</Text>)}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `${text.page} ${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  )
}
