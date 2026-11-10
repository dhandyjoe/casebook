import { expectedItems } from './expected'

describe('expectedItems', () => {
  it('classifies numbered, plain and code entries', () => {
    expect(expectedItems(['1. Paid', '   2. Nested', 'Plain', '```bash\nls\n```'])).toEqual([
      { kind: 'num', n: 1, text: 'Paid', indent: 0 },
      { kind: 'num', n: 2, text: 'Nested', indent: 1 },
      { kind: 'text', text: 'Plain' },
      { kind: 'code', lang: 'bash', code: 'ls' },
    ])
  })
  it('keeps a multi-line code entry whole, and tolerates a missing closing fence', () => {
    expect(expectedItems(['```sql\nSELECT 1;\n\nSELECT 2;\n```', '```\necho hi'])).toEqual([
      { kind: 'code', lang: 'sql', code: 'SELECT 1;\n\nSELECT 2;' },
      { kind: 'code', lang: '', code: 'echo hi' },
    ])
  })
})
