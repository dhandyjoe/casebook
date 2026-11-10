import { Code2, ListOrdered } from 'lucide-react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import { useTranslation } from 'react-i18next'
import { docToEntries, entriesToDoc } from './expectedDoc'
import { preTone } from './preTone'

const tool =
  'flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-semibold ' +
  'border-[var(--cb-exp-input-border)] bg-surface text-[var(--cb-exp-title)] hover:bg-[var(--cb-exp-head)] ' +
  'aria-pressed:border-[var(--cb-exp-title)] aria-pressed:bg-[var(--cb-exp-head)]'

/**
 * Editor Expected result yang langsung memformat di dalam kolomnya:
 *  - "1. " di awal baris menjadi daftar bernomor (Enter melanjutkan, Tab/Shift+Tab bertingkat)
 *  - "```" atau tombol Code membuat blok kode monospace
 * Isinya dikembalikan sebagai string[] (format simpan di expected.ts).
 */
export function ExpectedEditor({
  id, labelId, entries, onChange, placeholder, tone,
}: { id: string; tone?: 'pre'; labelId: string; entries: string[]; onChange: (entries: string[]) => void; placeholder: string }) {
  const { t } = useTranslation()
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, bold: false, italic: false, strike: false, underline: false, code: false,
        blockquote: false, bulletList: false, horizontalRule: false, hardBreak: false, link: false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: entriesToDoc(entries),
    editorProps: { attributes: { id, role: 'textbox', 'aria-multiline': 'true', 'aria-labelledby': labelId, class: 'cb-editor' } },
    onUpdate: ({ editor }) => onChange(docToEntries(editor.getJSON())),
  })
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({ list: editor?.isActive('orderedList') ?? false, code: editor?.isActive('codeBlock') ?? false }),
  })

  // onMouseDown dicegah agar tombol tidak mengambil fokus dan memindahkan kursor dari editor.
  const keepFocus = (e: React.MouseEvent) => e.preventDefault()

  return (
    <div style={tone && preTone} className="overflow-hidden rounded-md border border-[var(--cb-exp-input-border)] bg-surface focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--cb-exp-border)] bg-[var(--cb-exp-bg)] px-2 py-1.5">
        <button type="button" aria-pressed={active?.list ?? false} onMouseDown={keepFocus} onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={tool}>
          <ListOrdered size={15} aria-hidden="true" />
          {t('cases.dialog.listButton')}
        </button>
        <button
          type="button" aria-pressed={active?.code ?? false} aria-label={t('cases.dialog.codeAria')}
          onMouseDown={keepFocus} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} className={tool}
        >
          <Code2 size={15} aria-hidden="true" />
          {t('cases.dialog.codeButton')}
        </button>
        <span className="ml-auto text-xs text-ink-muted">{t('cases.dialog.expHint')}</span>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
