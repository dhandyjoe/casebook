import type { JSONContent } from '@tiptap/react'
import { expectedItems, type ExpectedItem } from './expected'

// Penghubung editor (dokumen Tiptap) <-> format simpan string[] di expected.ts.
// Format simpan tidak berubah, jadi panel detail dan skema data tidak ikut berubah.

type Num = Extract<ExpectedItem, { kind: 'num' }>

const paragraph = (text: string): JSONContent => (text ? { type: 'paragraph', content: [{ type: 'text', text }] } : { type: 'paragraph' })

function list(items: Num[], from: number, level: number): [JSONContent, number] {
  const content: JSONContent[] = []
  const start = items[from]!.n
  let i = from
  while (i < items.length && items[i]!.indent >= level) {
    const item: JSONContent = { type: 'listItem', content: [paragraph(items[i]!.text)] }
    i++
    if (i < items.length && items[i]!.indent > level) {
      const [sub, next] = list(items, i, level + 1)
      item.content!.push(sub)
      i = next
    }
    content.push(item)
  }
  return [{ type: 'orderedList', attrs: { start }, content }, i]
}

export function entriesToDoc(entries: string[]): JSONContent {
  const items = expectedItems(entries)
  const content: JSONContent[] = []

  for (let i = 0; i < items.length; ) {
    const item = items[i]!
    if (item.kind === 'num') {
      // satu deret item bernomor; tingkat tidak boleh melompat lebih dari satu level
      const run: Num[] = []
      let prev = -1
      while (i < items.length && items[i]!.kind === 'num') {
        const n = items[i] as Num
        const indent = Math.min(n.indent, prev + 1)
        run.push({ ...n, indent })
        prev = indent
        i++
      }
      content.push(list(run, 0, 0)[0])
    } else if (item.kind === 'code') {
      content.push({
        type: 'codeBlock',
        attrs: item.lang ? { language: item.lang } : {},
        ...(item.code ? { content: [{ type: 'text', text: item.code }] } : {}),
      })
      i++
    } else {
      content.push(paragraph(item.text))
      i++
    }
  }
  return { type: 'doc', content: content.length ? content : [paragraph('')] }
}

const textOf = (node: JSONContent) => (node.content ?? []).map((c) => c.text ?? '').join('')

const fence = (node: JSONContent) => {
  const code = textOf(node)
  return code.trim() ? `\`\`\`${node.attrs?.language ?? ''}\n${code}\n\`\`\`` : null
}

function walkList(node: JSONContent, depth: number, out: string[]) {
  let n: number = node.attrs?.start ?? 1
  for (const li of node.content ?? []) {
    let numbered = false
    for (const child of li.content ?? []) {
      if (child.type === 'paragraph') {
        const text = textOf(child).trim()
        if (!text) continue
        out.push(numbered ? text : `${' '.repeat(depth * 3)}${n++}. ${text}`)
        numbered = true
      } else if (child.type === 'orderedList') {
        walkList(child, depth + 1, out)
      } else if (child.type === 'codeBlock') {
        const f = fence(child)
        if (f) out.push(f)
      }
    }
  }
}

export function docToEntries(doc: JSONContent): string[] {
  const out: string[] = []
  for (const node of doc.content ?? []) {
    if (node.type === 'paragraph') {
      const text = textOf(node).trim()
      if (text) out.push(text)
    } else if (node.type === 'codeBlock') {
      const f = fence(node)
      if (f) out.push(f)
    } else if (node.type === 'orderedList') {
      walkList(node, 0, out)
    }
  }
  return out
}
