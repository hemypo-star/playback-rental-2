import React from 'react'
import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'

const RUB = (n: number) => Math.round(n).toLocaleString('ru-RU') + ' ₽'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return (first + second).toUpperCase() || '—'
}

// Repurposes real order contacts as client profiles — grouped by email, not
// a separate customers/CRM collection. No document upload or approval
// workflow: checkout today only ever collects name/email/phone/notes, so
// there is nothing behind an "approve" action to build against.
export const ClientsView = async (props: AdminViewServerProps) => {
  const { initPageResult, params, searchParams } = props
  const { req } = initPageResult

  const orders = await req.payload.find({
    collection: 'orders',
    where: { status: { not_equals: 'cancelled' } },
    sort: '-createdAt',
    limit: 0,
    depth: 0,
    req,
  })

  const byEmail = new Map<
    string,
    { name: string; email: string; phone: string; orderCount: number; totalSpent: number; lastOrderAt: string }
  >()
  for (const o of orders.docs) {
    const key = o.customerEmail
    const existing = byEmail.get(key)
    if (existing) {
      existing.orderCount += 1
      existing.totalSpent += o.totalPrice || 0
      if (o.createdAt > existing.lastOrderAt) existing.lastOrderAt = o.createdAt
    } else {
      byEmail.set(key, {
        name: o.customerName,
        email: o.customerEmail,
        phone: o.customerPhone,
        orderCount: 1,
        totalSpent: o.totalPrice || 0,
        lastOrderAt: o.createdAt,
      })
    }
  }
  const clients = [...byEmail.values()].sort((a, b) => (a.lastOrderAt < b.lastOrderAt ? 1 : -1))

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
          <h1 style={{ margin: 0, fontSize: 23, fontWeight: 700, letterSpacing: '-0.03em' }}>Клиенты</h1>
          <p style={{ margin: '0.2rem 0 0', fontSize: 13, color: 'var(--theme-elevation-500)' }}>
            {clients.length} {clients.length === 1 ? 'клиент' : 'клиентов'} по не отменённым заказам, сгруппировано по email.
          </p>
        </div>

        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {clients.map((c) => (
            <div
              key={c.email}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: 20,
                border: '1px solid var(--theme-elevation-100)',
                borderRadius: 22,
                background: 'var(--theme-elevation-0)',
              }}
            >
              <span
                style={{
                  width: 46,
                  height: 46,
                  flexShrink: 0,
                  borderRadius: '50%',
                  background: '#0A0A0A',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {initials(c.name)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.02em' }}>{c.name}</div>
                <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--theme-elevation-500)' }}>
                  {c.phone} · {c.orderCount} {c.orderCount === 1 ? 'заказ' : 'заказов'} · {RUB(c.totalSpent)}
                </div>
              </div>
            </div>
          ))}
          {clients.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--theme-elevation-400)' }}>Пока нет заказов</div>
          )}
        </div>
      </div>
    </DefaultTemplate>
  )
}
