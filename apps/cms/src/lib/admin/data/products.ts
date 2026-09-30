import { getPayload } from 'payload'
import config from '@payload-config'
import type { Product } from '../../../payload-types'

// Admin-scoped product reads (docs/PLAN-next-migration.md Stage 3.5, page
// group 5). Only the promotion form's "linked products" picker needs this
// (all products, not just available ones — matches apps/web's
// cmsFetch('/products?sort=title&limit=500&depth=0')); the product edit
// page reuses lib/data/products.ts's existing getProductById() as-is, since
// that one already does exactly what the admin edit form needs
// (depth:1, disableErrors instead of a REST 404).
export async function getAdminProducts(): Promise<Product[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({ collection: 'products', sort: 'title', limit: 500, depth: 0 })
  return result.docs
}
