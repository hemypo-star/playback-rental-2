'use server'

// Server Actions for promotion CRUD (docs/PLAN-next-migration.md Stage 3.4/
// 3.5) — same pattern as categories/[id]/actions.ts.
import { getPayload } from 'payload'
import { APIError } from 'payload'
import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { getAdminUser } from '../../../../../lib/admin/auth'

export interface ActionResult {
  success: boolean
  error?: string
  id?: number
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof APIError ? error.message : fallback
}

async function requireAdmin() {
  const user = await getAdminUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export interface PromotionInput {
  title: string
  slug: string | undefined
  kicker: string
  text: string
  content: string
  linkUrl: string
  active: boolean
  order: number
  image: number
  linkedProducts: number[]
  linkedCategories: number[]
}

export async function savePromotion(id: number | null, data: PromotionInput): Promise<ActionResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    const doc =
      id === null
        ? await payload.create({ collection: 'promotions', data, overrideAccess: true })
        : await payload.update({ collection: 'promotions', id, data, overrideAccess: true })
    revalidatePath('/admin/promotions')
    if (id !== null) revalidatePath(`/admin/promotions/${id}`)
    if (doc.slug) revalidatePath(`/promotions/${doc.slug}`)
    return { success: true, id: doc.id }
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Не удалось сохранить') }
  }
}

export async function deletePromotion(id: number): Promise<ActionResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    await payload.delete({ collection: 'promotions', id, overrideAccess: true })
    revalidatePath('/admin/promotions')
    return { success: true }
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Не удалось удалить') }
  }
}
