import React from 'react'
import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'
import type { OrderItem } from '../../payload-types'

const DAYS_TO_SHOW = 14
// Only pending/confirmed orders hold a live reservation against stock —
// cancelled/completed orders don't occupy a slot, so they're excluded from
// both the query and the legend (showing them would be a dead legend entry
// bars never actually use).
const ACTIVE_STATUSES = ['pending', 'confirmed']

// Matches the delivered design's occupancy Gantt: confirmed bookings render
// as a solid bar ("Аренда"), pending ones as a hatched bar ("Бронь") — same
// visual grammar, backed by the real order status instead of invented data.
const STATUS_TONE: Record<string, { background: string; color: string; label: string }> = {
  confirmed: { background: '#0A0A0A', color: '#fff', label: 'Подтверждён' },
  pending: {
    background: 'repeating-linear-gradient(45deg, rgba(10,10,10,0.5), rgba(10,10,10,0.5) 1px, #fff 1px, #fff 4px)',
    color: '#0A0A0A',
    label: 'Ожидает звонка',
  },
}

function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

export const CalendarView = async (props: AdminViewServerProps) => {
  const { initPageResult, params, searchParams } = props
  const { req } = initPageResult

  const today = startOfDay(new Date())
  const days = Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(today, i))
  const rangeEnd = addDays(today, DAYS_TO_SHOW)

  const [products, activeOrders] = await Promise.all([
    req.payload.find({
      collection: 'products',
      where: { listingType: { equals: 'rental' } },
      limit: 0,
      depth: 0,
      req,
    }),
    req.payload.find({
      collection: 'orders',
      where: { status: { in: ACTIVE_STATUSES } },
      limit: 0,
      depth: 0,
      req,
    }),
  ])

  const activeOrderIds = activeOrders.docs.map((o) => o.id)
  const orderStatusById = new Map(activeOrders.docs.map((o) => [o.id, o.status]))

  const itemsInRange =
    activeOrderIds.length === 0
      ? { docs: [] as OrderItem[] }
      : await req.payload.find({
          collection: 'orderItems',
          where: {
            and: [
              { order: { in: activeOrderIds } },
              { listingType: { equals: 'rental' } },
              { startDate: { less_than: rangeEnd.toISOString() } },
              { endDate: { greater_than: today.toISOString() } },
            ],
          },
          limit: 0,
          depth: 1,
          req,
        })

  const itemsByProduct = new Map<number, OrderItem[]>()
  for (const item of itemsInRange.docs) {
    const productId = typeof item.product === 'object' ? item.product.id : item.product
    if (!itemsByProduct.has(productId)) itemsByProduct.set(productId, [])
    itemsByProduct.get(productId)!.push(item)
  }

  const productsWithBookings = products.docs.filter((p) => itemsByProduct.has(p.id))
  const productsWithoutBookings = products.docs.filter((p) => !itemsByProduct.has(p.id))
  const orderedProducts = [...productsWithBookings, ...productsWithoutBookings]

  return (
    <DefaultTemplate
      i18n={props.initPageResult.req.i18n}
      locale={props.initPageResult.locale}
      params={params}
      payload={req.payload}
      permissions={initPageResult.permissions}
      req={req}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <div style={{ padding: '2rem 2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 23, fontWeight: 700, letterSpacing: '-0.03em' }}>Календарь занятости</h1>
            <p style={{ margin: '0.2rem 0 0', fontSize: 13, color: 'var(--theme-elevation-500)' }}>
              Ближайшие {DAYS_TO_SHOW} дней — товары с активными бронированиями показаны первыми.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--theme-elevation-500)' }}>
            {Object.entries(STATUS_TONE).map(([status, tone]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: tone.background, border: '1px solid var(--theme-elevation-150)', display: 'inline-block' }} />
                {tone.label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 20, overflowX: 'auto', border: '1px solid var(--theme-elevation-100)', borderRadius: 20, background: 'var(--theme-elevation-0)' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
            <thead>
              <tr>
                <th
                  style={{
                    position: 'sticky',
                    left: 0,
                    background: 'var(--theme-elevation-0)',
                    padding: '0.85rem 1rem',
                    textAlign: 'left',
                    minWidth: 220,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: 'var(--theme-elevation-400)',
                    borderBottom: '1px solid var(--theme-elevation-100)',
                    borderRight: '1px solid var(--theme-elevation-100)',
                  }}
                >
                  Товар
                </th>
                {days.map((day) => (
                  <th
                    key={day.toISOString()}
                    style={{
                      padding: '0.85rem 0.4rem',
                      minWidth: 70,
                      textAlign: 'center',
                      fontWeight: 500,
                      fontSize: 12,
                      color: 'var(--theme-elevation-500)',
                      borderBottom: '1px solid var(--theme-elevation-100)',
                    }}
                  >
                    {day.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orderedProducts.map((product) => {
                const items = itemsByProduct.get(product.id) || []
                return (
                  <tr key={product.id}>
                    <td
                      style={{
                        position: 'sticky',
                        left: 0,
                        background: 'var(--theme-elevation-0)',
                        padding: '0.7rem 1rem',
                        fontSize: 13.5,
                        fontWeight: 600,
                        letterSpacing: '-0.012em',
                        borderTop: '1px solid var(--theme-elevation-50)',
                        borderRight: '1px solid var(--theme-elevation-100)',
                      }}
                    >
                      {product.title}
                    </td>
                    <td colSpan={days.length} style={{ position: 'relative', padding: 0, height: 40, borderTop: '1px solid var(--theme-elevation-50)' }}>
                      {items.map((item) => {
                        // Rental items always have both dates set (required
                        // at the OrderItems collection level for
                        // listingType: 'rental') — nullable in the schema
                        // only because the field is shared with sale items.
                        const itemStart = startOfDay(new Date(item.startDate!))
                        const itemEnd = startOfDay(new Date(item.endDate!))
                        const clippedStart = itemStart < today ? today : itemStart
                        const clippedEnd = itemEnd > addDays(today, DAYS_TO_SHOW - 1) ? addDays(today, DAYS_TO_SHOW - 1) : itemEnd
                        const startOffset = Math.round((clippedStart.getTime() - today.getTime()) / 86400000)
                        const span = Math.max(1, Math.round((clippedEnd.getTime() - clippedStart.getTime()) / 86400000) + 1)
                        // Always resolves: item.order is always one of the
                        // activeOrders this query already scoped itemsInRange
                        // to, and orderStatusById is built from that exact
                        // same activeOrders list.
                        const orderStatus = orderStatusById.get(
                          typeof item.order === 'object' ? item.order.id : item.order,
                        )!
                        const tone = STATUS_TONE[orderStatus] ?? { background: '#6E6E73', color: '#fff', label: orderStatus }
                        return (
                          <div
                            key={item.id}
                            title={`${item.quantity} шт. — заказ #${typeof item.order === 'object' ? item.order.id : item.order} · ${tone.label}`}
                            style={{
                              position: 'absolute',
                              left: `${(startOffset / days.length) * 100}%`,
                              width: `${(span / days.length) * 100}%`,
                              top: 6,
                              height: 28,
                              background: tone.background,
                              borderRadius: 9,
                              color: tone.color,
                              fontSize: 12,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              padding: '0 8px',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              border: '1px solid var(--theme-elevation-150)',
                            }}
                          >
                            ×{item.quantity}
                          </div>
                        )
                      })}
                    </td>
                  </tr>
                )
              })}
              {orderedProducts.length === 0 && (
                <tr>
                  <td colSpan={days.length + 1} style={{ padding: '2rem', textAlign: 'center', color: 'var(--theme-elevation-400)' }}>
                    Нет товаров в аренде
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DefaultTemplate>
  )
}
