import { createHash } from 'node:crypto'
import { formatAdminEmail, formatAdminMessage, formatClientOrderEmail } from './format'
import { sendSmtpMail } from './smtp'
import type { NotificationDelivery, NotificationPayload } from './types'

const REQUEST_TIMEOUT_MS = 15_000

function clip(text: string, max = 4000): string {
  return text.length <= max ? text : `${text.slice(0, max - 20)}\n…сообщение сокращено`
}

function stableRandomId(value: string): string {
  const digest = createHash('sha256').update(value).digest()
  const id = digest.readUInt32BE(0) & 0x7fffffff
  return String(id || 1)
}

async function responseError(response: Response, channel: string): Promise<never> {
  const text = await response.text().catch(() => '')
  throw new Error(`${channel}: HTTP ${response.status}${text ? `: ${text.slice(0, 500)}` : ''}`)
}

async function sendTelegram(recipient: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('Telegram is not configured')
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: recipient, text: clip(text), disable_web_page_preview: true }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) await responseError(response, 'Telegram')
  const body = (await response.json()) as { ok?: boolean; description?: string }
  if (!body.ok) throw new Error(`Telegram: ${body.description || 'API rejected message'}`)
}

async function sendMax(recipient: string, text: string): Promise<void> {
  const token = process.env.MAX_BOT_TOKEN
  if (!token) throw new Error('MAX is not configured')
  const url = new URL('https://platform-api2.max.ru/messages')
  url.searchParams.set('user_id', recipient)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: clip(text), notify: true }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) await responseError(response, 'MAX')
}

async function sendVk(jobId: string, deliveryId: string, recipient: string, text: string): Promise<void> {
  const token = process.env.VK_ACCESS_TOKEN
  if (!token) throw new Error('VK is not configured')
  const body = new URLSearchParams({
    access_token: token,
    v: process.env.VK_API_VERSION || '5.199',
    peer_id: recipient,
    random_id: stableRandomId(`${jobId}:${deliveryId}`),
    message: clip(text),
  })
  const response = await fetch('https://api.vk.com/method/messages.send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) await responseError(response, 'VK')
  const result = (await response.json()) as { response?: unknown; error?: { error_code?: number; error_msg?: string } }
  if (result.error) {
    throw new Error(`VK API ${result.error.error_code ?? 'error'}: ${result.error.error_msg || 'message rejected'}`)
  }
  if (result.response === undefined) throw new Error('VK: API response is missing')
}

export async function sendNotificationDelivery(
  jobId: string,
  payload: NotificationPayload,
  delivery: NotificationDelivery,
): Promise<void> {
  const adminMessage = formatAdminMessage(payload)

  switch (delivery.kind) {
    case 'telegram':
      await sendTelegram(delivery.recipient, adminMessage)
      return
    case 'max':
      await sendMax(delivery.recipient, adminMessage)
      return
    case 'vk':
      await sendVk(jobId, delivery.id, delivery.recipient, adminMessage)
      return
    case 'email-admin': {
      const email = formatAdminEmail(payload)
      await sendSmtpMail({ to: delivery.recipient, subject: email.subject, html: email.html })
      return
    }
    case 'email-client': {
      if (payload.event !== 'order.created') throw new Error('Client email is only valid for order notifications')
      const email = formatClientOrderEmail(payload)
      await sendSmtpMail({ to: delivery.recipient, subject: email.subject, html: email.html })
      return
    }
  }
}
