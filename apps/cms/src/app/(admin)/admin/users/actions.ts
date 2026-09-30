'use server'

// Server Actions for admin user management (docs/PLAN-next-migration.md
// Stage 3.4/3.5) — same requireAdmin()-before-overrideAccess pattern as
// every other actions file in (admin)/admin/**. changeOwnPassword() reads
// the acting admin's own id from getAdminUser() itself rather than trusting
// an id argument from the client, so it can never be used to change a
// different admin's password under a misleading name.
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

export interface CreateUserResult extends ActionResult {
  id?: number
}

export async function createUser(email: string, password: string): Promise<CreateUserResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    const doc = await payload.create({ collection: 'users', data: { email, password }, overrideAccess: true })
    revalidatePath('/admin/users')
    return { success: true, id: doc.id }
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Не удалось создать пользователя') }
  }
}

export async function deleteUser(id: number): Promise<ActionResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    await payload.delete({ collection: 'users', id, overrideAccess: true })
    revalidatePath('/admin/users')
    return { success: true }
  } catch {
    return { success: false, error: 'Не удалось удалить пользователя' }
  }
}

export async function changeOwnPassword(password: string): Promise<ActionResult> {
  try {
    const user = await requireAdmin()
    const payload = await getPayload({ config })
    await payload.update({ collection: 'users', id: user.id, data: { password }, overrideAccess: true })
    return { success: true }
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Не удалось сменить пароль') }
  }
}
