import type { Endpoint } from 'payload'

// Ported near-verbatim from apps/cms/src/components/admin/ClientsView.tsx —
// real order contacts grouped by email, not a separate customers/CRM
// collection (checkout only ever collects name/email/phone/notes).
export const adminClientsEndpoint: Endpoint = {
  path: '/admin/clients',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    for (const o of orders.docs as any[]) {
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

    return Response.json({ clients })
  },
}
