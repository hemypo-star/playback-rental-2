import type { Endpoint } from 'payload'
import { sendContactNotification } from '../lib/notifications/webhook'

// Public endpoint for the storefront's /contact form — no collection backs
// this (nothing to store or moderate), it's a direct pass-through to the
// same notification webhook order confirmations go to.
export const contactNotificationEndpoint: Endpoint = {
  path: '/contact-notification',
  method: 'post',
  handler: async (req) => {
    const body = (await req.json?.()) as
      | { name?: string; email?: string; phone?: string; subject?: string; message?: string }
      | undefined

    if (!body?.name || !body?.email || !body?.phone || !body?.message) {
      return Response.json({ error: 'name, email, phone and message are required' }, { status: 400 })
    }

    const result = await sendContactNotification({
      name: body.name,
      email: body.email,
      phone: body.phone,
      subject: body.subject,
      message: body.message,
    })

    return Response.json({ success: result.success })
  },
}
