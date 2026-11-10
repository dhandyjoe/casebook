// Format isi Expected result. Data tetap string[] (satu elemen per hasil, PRD TC-03 / arsitektur):
//   "Order is Paid"            -> teks biasa (bullet)
//   "1. Order is Paid"         -> item bernomor; spasi di depan = tingkat (3 spasi per tingkat)
//   "```sql\nSELECT 1\n```"    -> blok kode, satu elemen walau berbaris-baris

const FENCE = /^```/
const NUMBERED = /^(\s*)(\d+)\.\s+(.*)$/

function codeParts(entry: string) {
  const lines = entry.split('\n')
  const closed = lines.length > 1 && /^```\s*$/.test(lines[lines.length - 1]!)
  return { lang: lines[0]!.slice(3).trim(), code: lines.slice(1, closed ? -1 : undefined).join('\n') }
}

export type ExpectedItem =
  | { kind: 'num'; n: number; text: string; indent: number }
  | { kind: 'text'; text: string }
  | { kind: 'code'; code: string; lang: string }

export function expectedItems(entries: string[]): ExpectedItem[] {
  return entries.map((entry): ExpectedItem => {
    if (FENCE.test(entry)) return { kind: 'code', ...codeParts(entry) }
    const m = NUMBERED.exec(entry)
    return m ? { kind: 'num', n: Number(m[2]), text: m[3]!, indent: Math.floor(m[1]!.length / 3) } : { kind: 'text', text: entry }
  })
}
