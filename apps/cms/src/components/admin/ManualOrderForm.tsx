'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { rub } from '../../lib/admin/format'
import { createManualOrderAction } from '../../app/(admin)/admin/orders/new/actions'

interface ProductOption {
  id: number
  title: string
  listingType: 'rental' | 'sale'
  price: number
  available: boolean
}

interface ItemRow {
  key: number
  productId: string
  quantity: string
  startDate: string
  endDate: string
}

interface Props {
  products: ProductOption[]
}

function emptyRow(key: number): ItemRow {
  return { key, productId: '', quantity: '1', startDate: '', endDate: '' }
}

export default function ManualOrderForm({ products }: Props) {
  const router = useRouter()
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [items, setItems] = useState<ItemRow[]>([emptyRow(1)])
  const [nextKey, setNextKey] = useState(2)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const productsById = useMemo(() => new Map(products.map((product) => [String(product.id), product])), [products])

  const updateItem = (key: number, patch: Partial<ItemRow>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  const addItem = () => {
    setItems((current) => [...current, emptyRow(nextKey)])
    setNextKey((value) => value + 1)
  }

  const removeItem = (key: number) => {
    setItems((current) => current.filter((item) => item.key !== key))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (items.length === 0) {
      setError('Добавьте хотя бы одну позицию.')
      return
    }

    const normalizedItems = []
    for (const item of items) {
      const product = productsById.get(item.productId)
      const quantity = Number(item.quantity)
      if (!product) {
        setError('Выберите товар для каждой позиции.')
        return
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        setError('Количество должно быть целым числом не меньше 1.')
        return
      }
      if (product.listingType === 'rental' && (!item.startDate || !item.endDate)) {
        setError(`Для «${product.title}» укажите дату выдачи и возврата.`)
        return
      }

      normalizedItems.push({
        productId: product.id,
        quantity,
        ...(product.listingType === 'rental'
          ? {
              startDate: new Date(item.startDate).toISOString(),
              endDate: new Date(item.endDate).toISOString(),
            }
          : {}),
      })
    }

    setSubmitting(true)
    const result = await createManualOrderAction({
      customerName,
      customerEmail,
      customerPhone,
      notes,
      promoCode,
      items: normalizedItems,
    })
    setSubmitting(false)

    if (!result.success || !result.orderId) {
      setError(result.error || 'Не удалось создать заказ.')
      return
    }

    router.push(`/admin/orders/${result.orderId}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="flex flex-col gap-3.5">
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Клиент</div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-[10.5px] font-semibold tracking-[0.12em] text-subtle uppercase">Имя</span>
              <input
                required
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Как обращаться к клиенту"
                className="h-11 rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10.5px] font-semibold tracking-[0.12em] text-subtle uppercase">Телефон</span>
              <input
                required
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="+7 (___) ___-__-__"
                className="h-11 rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10.5px] font-semibold tracking-[0.12em] text-subtle uppercase">Email</span>
              <input
                required
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                placeholder="email@example.com"
                className="h-11 rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground"
              />
            </label>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Позиции</div>
              <div className="mt-1 text-[12px] text-subtle">Цена и доступность проверяются сервером при создании.</div>
            </div>
            <button type="button" onClick={addItem} className="btn-outline h-9 px-4 text-[11px]">
              Добавить позицию
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {items.map((item, index) => {
              const product = productsById.get(item.productId)
              return (
                <div key={item.key} className="rounded-2xl bg-muted p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[12px] font-semibold text-subtle">Позиция {index + 1}</div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      className="text-[12px] text-subtle hover:text-accent"
                      aria-label={`Удалить позицию ${index + 1}`}
                    >
                      Удалить
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_110px]">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10.5px] font-semibold tracking-[0.12em] text-subtle uppercase">Товар</span>
                      <select
                        required
                        value={item.productId}
                        onChange={(event) =>
                          updateItem(item.key, {
                            productId: event.target.value,
                            startDate: '',
                            endDate: '',
                          })
                        }
                        className="h-11 rounded-xl border border-input bg-white px-3.5 text-[14px] outline-none focus:border-foreground"
                      >
                        <option value="">Выберите товар</option>
                        {products.map((option) => (
                          <option key={option.id} value={option.id} disabled={!option.available}>
                            {option.title} · {rub(option.price)}{option.listingType === 'rental' ? '/день' : ''}{!option.available ? ' · недоступен' : ''}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10.5px] font-semibold tracking-[0.12em] text-subtle uppercase">Количество</span>
                      <input
                        required
                        type="number"
                        min={1}
                        step={1}
                        value={item.quantity}
                        onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                        className="h-11 rounded-xl border border-input bg-white px-3.5 text-[14px] outline-none focus:border-foreground"
                      />
                    </label>
                  </div>

                  {product?.listingType === 'rental' ? (
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-[10.5px] font-semibold tracking-[0.12em] text-subtle uppercase">Выдача</span>
                        <input
                          required
                          type="datetime-local"
                          value={item.startDate}
                          onChange={(event) => updateItem(item.key, { startDate: event.target.value })}
                          className="h-11 rounded-xl border border-input bg-white px-3.5 text-[13px] outline-none focus:border-foreground"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-[10.5px] font-semibold tracking-[0.12em] text-subtle uppercase">Возврат</span>
                        <input
                          required
                          type="datetime-local"
                          value={item.endDate}
                          onChange={(event) => updateItem(item.key, { endDate: event.target.value })}
                          className="h-11 rounded-xl border border-input bg-white px-3.5 text-[13px] outline-none focus:border-foreground"
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              )
            })}

            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[13px] text-subtle">
                Добавьте хотя бы одну позицию.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Дополнительно</div>
          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold tracking-[0.12em] text-subtle uppercase">Промокод</span>
            <input
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value)}
              placeholder="Необязательно"
              className="h-11 rounded-xl border border-input bg-muted-well px-3.5 text-[14px] uppercase outline-none focus:border-foreground"
            />
          </label>
          <label className="mt-3 flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold tracking-[0.12em] text-subtle uppercase">Заметки</span>
            <textarea
              rows={5}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Источник заявки, пожелания клиента, комментарий менеджера"
              className="resize-y rounded-xl border border-input bg-muted-well px-3.5 py-2.5 text-[14px] outline-none focus:border-foreground"
            />
          </label>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="text-[13px] leading-5 text-subtle">
            Заказ создастся со статусом «Ожидает звонка». МойСклад и уведомления не отправляются автоматически — сначала проверьте карточку заказа.
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl bg-[#FFE9E4] px-4 py-3 text-[13px] text-[#B03017]">{error}</p>
          ) : null}

          <button type="submit" disabled={submitting} className="btn-primary mt-5 w-full justify-center">
            {submitting ? 'Создаём…' : 'Создать заказ'}
          </button>
          <Link href="/admin/orders" className="mt-3 block text-center text-[12.5px] font-semibold text-subtle hover:text-foreground">
            Отмена
          </Link>
        </div>
      </div>
    </form>
  )
}
