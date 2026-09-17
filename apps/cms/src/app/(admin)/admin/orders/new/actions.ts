'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { getAdminUser } from '../../../../../lib/admin/auth'
import { checkoutErrorInfoFromUnknown, translateCheckoutError } from '../../../../../lib/checkoutErrors'
import {
  createManualOrder,
  ManualOrderError,
  type ManualOrderInput,
} from '../../../../../lib/admin/manualOrder'

export interface CreateManualOrderResult {
  success: boolean
  orderId?: number
  error?: string
}

export async function createManualOrderAction(input: ManualOrderInput): Promise<CreateManualOrderResult> {
  const user = await getAdminUser()
  if (!user) return { success: false, error: 'Сессия истекла. Войдите в админку снова.' }

  try {
    const payload = await getPayload({ config })
    const orderId = await createManualOrder(payload, input)
    revalidatePath('/admin/orders')
    return { success: true, orderId }
  } catch (error) {
    if (error instanceof ManualOrderError) {
      return { success: false, error: error.message }
    }

    const info = checkoutErrorInfoFromUnknown(error)
    if (info.code !== 'UNKNOWN') {
      return { success: false, error: translateCheckoutError(info).message }
    }

    return { success: false, error: 'Не удалось создать заказ. Проверьте данные и попробуйте снова.' }
  }
}
