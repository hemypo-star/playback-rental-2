'use server'

// Server Actions for kit ("Набор") management — kits are ordinary products
// (same collection, storefront renders them via isKit/oldPrice/kitItems)
// assembled from already-synced МойСклад items. Products themselves still
// only originate from sync:moysklad; a kit is the one exception created by
// hand here. moySkladId gets a synthetic `kit-<uuid>` so it satisfies the
// required+unique sync key without ever colliding with a real МойСклад id —
// and lastSyncedMsValues stays null, so the sync job never matches this row
// (МойСклад has no such entity).
import type { RequiredDataFromCollectionSlug } from 'payload'
import { getPayload } from 'payload'
import config from '@payload-config'
import { revalidatePath, updateTag } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { getAdminUser } from '../../../../lib/admin/auth'
import { STOREFRONT_CACHE_TAGS } from '../../../../lib/data/cacheTags'

export interface KitActionResult {
  success: boolean
  error?: string
  id?: number
}

async function requireAdmin() {
  const user = await getAdminUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export interface KitInput {
  title: string
  description: string
  subtitle: string
  tag: string
  price: number
  // null => computed server-side from the chosen components (sum of their
  // prices: daily rental rate for rental items, sale price for sale items).
  oldPrice: number | null
  quantity: number
  available: boolean
  images: number[]
  category: number | null
  // Product ids whose titles make up "Что в комплекте".
  componentIds: number[]
}

function validate(data: KitInput): string | null {
  if (!data.title.trim()) return 'Укажите название набора'
  if (!(data.price > 0)) return 'Цена должна быть больше нуля'
  if (data.oldPrice != null && data.oldPrice < data.price) return 'Цена «по отдельности» не может быть ниже цены набора'
  if (data.componentIds.length === 0) return 'Добавьте хотя бы один товар в состав'
  if (!(data.quantity >= 0)) return 'Количество не может быть отрицательным'
  return null
}

async function revalidate(id: number) {
  updateTag(STOREFRONT_CACHE_TAGS.catalogFacets)
  revalidatePath('/admin/kits')
  revalidatePath(`/admin/kits/${id}`)
  revalidatePath('/admin/stock')
  revalidatePath(`/product/${id}`)
}

export async function saveKit(id: number | null, data: KitInput): Promise<KitActionResult> {
  try {
    await requireAdmin()
    const problem = validate(data)
    if (problem) return { success: false, error: problem }

    const payload = await getPayload({ config })

    // Resolve component product ids -> their titles + prices (labels are
    // plain text on purpose: a kit keeps showing its composition even if a
    // component is later renamed/deleted in МойСклад; productId is stored
    // alongside so the editor can re-check the components and the
    // storefront can render them as cards).
    const components = await payload.find({
      collection: 'products',
      where: { id: { in: data.componentIds } },
      limit: data.componentIds.length || 1,
      depth: 0,
      select: { title: true, price: true, listingType: true },
    })
    if (components.docs.length !== data.componentIds.length) {
      return { success: false, error: 'Некоторые товары состава не найдены — обновите страницу' }
    }
    const componentById = new Map(components.docs.map((p) => [p.id, p]))
    // Preserve the picker's selection order (payload.find returns docs in
    // table order, not the order of the `in` list).
    const orderedComponents = data.componentIds
      .map((cid) => componentById.get(cid))
      .filter((p): p is (typeof components.docs)[number] => Boolean(p))
    // «По отдельности» (oldPrice): sum of the components' prices — daily
    // rental rate for rental items, sale price for sale items. Computed on
    // the server so it always reflects the current МойСклад-synced prices;
    // a manual value from the form is only used when it's higher.
    const computedOldPrice = orderedComponents.reduce((sum, p) => sum + Number(p.price ?? 0), 0)
    const oldPrice = data.oldPrice != null && data.oldPrice > computedOldPrice ? data.oldPrice : computedOldPrice

    const kitData = {
      title: data.title.trim(),
      listingType: 'rental' as const,
      description: data.description,
      subtitle: data.subtitle,
      tag: data.tag,
      price: data.price,
      oldPrice,
      quantity: data.quantity,
      available: data.available,
      isKit: true,
      // Same relationship normalization as saveProduct: raw numbers fail
      // Payload's relationship validation ("The following field is invalid").
      images: data.images.map((v) => String(v)),
      category: String(data.category),
      kitItems: orderedComponents.map((p) => ({ label: p.title, productId: p.id })),
    } as unknown as Record<string, unknown>

    let docId: number
    if (id === null) {
      const created = await payload.create({
        collection: 'products',
        // Synthetic sync key: satisfies required+unique moySkladId without
        // ever matching a real МойСклад entity (see module docblock).
        data: { ...kitData, moySkladId: `kit-${randomUUID()}` } as RequiredDataFromCollectionSlug<'products'>,
        overrideAccess: true,
      })
      docId = created.id
    } else {
      await payload.update({ collection: 'products', id, data: kitData, overrideAccess: true })
      docId = id
    }
    await revalidate(docId)
    return { success: true, id: docId }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Не удалось сохранить набор' }
  }
}

// Photo upload moved to a route handler (POST /admin/kits/upload) — Server
// Actions serialize FormData through an internal blob store that 500s on
// large images. See lib/admin/data/kits.ts handleKitImageUpload.

export async function deleteKit(id: number): Promise<KitActionResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    const doc = await payload.findByID({ collection: 'products', id, depth: 0 })
    if (!doc?.isKit) return { success: false, error: 'Это не набор' }
    await payload.delete({ collection: 'products', id, overrideAccess: true })
    updateTag(STOREFRONT_CACHE_TAGS.catalogFacets)
    revalidatePath('/admin/kits')
    revalidatePath('/admin/stock')
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Не удалось удалить набор' }
  }
}
