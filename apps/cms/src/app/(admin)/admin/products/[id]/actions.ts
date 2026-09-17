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
  price: number
  quantity: number
  available: boolean
  subtitle: string
  tag: string
  images: number[]
  isKit: boolean
  oldPrice?: number | null
  kitItems?: { label: string }[]
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
