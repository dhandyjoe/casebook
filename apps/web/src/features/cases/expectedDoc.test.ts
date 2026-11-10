import type { JSONContent } from '@tiptap/react'
import { docToEntries, entriesToDoc } from './expectedDoc'

const p = (text: string): JSONContent => ({ type: 'paragraph', content: [{ type: 'text', text }] })
const li = (text: string, nested?: JSONContent): JSONContent => ({ type: 'listItem', content: nested ? [p(text), nested] : [p(text)] })
const ol = (items: JSONContent[], start = 1): JSONContent => ({ type: 'orderedList', attrs: { start }, content: items })
const doc = (...content: JSONContent[]): JSONContent => ({ type: 'doc', content })

describe('entries <-> editor document', () => {
  it('round-trips plain, numbered, nested and code entries', () => {
    const entries = ['Row exists', '1. Open', '   1. Nested a', '   2. Nested b', '2. Done', '```sql\nSELECT 1;\n\nSELECT 2;\n```', 'The end']
    expect(docToEntries(entriesToDoc(entries))).toEqual(entries)
  })
  it('builds an ordered list with nested sub-lists', () => {
    expect(entriesToDoc(['1. A', '   1. B', '2. C']).content).toEqual([
      ol([li('A', ol([li('B')])), li('C')]),
    ])
  })
  it('builds a code block with its language', () => {
    expect(entriesToDoc(['```sql\nSELECT 1;\n```']).content).toEqual([
      { type: 'codeBlock', attrs: { language: 'sql' }, content: [{ type: 'text', text: 'SELECT 1;' }] },
    ])
  })
  it('an empty list of entries is an empty document the editor can open', () => {
    expect(entriesToDoc([]).content).toEqual([{ type: 'paragraph' }])
    expect(docToEntries(entriesToDoc([]))).toEqual([])
  })
  it('does not let an indent jump more than one level', () => {
    expect(docToEntries(entriesToDoc(['      1. Too deep first']))).toEqual(['1. Too deep first'])
  })
  it('numbers list items from the list start and renumbers gaps', () => {
    expect(docToEntries(doc(ol([li('a'), li('b')], 3)))).toEqual(['3. a', '4. b'])
    expect(docToEntries(entriesToDoc(['1. a', '3. c']))).toEqual(['1. a', '2. c'])
  })
  it('drops empty paragraphs, empty list items and empty code blocks', () => {
    expect(docToEntries(doc({ type: 'paragraph' }, ol([{ type: 'listItem', content: [{ type: 'paragraph' }] }]), { type: 'codeBlock' }, p('  kept  ')))).toEqual(['kept'])
  })
  it('keeps code that sits inside a list item', () => {
    const code: JSONContent = { type: 'codeBlock', content: [{ type: 'text', text: 'ls' }] }
    expect(docToEntries(doc(ol([{ type: 'listItem', content: [p('Run'), code] }])))).toEqual(['1. Run', '```\nls\n```'])
  })
})
