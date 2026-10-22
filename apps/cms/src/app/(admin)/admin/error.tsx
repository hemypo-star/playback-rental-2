'use client'

import { useEffect } from 'react'

// Admin error boundary: the sidebar stays, the failing section says so in
// Russian and can be retried.
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="rounded-3xl border border-border bg-card px-6.5 py-6">
      <div className="text-[11px] font-semibold uppercase tracking-[.14em] text-subtle">Ошибка</div>
      <h1 className="mt-2 text-[26px] font-medium tracking-[-0.03em]">Раздел не загрузился</h1>
      <p className="mt-2 max-w-[560px] text-[14px] text-subtle">
        Попробуйте ещё раз. Если ошибка повторяется, сообщите разработчику время и адрес страницы
        {error.digest ? ` (код ${error.digest})` : ''}.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 h-11 rounded-full bg-primary px-5 text-[11.5px] font-semibold uppercase tracking-[.13em] text-primary-foreground"
      >
        Попробовать снова
      </button>
    </div>
  )
}
