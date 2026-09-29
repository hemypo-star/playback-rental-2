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

    // Resolve component product ids -> their titles (labels are plain text
    // on purpose: a kit keeps showing its composition even if a component
    // is later renamed/deleted in МойСклад).
    const components = await payload.find({
      collection: 'products',
      where: { id: { in: data.componentIds } },
      limit: data.componentIds.length || 1,
      depth: 0,
      select: { title: true },
    })
    if (components.docs.length !== data.componentIds.length) {
      return { success: false, error: 'Некоторые товары состава не найдены — обновите страницу' }
    }
    const labelById = new Map(components.docs.map((p) => [p.id, p.title]))

    const kitData = {
      title: data.title.trim(),
      listingType: 'rental' as const,
      description: data.description,
      subtitle: data.subtitle,
      tag: data.tag,
      price: data.price,
      oldPrice: data.oldPrice,
      quantity: data.quantity,
      available: data.available,
      isKit: true,
      images: data.images,
      category: data.category as number,
      kitItems: data.componentIds.map((cid) => ({ label: labelById.get(cid) ?? '' })),
    }

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

// Photo upload for the kit form — server-side Local API with overrideAccess
// (the client-side uploadMedia() helper POSTs to /api/media, whose access
// rules aren't guaranteed for this session). Same mechanism as sync's image
// import.
export async function uploadKitImage(formData: FormData): Promise<{ success: boolean; id?: number; url?: string; error?: string }> {
  try {
    await requireAdmin()
    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) return { success: false, error: 'Файл не получен' }
    const { uploadKitImageFromFile } = await import('../../../../lib/admin/data/kits')
    const uploaded = await uploadKitImageFromFile(file)
    return { success: true, id: uploaded.id, url: uploaded.url }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Не удалось загрузить фото' }
  }
}

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
