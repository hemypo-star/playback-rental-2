'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { getAdminUser } from '../../../../lib/admin/auth'
import { erasePersonalData } from '../../../../lib/admin/erasePersonalData'

export interface EraseActionResult {
  success: boolean
  orders?: number
  error?: string
}

// Customer withdrew consent: blank their contact data on every order
// (lib/admin/erasePersonalData.ts).
export async function eraseCustomerData(query: string): Promise<EraseActionResult> {
  const user = await getAdminUser()
  if (!user) return { success: false, error: 'Не авторизованы' }
  if (typeof query !== 'string' || !query.trim()) return { success: false, error: 'Укажите email или телефон клиента' }
  try {
    const payload = await getPayload({ config })
    const { orders } = await erasePersonalData(payload, query, user.email)
    revalidatePath('/admin/clients')
    revalidatePath('/admin/orders')
    return { success: true, orders }
  } catch {
    return { success: false, error: 'Не удалось удалить данные' }
  }
}
