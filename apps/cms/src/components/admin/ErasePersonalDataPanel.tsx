'use client'

import { useState } from 'react'
import { eraseCustomerData } from '../../app/(admin)/admin/clients/actions'

// "Удалить данные клиента" — for a customer who withdraws consent. Two steps
// (find → confirm) instead of a browser confirm() dialog.
export default function ErasePersonalDataPanel() {
  const [query, setQuery] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const erase = async () => {
    setBusy(true)
    setResult(null)
    const res = await eraseCustomerData(query)
    setBusy(false)
    setConfirming(false)
    if (!res.success) setResult({ tone: 'error', text: res.error || 'Не удалось удалить данные' })
    else if (!res.orders) setResult({ tone: 'error', text: 'Заказов с такими контактами не найдено.' })
    else {
      setResult({ tone: 'ok', text: `Готово: контакты удалены из ${res.orders} заказ${res.orders === 1 ? 'а' : 'ов'}.` })
      setQuery('')
    }
  }

  return (
    <details className="mb-3.5 rounded-3xl border border-border bg-card px-6 py-5">
      <summary className="cursor-pointer text-[13.5px] font-medium">Удалить данные клиента (отзыв согласия)</summary>
      <p className="mt-3 max-w-[640px] text-[12.5px] leading-relaxed text-subtle">
        Имя, телефон, email и заметки клиента стираются из всех его заказов; сами заказы и суммы остаются. В заказе
        записывается, кто и когда удалил данные. Контрагента в МойСклад удалите вручную.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setConfirming(false)
          }}
          placeholder="Email или телефон клиента"
          aria-label="Email или телефон клиента"
          className="h-11 min-w-0 flex-1 basis-[260px] rounded-2xl border border-input bg-muted-well px-4 text-[14px] outline-none focus:border-foreground"
        />
        {confirming ? (
          <>
            <button type="button" disabled={busy} onClick={erase} className="h-11 rounded-full bg-accent px-5 text-[11.5px] font-semibold uppercase tracking-[.13em] text-white disabled:opacity-60">
              {busy ? 'Удаляем…' : 'Да, удалить безвозвратно'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="h-11 rounded-full border border-border px-5 text-[11.5px] font-semibold uppercase tracking-[.13em]">
              Отмена
            </button>
          </>
        ) : (
          <button type="button" disabled={!query.trim()} onClick={() => setConfirming(true)} className="h-11 rounded-full bg-primary px-5 text-[11.5px] font-semibold uppercase tracking-[.13em] text-primary-foreground disabled:opacity-40">
            Удалить данные
          </button>
        )}
      </div>
      {result && (
        <p role="status" className={`mt-3 text-[13px] ${result.tone === 'ok' ? 'text-foreground' : 'text-accent'}`}>
          {result.text}
        </p>
      )}
    </details>
  )
}
