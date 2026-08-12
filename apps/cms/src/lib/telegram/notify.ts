// Ported from the old app's server-side Telegram notification logic
// (server/routes/notifications.js). Sends to up to 3 configured chat ids —
// this business notifies multiple people/channels per order. Runs directly
// in the Payload hook now (no separate Express server needed, unlike the
// old app where this lived behind its own API route).

interface TelegramSendResult {
  chatId: string
  success: boolean
  error?: string
}

function getChatIds(): string[] {
  return [
    process.env.TELEGRAM_CHAT_ID,
    process.env.TELEGRAM_CHAT_ID_2,
    process.env.TELEGRAM_CHAT_ID_3,
  ].filter((id): id is string => Boolean(id))
}

async function sendToChat(botToken: string, chatId: string, text: string): Promise<TelegramSendResult> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { chatId, success: false, error: `HTTP ${res.status}: ${body}` }
    }
    return { chatId, success: true }
  } catch (error) {
    return { chatId, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export interface OrderNotificationItem {
  title: string
  quantity: number
  listingType: 'rental' | 'sale'
  startDate?: string | null
  endDate?: string | null
  lineTotal: number
}

export async function sendOrderNotification(params: {
  orderId: number
  customerName: string
  customerEmail: string
  customerPhone: string
  items: OrderNotificationItem[]
  totalPrice: number
}): Promise<{ success: boolean; results: TelegramSendResult[] }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatIds = getChatIds()
  if (!botToken || chatIds.length === 0) {
    return { success: false, results: [] }
  }

  const itemLines = params.items
    .map((item) => {
      const period =
        item.listingType === 'rental' && item.startDate && item.endDate
          ? ` (${new Date(item.startDate).toLocaleDateString('ru-RU')} – ${new Date(item.endDate).toLocaleDateString('ru-RU')})`
          : ''
      return `• ${item.title} ×${item.quantity}${period} — ${item.lineTotal.toLocaleString('ru-RU')} ₽`
    })
    .join('\n')

  const text =
    `<b>Новый заказ #${params.orderId}</b>\n\n` +
    `Имя: ${params.customerName}\n` +
    `Email: ${params.customerEmail}\n` +
    `Телефон: ${params.customerPhone}\n\n` +
    `${itemLines}\n\n` +
    `<b>Итого: ${params.totalPrice.toLocaleString('ru-RU')} ₽</b>`

  const results = await Promise.all(chatIds.map((chatId) => sendToChat(botToken, chatId, text)))
  const success = results.some((r) => r.success)
  return { success, results }
}
