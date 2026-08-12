import React from 'react'
import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'

const DAYS_TO_SHOW = 14
const ACTIVE_STATUSES = ['pending', 'confirmed']

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

const STATUS_COLOR: Record<string, string> = {
  pending: '#e0b23f',
  confirmed: '#3fae5c',
  cancelled: '#c04b4b',
  completed: '#4a7fc0',
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

  const activeOrderIds = activeOrders.docs.map((o: any) => o.id)
  const orderStatusById = new Map(activeOrders.docs.map((o: any) => [o.id, o.status]))

  const itemsInRange =
    activeOrderIds.length === 0
      ? { docs: [] as any[] }
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

  const itemsByProduct = new Map<number, any[]>()
  for (const item of itemsInRange.docs) {
    const productId = typeof item.product === 'object' ? item.product.id : item.product
    if (!itemsByProduct.has(productId)) itemsByProduct.set(productId, [])
    itemsByProduct.get(productId)!.push(item)
  }

  const productsWithBookings = products.docs.filter((p: any) => itemsByProduct.has(p.id))
  const productsWithoutBookings = products.docs.filter((p: any) => !itemsByProduct.has(p.id))
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
      <div style={{ padding: '1rem 2.5rem' }}>
        <h1>Календарь занятости</h1>
        <p style={{ color: 'var(--theme-elevation-500)', marginBottom: '1.5rem' }}>
          Ближайшие {DAYS_TO_SHOW} дней, только товары в аренде с активными бронированиями показаны первыми.
        </p>

        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {Object.entries(STATUS_COLOR).map(([status, color]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 12, height: 12, background: color, display: 'inline-block', borderRadius: 2 }} />
              {status}
            </div>
          ))}
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid var(--theme-elevation-150)', borderRadius: 4 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
            <thead>
              <tr>
                <th
                  style={{
                    position: 'sticky',
                    left: 0,
                    background: 'var(--theme-elevation-50)',
                    padding: '0.5rem',
                    textAlign: 'left',
                    minWidth: 220,
                    borderRight: '1px solid var(--theme-elevation-150)',
                  }}
                >
                  Товар
                </th>
                {days.map((day) => (
                  <th
                    key={day.toISOString()}
                    style={{
                      padding: '0.5rem',
                      minWidth: 70,
                      textAlign: 'center',
                      fontWeight: 400,
                      fontSize: '0.8rem',
                      borderLeft: '1px solid var(--theme-elevation-150)',
                    }}
                  >
                    {day.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orderedProducts.map((product: any) => {
                const items = itemsByProduct.get(product.id) || []
                return (
                  <tr key={product.id} style={{ borderTop: '1px solid var(--theme-elevation-100)' }}>
                    <td
                      style={{
                        position: 'sticky',
                        left: 0,
                        background: 'var(--theme-bg)',
                        padding: '0.5rem',
                        borderRight: '1px solid var(--theme-elevation-150)',
                      }}
                    >
                      {product.title}
                    </td>
                    <td colSpan={days.length} style={{ position: 'relative', padding: 0, height: 36 }}>
                      {items.map((item: any) => {
                        const itemStart = startOfDay(new Date(item.startDate))
                        const itemEnd = startOfDay(new Date(item.endDate))
                        const clippedStart = itemStart < today ? today : itemStart
                        const clippedEnd = itemEnd > addDays(today, DAYS_TO_SHOW - 1) ? addDays(today, DAYS_TO_SHOW - 1) : itemEnd
                        const startOffset = Math.round((clippedStart.getTime() - today.getTime()) / 86400000)
                        const span = Math.max(1, Math.round((clippedEnd.getTime() - clippedStart.getTime()) / 86400000) + 1)
                        const orderStatus = orderStatusById.get(
                          typeof item.order === 'object' ? item.order.id : item.order,
                        )
                        return (
                          <div
                            key={item.id}
                            title={`${item.quantity} шт. — заказ #${typeof item.order === 'object' ? item.order.id : item.order}`}
                            style={{
                              position: 'absolute',
                              left: `${(startOffset / days.length) * 100}%`,
                              width: `${(span / days.length) * 100}%`,
                              top: 6,
                              height: 24,
                              background: STATUS_COLOR[orderStatus] || '#999',
                              borderRadius: 3,
                              color: '#fff',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '0 6px',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
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
                  <td colSpan={days.length + 1} style={{ padding: '1rem', textAlign: 'center' }}>
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
