'use server'

// Server Actions for category CRUD (docs/PLAN-next-migration.md Stage 3.4/
// 3.5) — replace apps/web/src/pages/admin/categories/[id].astro's inline
// <script> fetch() calls against Payload's own REST endpoints (POST/PATCH/
// DELETE /api/categories[/:id]). Same requireAdmin()-before-overrideAccess
// reasoning as orders/[id]/actions.ts: a Server Action isn't gated by the
// (admin)/admin/layout.tsx guard just because its page lives under it.
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

export interface CategoryInput {
  name: string
  slug: string
  description: string
  tag: string
  order: number
  image: number | null
  parent: number | null
}

export async function saveCategory(id: number | null, data: CategoryInput): Promise<ActionResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    const doc =
      id === null
        ? await payload.create({ collection: 'categories', data, overrideAccess: true })
        : await payload.update({ collection: 'categories', id, data, overrideAccess: true })
    revalidatePath('/admin/categories')
    if (id !== null) revalidatePath(`/admin/categories/${id}`)
    return { success: true, id: doc.id }
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Не удалось сохранить') }
  }
}

export async function deleteCategory(id: number): Promise<ActionResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    await payload.delete({ collection: 'categories', id, overrideAccess: true })
    revalidatePath('/admin/categories')
    return { success: true }
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Не удалось удалить — возможно, есть связанные товары') }
  }
}
