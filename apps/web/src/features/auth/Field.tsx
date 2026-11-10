import type { InputHTMLAttributes } from 'react'

export const inputClass =
  'h-11 w-full rounded-md border border-border-input bg-surface px-3 text-ink transition-colors hover:border-ink-subtle'
export const submitClass =
  'h-[46px] cursor-pointer rounded-md border-0 bg-accent font-semibold text-white transition-colors hover:bg-accent-hover active:translate-y-px disabled:cursor-default disabled:bg-accent-disabled'
export const linkClass = 'font-semibold text-accent no-underline hover:text-accent-hover hover:underline'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }

export function Field({ label, error, id, ...input }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">{label}</label>
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} className={inputClass} {...input} />
      {error && <span id={`${id}-error`} className="text-[13px] text-danger-text">{error}</span>}
    </div>
  )
}

type SelectProps = { label: string; error?: string; id: string; value: string; placeholder: string; options: readonly { id: string; name: string }[]; onChange: (e: { target: { value: string } }) => void }

export function SelectField({ label, error, id, placeholder, options, ...select }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">{label}</label>
      <select id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} className={inputClass} {...select}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      {error && <span id={`${id}-error`} className="text-[13px] text-danger-text">{error}</span>}
    </div>
  )
}
