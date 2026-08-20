'use client'

// Ported from apps/web/src/components/QuantitySelector.tsx (docs/PLAN-next-
// migration.md Stage 2) — verbatim, already a plain React component there.
interface Props {
  quantity: number
  onChange: (quantity: number) => void
  max: number
  disabled?: boolean
}

export default function QuantitySelector({ quantity, onChange, max, disabled }: Props) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-muted p-1">
      <button
        type="button"
        disabled={disabled || quantity <= 1}
        onClick={() => onChange(quantity - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[15px] font-semibold hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
        aria-label="Уменьшить количество"
      >
        −
      </button>
      <span className="w-8 text-center text-[14px] font-semibold tabular-nums">{quantity}</span>
      <button
        type="button"
        disabled={disabled || quantity >= max}
        onClick={() => onChange(quantity + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[15px] font-semibold hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
        aria-label="Увеличить количество"
      >
        +
      </button>
    </div>
  )
}
