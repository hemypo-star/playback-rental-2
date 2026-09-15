'use server'

// Server Actions for order operations (docs/PLAN-next-migration.md Stage
// 3.4) — replace apps/web/src/pages/admin/orders/[id].astro's inline
// <script> fetch() calls straight against Payload's own REST endpoints
// (PATCH /api/orders/:id, PATCH/DELETE /api/orderItems/:id, POST /api/
// orders/:id/submit). Those worked directly from the browser because a
// same-origin fetch carries the session cookie natively; here it's the
// Local API instead, same-process.
//
// Security note beyond what the plan spells out: unlike a page render,
// Server Actions are NOT gated by (admin)/admin/layout.tsx just because
// the page that references them lives under it — Next compiles each into
// its own independently-invokable endpoint, reachable directly by anyone
// who has the action's reference, guard or no guard (this is documented
// Next.js behavior, not a gap specific to this app). So every action here
// re-checks getAdminUser() itself first, exactly replicating what the old
// custom endpoints' own explicit `req.user` check protected against structural
// bypass. Only after that passes does it use overrideAccess: true — Local API
// calls have no real req.user of their own to satisfy Orders'/OrderItems' own
// access control (`Boolean(req.user)`) unless one is built and attached by hand,
// so skipping the auth check here wouldn't fail safe, it would fail broken.
import { getPayload } from 'payload'
import { APIError } from 'payload'
import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { getAdminUser } from '../../../../../lib/admin/auth'
import { submitOrder, SubmitOrderError } from '../../../../../lib/rental/submitOrder'

export interface ActionResult {
  success: boolean
  error?: string
  // Set by mutations that touch orderItems — orders.totalPrice is kept in
  // sync by an afterChange/afterDelete hook on OrderItems (see CLAUDE.md),
  // so callers read the fresh total back here instead of recomputing it
  // client-side from lineTotals.
  orderTotalPrice?: number
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof APIError ? error.message : fallback
}

async function requireAdmin() {
  const user = await getAdminUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function updateOrderStatus(orderId: number, status: 'pending' | 'confirmed' | 'cancelled' | 'completed'): Promise<ActionResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    await payload.update({ collection: 'orders', id: orderId, data: { status }, overrideAccess: true })
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/admin/orders')
    return { success: true }
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Не удалось сохранить изменения') }
  }
}

export async function updateOrderNotes(orderId: number, notes: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    await payload.update({ collection: 'orders', id: orderId, data: { notes }, overrideAccess: true })
    revalidatePath(`/admin/orders/${orderId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Не удалось сохранить изменения') }
  }
}

export interface UpdateOrderItemInput {
  quantity?: number
  startDate?: string
  endDate?: string
}

export interface UpdateOrderItemResult extends ActionResult {
  lineTotal?: number
}

export async function updateOrderItem(orderId: number, itemId: number, data: UpdateOrderItemInput): Promise<UpdateOrderItemResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    const updated = await payload.update({ collection: 'orderItems', id: itemId, data, overrideAccess: true })
    // OrderItems' afterChange hook has already recomputed orders.totalPrice
    // synchronously by the time payload.update() above resolves.
    const order = await payload.findByID({ collection: 'orders', id: orderId, depth: 0, overrideAccess: true })
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/admin/orders')
    return { success: true, lineTotal: updated.lineTotal ?? 0, orderTotalPrice: order.totalPrice ?? 0 }
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Не удалось сохранить позицию') }
  }
}

export async function deleteOrderItem(orderId: number, itemId: number): Promise<ActionResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    await payload.delete({ collection: 'orderItems', id: itemId, overrideAccess: true })
    // OrderItems' afterDelete hook has already recomputed orders.totalPrice
    // synchronously by the time payload.delete() above resolves.
    const order = await payload.findByID({ collection: 'orders', id: orderId, depth: 0, overrideAccess: true })
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/admin/orders')
    return { success: true, orderTotalPrice: order.totalPrice ?? 0 }
  } catch {
    return { success: false, error: 'Не удалось удалить позицию' }
  }
}

export interface SubmitOrderActionResult extends ActionResult {
  moySkladOrderId?: string | null
}

export async function submitOrderToMoySklad(orderId: number): Promise<SubmitOrderActionResult> {
  try {
    await requireAdmin()
    const payload = await getPayload({ config })
    const result = await submitOrder(payload, orderId)
    revalidatePath(`/admin/orders/${orderId}`)
    return { success: true, moySkladOrderId: result.moySkladOrderId }
  } catch (error) {
    return {
      success: false,
      error: error instanceof SubmitOrderError ? error.message : 'Не удалось отправить заказ',
    }
  }
}
