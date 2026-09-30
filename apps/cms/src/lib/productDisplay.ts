import type { Product } from '../payload-types'

// The name of a product's category, when the relation is populated.
//
// `Product.category` is `number | Category` — a bare id at depth 0, the whole
// document at depth 1 (what every storefront query uses, since cards need the
// images relation anyway). Callers that render a category name from a depth-0
// result get `undefined` here rather than a stringified id; there is no
// second lookup hidden behind this, deliberately.
export function categoryNameOf(product: Pick<Product, 'category'>): string | undefined {
  return typeof product.category === 'object' && product.category ? product.category.name : undefined
}
