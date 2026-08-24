import { getPayload } from 'payload'
import config from '@payload-config'

// Ported near-verbatim from apps/cms/src/endpoints/admin/clients.ts
// (docs/PLAN-next-migration.md Stage 3.5, page group 4) — real order
// contacts grouped by email, not a separate customers/CRM collection
// (checkout only ever collects name/email/phone/notes).
export interface AdminClientRow {
  name: string
  email: string
  phone: string
  orderCount: number
  totalSpent: number
  lastOrderAt: string
}

export async function getAdminClients(): Promise<AdminClientRow[]> {
  const payload = await getPayload({ config })

  const orders = await payload.find({
    collection: 'orders',
    where: { status: { not_equals: 'cancelled' } },
    sort: '-createdAt',
    limit: 0,
    depth: 0,
  })

  const byEmail = new Map<string, AdminClientRow>()
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

  return [...byEmail.values()].sort((a, b) => (a.lastOrderAt < b.lastOrderAt ? 1 : -1))
}
