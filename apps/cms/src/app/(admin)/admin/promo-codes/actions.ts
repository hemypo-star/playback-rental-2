'use server'

// Server Actions for promo-code CRUD (backlog item 5, docs/ROADMAP-2.0.md).
// Single-page inline-editing shape, per the owner's own correction on this
// screen — follows UsersPanel.tsx's actions.ts precedent (a flat list of
// action functions, no [id]/actions.ts split), not the categories/
// promotions list+detail pattern. Same requireAdmin()-before-overrideAccess
// invariant as every other actions file in (admin)/admin/**: a Server
// Action is independently invokable and is NOT gated by the page's layout
// guard just because the page lives under it.
import { getPayload } from 'payload'
import { APIError } from 'payload'
import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { getAdminUser } from '../../../../lib/admin/auth'

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

export interface CreatePromoCodeInput {
  code: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  validUntil: string | null
  description: string
}

export async function createPromoCode(data: CreatePromoCodeInput): Promise<ActionResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    const doc = await payload.create({
      collection: 'promoCodes',
      data: {
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        active: true,
        ...(data.validUntil ? { validUntil: data.validUntil } : {}),
        ...(data.description ? { description: data.description } : {}),
      },
      overrideAccess: true,
    })
    revalidatePath('/admin/promo-codes')
    return { success: true, id: doc.id }
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Не удалось создать промокод') }
  }
}

// Inline row edits (discountValue/discountType/active) all funnel through
// this one action, sent as a single combined write rather than one action
// per field — see PromoCodesPanel.tsx's own comment on why discountType and
// discountValue are always committed together: PromoCodes.ts's field-level
// `validate` rejects a percent discountValue over 100 for the *resulting*
// document regardless of which field a lone single-field update would have
// changed, so a type-only or value-only write could 400 on a perfectly
// intentional edit (e.g. lowering 500₽ before switching to percent) if the
// two ever raced against each other as separate requests.
export interface UpdatePromoCodeInput {
  discountType?: 'percent' | 'fixed'
  discountValue?: number
  active?: boolean
}

export async function updatePromoCode(id: number, data: UpdatePromoCodeInput): Promise<ActionResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    await payload.update({ collection: 'promoCodes', id, data, overrideAccess: true })
    revalidatePath('/admin/promo-codes')
    return { success: true }
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Не удалось сохранить изменения') }
  }
}

export async function deletePromoCode(id: number): Promise<ActionResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    await payload.delete({ collection: 'promoCodes', id, overrideAccess: true })
    revalidatePath('/admin/promo-codes')
    return { success: true }
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Не удалось удалить промокод') }
  }
}
