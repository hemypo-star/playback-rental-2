'use client'

// Ported from the inline <script> in apps/web/src/pages/admin/orders/
// [id].astro (docs/PLAN-next-migration.md Stage 3.4/3.5) — same fields,
// same auto-save-on-blur/change behavior, same confirm() guards on delete.
// Calls the Server Actions in ./actions.ts instead of fetch()-ing Payload's
// REST endpoints directly.
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { AdminOrderDetail, AdminOrderDetailItem } from '../../lib/admin/data/orders'
import { rub } from '../../lib/admin/format'
import {
  deleteOrderItem,
  submitOrderToMoySklad,
  updateOrderItem,
  updateOrderNotes,
  updateOrderStatus,
} from '../../app/(admin)/admin/orders/[id]/actions'

const STATUS_OPTIONS: { value: AdminOrderDetail['status']; label: string }[] = [
  { value: 'pending', label: 'Ожидает звонка' },
  { value: 'confirmed', label: 'Подтверждён' },
  { value: 'completed', label: 'Завершён' },
  { value: 'cancelled', label: 'Отменён' },
]

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in local time, not a raw
// ISO string (which Payload stores in UTC).
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface Props {
  order: AdminOrderDetail
  items: AdminOrderDetailItem[]
}

export default function OrderDetailForm({ order, items: initialItems }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(order.status)
  const [notes, setNotes] = useState(order.notes ?? '')
  const [items, setItems] = useState(initialItems)
  const [totalPrice, setTotalPrice] = useState(order.totalPrice)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<string | null>(null)
  const [submittedAt, setSubmittedAt] = useState(order.submittedAt)
  const [moySkladOrderId, setMoySkladOrderId] = useState(order.moySkladOrderId)

  // Rollback targets must read the *current* committed value, not one
  // captured in an onBlur closure at the time a field was edited — with two
  // in-flight edits to the same field (e.g. a fast double-correction), the
  // second request's closure would otherwise capture a value from before
  // either request landed, rolling back to a stale number even after the
  // first request has already committed a newer one server-side.
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])
  const committedItem = (itemId: number) => itemsRef.current.find((it) => it.id === itemId)

  const handleStatusChange = async (value: AdminOrderDetail['status']) => {
    setError(null)
    const result = await updateOrderStatus(order.id, value)
    if (result.success) {
      setStatus(value)
    } else {
      setError(result.error || 'Не удалось сохранить изменения')
    }
  }

  const handleNotesBlur = async () => {
    setError(null)
    const result = await updateOrderNotes(order.id, notes)
    if (!result.success) setError(result.error || 'Не удалось сохранить изменения')
  }

  // Success-path state updater only — the server call + failure rollback
  // live in commitItemField below, called from each field's onBlur handler.
  const handleItemFieldChange = (itemId: number, field: 'quantity' | 'startDate' | 'endDate', value: number | string, lineTotal?: number) => {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, [field]: value, lineTotal: lineTotal ?? it.lineTotal } : it)))
  }

  const commitItemField = async (
    itemId: number,
    field: 'quantity' | 'startDate' | 'endDate',
    rawValue: string,
    rollback: () => void,
  ) => {
    setError(null)
    const value = field === 'quantity' ? Number(rawValue) : new Date(rawValue).toISOString()
    const result = await updateOrderItem(order.id, itemId, { [field]: value })
    if (!result.success) {
      setError(result.error || 'Не удалось сохранить позицию')
      rollback()
      return
    }
    handleItemFieldChange(itemId, field, value, result.lineTotal)
    if (typeof result.orderTotalPrice === 'number') setTotalPrice(result.orderTotalPrice)
  }

  const handleRemoveItem = async (itemId: number) => {
    if (!confirm('Удалить эту позицию?')) return
    setError(null)
    const result = await deleteOrderItem(order.id, itemId)
    if (!result.success) {
      setError(result.error || 'Не удалось удалить позицию')
      return
    }
    setItems((prev) => prev.filter((it) => it.id !== itemId))
    if (typeof result.orderTotalPrice === 'number') setTotalPrice(result.orderTotalPrice)
  }

  const handleCancelOrder = async () => {
    // Cancel, not delete — a cancelled order already drops out of active-
    // availability accounting and revenue analytics (see CLAUDE.md), the
    // same practical effect a hard delete had, but reversibly: the status
    // dropdown can just be set back. Still confirm()-guarded despite being
    // reversible — it's a one-click change with a real operational effect
    // (order stops counting as active) that an operator should not trigger
    // by an accidental click on this destructive-looking button.
    if (!confirm('Отменить этот заказ? Позиции и история останутся — статус можно будет вернуть обратно.')) return
    await handleStatusChange('cancelled')
  }

  const handleSubmitOrder = async () => {
    setSubmitting(true)
    setError(null)
    const result = await submitOrderToMoySklad(order.id)
    setSubmitting(false)
    if (result.success) {
      setSubmittedAt(new Date().toISOString())
      setMoySkladOrderId(result.moySkladOrderId ?? null)
      setSubmitResult(result.moySkladOrderId ? `Отправлено. МойСклад: ${result.moySkladOrderId}` : 'Отправлено, но МойСклад вернул ошибку — см. логи сервера.')
      router.refresh()
    } else {
      setError(result.error || 'Не удалось отправить заказ')
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <Link href="/admin/orders" className="text-[12.5px] font-semibold text-subtle hover:text-foreground">← Все заказы</Link>
        {status !== 'cancelled' && (
          <button
            type="button"
            onClick={handleCancelOrder}
            // btn-outline, not the accent fill this button carried when it
            // meant permanent deletion: cancelling is reversible, while the
            // per-item ✕ right below it is not — leaving the accent fill here
            // would make the reversible action read as the more severe of the
            // two. Same h-*/text-* override shape every other btn-outline in
            // the app uses (CatalogPage, ProductPurchasePanel).
            className="btn-outline h-9 px-4 text-[11px]"
          >
            Отменить заказ
          </button>
        )}
      </div>

      {error && <p className="rounded-2xl bg-status-alert-bg px-4 py-3 text-[13px] text-status-alert">{error}</p>}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-3.5">
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Позиции</div>
            <div className="mt-3.5 flex flex-col gap-2.5">
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-[1.6fr_100px_1fr_1fr_90px_36px] items-center gap-2.5 rounded-2xl bg-muted p-3">
                  <span className="truncate text-[13.5px] font-medium">{item.product.title}</span>
                  <input
                    type="number"
                    min={1}
                    defaultValue={item.quantity}
                    onBlur={(e) => {
                      const n = Number(e.target.value)
                      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
                        e.target.value = String(committedItem(item.id)?.quantity ?? item.quantity)
                        return
                      }
                      void commitItemField(item.id, 'quantity', e.target.value, () => {
                        e.target.value = String(committedItem(item.id)?.quantity ?? item.quantity)
                      })
                    }}
                    className="h-9 w-full rounded-lg border border-input bg-white px-2 text-[13px] outline-none focus:border-foreground"
                  />
                  {item.listingType === 'rental' ? (
                    <input
                      type="datetime-local"
                      defaultValue={toLocalInput(item.startDate)}
                      onBlur={(e) => {
                        if (isNaN(new Date(e.target.value).getTime())) {
                          e.target.value = toLocalInput(committedItem(item.id)?.startDate ?? item.startDate)
                          return
                        }
                        void commitItemField(item.id, 'startDate', e.target.value, () => {
                          e.target.value = toLocalInput(committedItem(item.id)?.startDate ?? item.startDate)
                        })
                      }}
                      className="h-9 w-full rounded-lg border border-input bg-white px-2 text-[12px] outline-none focus:border-foreground"
                    />
                  ) : (
                    <span />
                  )}
                  {item.listingType === 'rental' ? (
                    <input
                      type="datetime-local"
                      defaultValue={toLocalInput(item.endDate)}
                      onBlur={(e) => {
                        if (isNaN(new Date(e.target.value).getTime())) {
                          e.target.value = toLocalInput(committedItem(item.id)?.endDate ?? item.endDate)
                          return
                        }
                        void commitItemField(item.id, 'endDate', e.target.value, () => {
                          e.target.value = toLocalInput(committedItem(item.id)?.endDate ?? item.endDate)
                        })
                      }}
                      className="h-9 w-full rounded-lg border border-input bg-white px-2 text-[12px] outline-none focus:border-foreground"
                    />
                  ) : (
                    <span />
                  )}
                  <span className="text-right text-[13.5px] font-semibold">{rub(item.lineTotal)}</span>
                  <button type="button" onClick={() => handleRemoveItem(item.id)} className="justify-self-end text-[13px] text-subtle hover:text-accent" aria-label="Удалить позицию">
                    ✕
                  </button>
                </div>
              ))}
              {items.length === 0 ? <div className="py-6 text-center text-[13px] text-subtle">Нет позиций</div> : null}
            </div>
            <div className="mt-4 flex justify-end gap-2 text-[13px] text-subtle">
              Изменения по позициям сохраняются автоматически при потере фокуса поля.
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Заметки</div>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              className="mt-3 w-full resize-y rounded-xl border border-input bg-muted-well px-3.5 py-2.5 text-[14px] outline-none transition-colors duration-240 ease-expo focus:border-foreground focus:bg-white"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Статус</div>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as AdminOrderDetail['status'])}
              className="mt-3 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <div className="mt-5 text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Сумма</div>
            <div className="mt-2 text-[24px] font-medium tracking-[-0.03em]">{rub(totalPrice)}</div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Клиент</div>
            <div className="mt-3 flex flex-col gap-2 text-[13.5px]">
              <span>{order.customerName}</span>
              <a href={`mailto:${order.customerEmail}`} className="text-subtle hover:text-accent">{order.customerEmail}</a>
              <a href={`tel:${order.customerPhone}`} className="text-subtle hover:text-accent">{order.customerPhone}</a>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">МойСклад</div>
            {submittedAt ? (
              <div className="mt-3 text-[13px] text-subtle">
                Отправлен {new Date(submittedAt).toLocaleString('ru-RU')}
                {moySkladOrderId ? (
                  <div className="mt-1 text-foreground">Заказ МойСклад: {moySkladOrderId}</div>
                ) : (
                  <div className="mt-1 text-accent">Не запушен в МойСклад — см. логи сервера.</div>
                )}
              </div>
            ) : (
              <button type="button" onClick={handleSubmitOrder} disabled={submitting} className="btn-primary mt-3 w-full justify-center">
                {submitting ? 'Отправляем…' : 'Отправить в МойСклад'}
              </button>
            )}
            {submitResult && <p className="mt-3 text-[12.5px]">{submitResult}</p>}
          </div>
        </div>
      </div>
    </>
  )
}
