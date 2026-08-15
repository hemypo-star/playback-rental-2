import type { Endpoint } from 'payload'

// Backs the "Склад" tab's table (Позиция · Категория · Остаток · Цена ·
// Статус — see docs/design-reference/markup.html's tabStock block). Status
// badge logic matches apps/cms/src/components/admin/StockStatusCell.tsx
// exactly (same three tiers), kept as one canonical definition to avoid the
// two views silently drifting apart.
//
// Step 4 scope: read-only listing. Editing (price/quantity/available) is
// Step 6 (catalog editing) — products can't be created manually at all
// regardless of step, they only exist via sync:moysklad (moySkladId is
// required + readOnly on the Products collection).
export const adminStockEndpoint: Endpoint = {
  path: '/admin/stock',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const products = await req.payload.find({
      collection: 'products',
      sort: 'title',
      limit: 0,
      depth: 1,
      req,
    })

    const rows = products.docs.map((p: any) => {
      let status: 'out' | 'low' | 'ok'
      if (!p.available || p.quantity === 0) {
        status = 'out'
      } else if (p.quantity <= 2) {
        status = 'low'
      } else {
        status = 'ok'
      }

      return {
        id: p.id,
        title: p.title,
        category: typeof p.category === 'object' && p.category ? p.category.name : null,
        quantity: p.quantity,
        price: p.price,
        listingType: p.listingType,
        status,
      }
    })

    return Response.json({ products: rows })
  },
}
