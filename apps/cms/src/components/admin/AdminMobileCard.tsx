import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

// S7 (design_handoff_swiss_bento/04-screens.md), mobile rule: "Мобайл
// ≤1020: ... каждая таблица → список карточек radius 18 (заголовок + 3–4
// пары «лейбл caps / значение» + действия). Не оставлять горизонтальный
// скролл таблицы." — this is the shared card shape every fixed-column
// admin table (`grid-cols-[...]`) collapses into below the `lg` breakpoint
// instead of scrolling horizontally. The desktop grid row stays exactly as
// designed; this renders only at `lg:hidden`, so it's an addition, not a
// replacement, of the existing row markup.
interface Field {
  label: string
  value: ReactNode
}

interface Props {
  href?: string
  title: ReactNode
  badge?: ReactNode
  fields: Field[]
  style?: CSSProperties
}

export default function AdminMobileCard({ href, title, badge, fields, style }: Props) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 truncate text-[14px] font-medium">{title}</div>
        {badge}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
        {fields.map((f, i) => (
          <div key={i} className="min-w-0">
            <div className="text-[9.5px] font-semibold tracking-[0.13em] text-subtle uppercase">{f.label}</div>
            <div className="mt-0.5 truncate text-[13px]">{f.value}</div>
          </div>
        ))}
      </div>
    </>
  )

  const className = 'block rounded-[18px] border border-border p-4 text-left transition-colors duration-240 ease-expo hover:bg-muted lg:hidden'

  if (href) {
    return (
      <Link href={href} className={className} style={style}>
        {inner}
      </Link>
    )
  }

  return (
    <div className={className} style={style}>
      {inner}
    </div>
  )
}
