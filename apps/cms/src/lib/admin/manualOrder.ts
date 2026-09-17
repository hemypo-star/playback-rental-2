import type { Payload } from 'payload'
import { resolveActivePromoCode } from '../promo/promoCodes'

export interface ManualOrderItemInput {
  productId: number
  quantity: number
  startDate?: string
  endDate?: string
}

export interface ManualOrderInput {
  customerName: string
  customerEmail: string
  customerPhone: string
  notes?: string
  promoCode?: string
  items: ManualOrderItemInput[]
}

export class ManualOrderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ManualOrderError'
  }
}

/**
 * Creates an operator-entered order without submitting it externally.
 *
 * Pricing, stock and rental-date validation deliberately remain owned by
 * OrderItems.beforeValidate. This function only orchestrates the same
 * Orders + OrderItems model used by public checkout, so manual orders cannot
 * drift into a second pricing or availability implementation.
 *
 * The result stays pending/unsubmitted. The operator reviews it on the normal
 * order detail page and explicitly uses the existing "Отправить в МойСклад"
 * action when the request is ready to notify/push externally.
 */
export async function createManualOrder(payload: Payload, input: ManualOrderInput): Promise<number> {
  const customerName = input.customerName.trim()
  const customerEmail = input.customerEmail.trim()
  const customerPhone = input.customerPhone.trim()
  const notes = input.notes?.trim()
  const promoCode = input.promoCode?.trim()

  if (!customerName || !customerEmail || !customerPhone) {
    throw new ManualOrderError('Заполните имя, телефон и email клиента.')
  }
  if (input.items.length === 0) {
    throw new ManualOrderError('Добавьте хотя бы одну позицию.')
  }
  for (const item of input.items) {
    if (!Number.isInteger(item.productId) || item.productId <= 0) {
      throw new ManualOrderError('Выберите товар для каждой позиции.')
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new ManualOrderError('Количество должно быть целым числом не меньше 1.')
    }
  }

  const promo = promoCode ? await resolveActivePromoCode(payload, promoCode, undefined) : null
  if (promoCode && !promo) {
    throw new ManualOrderError('Промокод недействителен, выключен или истёк.')
  }

  const order = await payload.create({
    collection: 'orders',
    data: {
      customerName,
      customerEmail,
      customerPhone,
      status: 'pending',
      ...(notes ? { notes } : {}),
      ...(promo
        ? {
            promoCode: promo.code,
            promoDiscountType: promo.discountType,
            promoDiscountValue: promo.discountValue,
            promoMinOrderAmount: promo.minOrderAmount ?? 0,
          }
        : {}),
    },
    overrideAccess: true,
  })

  const createdItemIds: number[] = []
  try {
    for (const item of input.items) {
      const created = await payload.create({
        collection: 'orderItems',
        data: {
          order: order.id,
          product: item.productId,
          quantity: item.quantity,
          startDate: item.startDate || undefined,
          endDate: item.endDate || undefined,
        },
        overrideAccess: true,
      })
      createdItemIds.push(created.id)
    }
  } catch (error) {
    // This is rollback of a creation that never completed, not an operator
    // deleting a commercial order. Ordinary /admin and /cms hard-delete
    // remains forbidden by OrdersWithLifecyclePolicy.
    for (const itemId of createdItemIds.reverse()) {
      await payload.delete({ collection: 'orderItems', id: itemId, overrideAccess: true }).catch(() => {})
    }
    await payload.delete({ collection: 'orders', id: order.id, overrideAccess: true }).catch(() => {})
    throw error
  }

  return order.id
}
