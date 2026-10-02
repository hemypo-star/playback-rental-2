'use server'

// Server Action for product edits (docs/PLAN-next-migration.md Stage 3.4/
// 3.5) — same pattern as categories/promotions' actions.ts. Update-only:
// products only ever originate from sync:moysklad (moySkladId is
// required + readOnly), no create form here, matching the Astro source.
import { getPayload } from 'payload'
import { APIError } from 'payload'
import config from '@payload-config'
import { revalidatePath, updateTag } from 'next/cache'
import { getAdminUser } from '../../../../../lib/admin/auth'
import { STOREFRONT_CACHE_TAGS } from '../../../../../lib/data/cacheTags'

export interface ActionResult {
  success: boolean
  error?: string
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof APIError ? error.message : fallback
}

async function requireAdmin() {
  const user = await getAdminUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export interface ProductInput {
  // Storefront-editable fields only (per product owner: title, description,
  // subtitle, tag, images, available) + the curated compatibleAccessories
  // list (admin-only, never synced). price/quantity/category/listingType/
  // kit fields and MoySklad* / lastSyncedAt are read-only in the admin UI —
  // see the Products collection comment.
  title: string
  description: string
  available: boolean
  subtitle: string
  tag: string
  images: number[]
  // Product ids of compatible accessories ("Совместимые аксессуары").
  compatibleAccessories: number[]
}

export async function saveProduct(id: number, data: ProductInput): Promise<ActionResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    await payload.update({ collection: 'products', id, data, overrideAccess: true })
    updateTag(STOREFRONT_CACHE_TAGS.catalogFacets)
    revalidatePath('/admin/stock')
    revalidatePath(`/admin/products/${id}`)
    revalidatePath(`/product/${id}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Не удалось сохранить') }
  }
}

// "Синхронизировать" button on the product page — pulls this one product's
// МойСклад-side (read-only) fields now instead of waiting for a webhook or
// the next scheduled run. Same code path as the webhook receiver and the
// bulk sync (syncSingleEntity -> upsertProduct), so results can't drift.
// Note: storefront-editable fields (title/description/category/images) are
// refreshed from МойСклад only while they haven't been edited locally; to
// re-adopt them after an edit, sync first, then re-edit in the panel.
export interface SyncResultAction extends ActionResult {
  synced?: boolean
  reason?: string
}

export async function syncProduct(id: number): Promise<SyncResultAction> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    const { syncProductById } = await import('../../../../../lib/moysklad/sync')
    const result = await syncProductById(payload, id)
    if (result.synced) {
      updateTag(STOREFRONT_CACHE_TAGS.catalogFacets)
      revalidatePath('/admin/stock')
      revalidatePath(`/admin/products/${id}`)
      revalidatePath(`/product/${id}`)
    }
    return { success: result.synced, synced: result.synced, reason: result.reason, error: result.synced ? undefined : result.reason }
  } catch (error) {
    return { success: false, synced: false, error: errorMessage(error, 'Не удалось синхронизировать') }
  }
}
