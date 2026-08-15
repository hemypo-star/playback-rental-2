import React from 'react'
import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'

const RUB = (n: number) => Math.round(n).toLocaleString('ru-RU') + ' ₽'

// Revenue by category, computed live from order items on non-cancelled
// orders — no invented figures (unlike the design reference's Analytics
// tab, which used placeholder numbers with no backing data model).
export const AnalyticsView = async (props: AdminViewServerProps) => {
  const { initPageResult, params, searchParams } = props
  const { req } = initPageResult

  const cancelledOrders = await req.payload.find({
    collection: 'orders',
    where: { status: { equals: 'cancelled' } },
    limit: 0,
    depth: 0,
    req,
  })
  const cancelledIds = cancelledOrders.docs.map((o: any) => o.id)

  const items = await req.payload.find({
    collection: 'orderItems',
    where: cancelledIds.length ? { order: { not_in: cancelledIds } } : {},
    limit: 0,
    depth: 2,
    req,
  })

  const byCategory = new Map<string, number>()
  for (const item of items.docs as any[]) {
    const category = typeof item.product === 'object' ? item.product?.category : undefined
    const name = typeof category === 'object' && category ? category.name : 'Без категории'
    byCategory.set(name, (byCategory.get(name) ?? 0) + (item.lineTotal || 0))
  }

  const rows = [...byCategory.entries()].sort((a, b) => b[1] - a[1])
  const maxRevenue = rows.length ? rows[0][1] : 1

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
        <div>
          <h1 style={{ margin: 0, fontSize: 23, fontWeight: 700, letterSpacing: '-0.03em' }}>Аналитика</h1>
          <p style={{ margin: '0.2rem 0 0', fontSize: 13, color: 'var(--theme-elevation-500)' }}>
            Выручка по категориям — сумма позиций заказов, кроме отменённых.
          </p>
        </div>

        <div style={{ marginTop: 20, border: '1px solid var(--theme-elevation-100)', borderRadius: 22, background: 'var(--theme-elevation-0)', padding: 24 }}>
          {rows.map(([name, revenue]) => (
            <div key={name} style={{ display: 'grid', gridTemplateColumns: '220px 1fr 110px', gap: 18, alignItems: 'center', padding: '13px 0' }}>
              <span style={{ fontSize: 14 }}>{name}</span>
              <div style={{ height: 14, borderRadius: 999, background: 'var(--theme-elevation-100)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    background: '#0A0A0A',
                    width: `${Math.max(4, (revenue / maxRevenue) * 100)}%`,
                  }}
                />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'right' }}>{RUB(revenue)}</span>
            </div>
          ))}
          {rows.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--theme-elevation-400)' }}>Пока нет данных</div>
          )}
        </div>
      </div>
    </DefaultTemplate>
  )
}
