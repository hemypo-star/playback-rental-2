'use server'

// Server Actions for media (docs/PLAN-next-migration.md Stage 3.4/3.5) —
// same requireAdmin()-before-overrideAccess pattern as every other actions
// file in (admin)/admin/**.
import { getPayload } from 'payload'
import { APIError } from 'payload'
import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { getAdminUser } from '../../../../lib/admin/auth'

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

export async function updateMediaAlt(id: number, alt: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    await payload.update({ collection: 'media', id, data: { alt }, overrideAccess: true })
    revalidatePath('/admin/media')
    return { success: true }
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Не удалось сохранить alt-текст') }
  }
}

export async function deleteMedia(id: number): Promise<ActionResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    await payload.delete({ collection: 'media', id, overrideAccess: true })
    revalidatePath('/admin/media')
    return { success: true }
  } catch {
    return { success: false, error: 'Не удалось удалить — возможно, файл используется' }
  }
}
