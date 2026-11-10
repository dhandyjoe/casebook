import { Check, Minus } from 'lucide-react'

export type TriState = boolean | 'mixed'

/** Kotak centang visual (kosong / centang / sebagian). Dibungkus tombol role="checkbox" oleh pemakainya. */
export function TriBox({ state, disabled }: { state: TriState; disabled?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-4 flex-none items-center justify-center rounded-xs border-[1.5px] text-white ${
        state ? 'border-accent bg-accent' : `border-[#AEB6C4] bg-surface ${disabled ? 'opacity-50' : ''}`
      }`}
    >
      {state === true && <Check size={12} strokeWidth={3} />}
      {state === 'mixed' && <Minus size={12} strokeWidth={3} />}
    </span>
  )
}

export const ariaChecked = (s: TriState): 'true' | 'false' | 'mixed' => (s === 'mixed' ? 'mixed' : s ? 'true' : 'false')
