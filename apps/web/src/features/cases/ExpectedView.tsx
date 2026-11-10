import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { expectedItems } from './expected'
import { preTone } from './preTone'

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard tidak tersedia */ }
  }

  return (
    <div className="overflow-hidden rounded-md border border-[var(--cb-exp-border)] bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--cb-exp-border)] bg-[var(--cb-exp-head)] py-1 pr-1 pl-3 text-xs">
        <span className="font-mono font-medium text-[var(--cb-exp-title)]">{lang || t('cases.detail.code')}</span>
        <button type="button" onClick={copy} className="flex h-7 cursor-pointer items-center gap-1.5 rounded-sm border-0 bg-transparent px-2 font-semibold text-[var(--cb-exp-title)] hover:bg-white/60">
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? t('cases.detail.copied') : t('cases.detail.copy')}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-ink">{code}</pre>
    </div>
  )
}

/** Tampilan hasil yang diharapkan: bullet, item bernomor (bertingkat), dan blok kode. */
export function ExpectedView({ entries, tone }: { entries: string[]; tone?: 'pre' }) {
  return (
    <ul style={tone && preTone} className="m-0 flex list-none flex-col gap-1.5 p-0 text-[var(--cb-exp-text)]">
      {expectedItems(entries).map((item, i) => {
        if (item.kind === 'code') return <li key={i}><CodeBlock code={item.code} lang={item.lang} /></li>
        const num = item.kind === 'num'
        return (
          <li key={i} className="flex gap-2" style={num ? { paddingLeft: item.indent * 20 } : undefined}>
            <span aria-hidden={!num} className="w-6 flex-none text-right font-semibold text-[var(--cb-exp-title)] tabular-nums">{num ? `${item.n}.` : '•'}</span>
            <span className="min-w-0">{item.text}</span>
          </li>
        )
      })}
    </ul>
  )
}
