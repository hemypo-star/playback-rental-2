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

  // One transaction for the order and its items, same as checkout: a failing
  // line rolls everything back. The old hand-written cleanup swallowed its own
  // errors and could leave a half-created order behind.
  const transactionID = await payload.db.beginTransaction()
  const txReq = transactionID ? { transactionID } : undefined
  try {
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
      ...(txReq ? { req: txReq } : {}),
    })

    for (const item of input.items) {
      await payload.create({
        collection: 'orderItems',
        data: {
          order: order.id,
          product: item.productId,
          quantity: item.quantity,
          startDate: item.startDate || undefined,
          endDate: item.endDate || undefined,
        },
        overrideAccess: true,
        // An operator may legitimately record or correct a rental whose
        // pickup date has already passed — bookkeeping after the fact, not a
        // booking of the past — so OrderItems' beforeValidate past-date guard
        // is waived here. Only the anonymous checkout path is subject to it.
        context: { allowPastRentalDates: true },
        ...(txReq ? { req: txReq } : {}),
      })
    }

    if (transactionID) await payload.db.commitTransaction(transactionID)
    return order.id
  } catch (error) {
    if (transactionID) {
      await payload.db.rollbackTransaction(transactionID).catch((rollbackError: unknown) => {
        payload.logger.error({ err: rollbackError }, 'createManualOrder: rollback failed')
      })
    }
    throw error
  }
}
