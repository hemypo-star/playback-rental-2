import { getPayload } from 'payload'
import config from '@payload-config'

// Ported from apps/cms/src/endpoints/admin/stock.ts (docs/PLAN-next-
// migration.md Stage 3.5, page group 4) — same reasoning as the other
// lib/admin/data/*.ts files. Status badge logic matches
// apps/cms/src/components/admin/StockStatusCell.tsx exactly (same three
// tiers), kept as one canonical definition to avoid the two views silently
// drifting apart.
export interface AdminStockRow {
  id: number
  title: string
  category: string | null
  quantity: number
  price: number
  listingType: 'rental' | 'sale'
  status: 'out' | 'low' | 'ok'
}

export async function getAdminStock(): Promise<AdminStockRow[]> {
  const payload = await getPayload({ config })

  const products = await payload.find({ collection: 'products', sort: 'title', limit: 0, depth: 1 })

  return products.docs.map((p) => {
    let status: AdminStockRow['status']
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
}
