import type { ContactNotificationPayload, NotificationPayload, OrderNotificationPayload } from './types'

const BUSINESS_TIME_ZONE = 'Asia/Novokuznetsk'

function money(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`
}

function businessDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: BUSINESS_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function orderItemsText(order: OrderNotificationPayload): string {
  return order.items
    .map((item, index) => {
      const dates =
        item.listingType === 'rental' && item.startDate && item.endDate
          ? `\n   Аренда: ${businessDate(item.startDate)} — ${businessDate(item.endDate)}`
          : ''
      return `${index + 1}. ${item.title}\n   Кол-во: ${item.quantity}\n   Сумма: ${money(item.totalPrice)}${dates}`
    })
    .join('\n\n')
}

export function formatAdminMessage(payload: NotificationPayload): string {
  if (payload.event === 'contact.created') {
    return [
      '✉️ Новое сообщение Playback Rental',
      '',
      `Дата: ${businessDate(payload.createdAt)}`,
      `Имя: ${payload.name}`,
      `Телефон: ${payload.phone}`,
      `Email: ${payload.email}`,
      payload.subject ? `Тема: ${payload.subject}` : null,
      '',
      payload.message,
    ]
      .filter((line): line is string => line !== null)
      .join('\n')
  }

  const promo = payload.promoDiscount > 0
    ? `\nПромокод: ${payload.promoCode || '—'}\nСкидка: ${money(payload.promoDiscount)}`
    : ''

  return [
    '🆕 Новая заявка Playback Rental',
    '',
    `Номер заявки: #${payload.orderId}`,
    `Дата: ${businessDate(payload.createdAt)}`,
    '',
    '👤 Клиент:',
    `Имя: ${payload.name}`,
    `Телефон: ${payload.phone}`,
    `Email: ${payload.email}`,
    '',
    '📦 Заказ:',
    orderItemsText(payload),
    promo,
    `Итого: ${money(payload.totalAmount)}`,
  ].join('\n')
}

export interface FormattedEmail {
  subject: string
  html: string
}

function adminOrderEmail(order: OrderNotificationPayload): FormattedEmail {
  const items = order.items
    .map((item) => {
      const dates =
        item.listingType === 'rental' && item.startDate && item.endDate
          ? `<br><small>Аренда: ${escapeHtml(businessDate(item.startDate))} — ${escapeHtml(businessDate(item.endDate))}</small>`
          : ''
      return `<li><b>${escapeHtml(item.title)}</b> — ${item.quantity} шт., ${escapeHtml(money(item.totalPrice))}${dates}</li>`
    })
    .join('')

  const promo = order.promoDiscount > 0
    ? `<p><b>Промокод:</b> ${escapeHtml(order.promoCode || '—')}<br><b>Скидка:</b> ${escapeHtml(money(order.promoDiscount))}</p>`
    : ''

  return {
    subject: `Новая заявка Playback Rental #${order.orderId}`,
    html: `<h2>Новая заявка Playback Rental</h2>
<p><b>Номер:</b> #${order.orderId}<br><b>Дата:</b> ${escapeHtml(businessDate(order.createdAt))}</p>
<h3>Клиент</h3><p><b>Имя:</b> ${escapeHtml(order.name)}<br><b>Телефон:</b> ${escapeHtml(order.phone)}<br><b>Email:</b> ${escapeHtml(order.email)}</p>
<h3>Заказ</h3><ol>${items}</ol>${promo}<p><b>Итого:</b> ${escapeHtml(money(order.totalAmount))}</p>`,
  }
}

function adminContactEmail(contact: ContactNotificationPayload): FormattedEmail {
  return {
    subject: contact.subject ? `Playback Rental: ${contact.subject}` : 'Новое сообщение Playback Rental',
    html: `<h2>Новое сообщение с сайта Playback Rental</h2>
<p><b>Дата:</b> ${escapeHtml(businessDate(contact.createdAt))}<br><b>Имя:</b> ${escapeHtml(contact.name)}<br><b>Телефон:</b> ${escapeHtml(contact.phone)}<br><b>Email:</b> ${escapeHtml(contact.email)}</p>
${contact.subject ? `<p><b>Тема:</b> ${escapeHtml(contact.subject)}</p>` : ''}
<p>${escapeHtml(contact.message).replaceAll('\n', '<br>')}</p>`,
  }
}

export function formatAdminEmail(payload: NotificationPayload): FormattedEmail {
  return payload.event === 'order.created' ? adminOrderEmail(payload) : adminContactEmail(payload)
}

export function formatClientOrderEmail(order: OrderNotificationPayload): FormattedEmail {
  const items = order.items
    .map((item) => {
      const dates =
        item.listingType === 'rental' && item.startDate && item.endDate
          ? `<br><small>Аренда: ${escapeHtml(businessDate(item.startDate))} — ${escapeHtml(businessDate(item.endDate))}</small>`
          : ''
      return `<li><b>${escapeHtml(item.title)}</b> — ${item.quantity} шт., ${escapeHtml(money(item.totalPrice))}${dates}</li>`
    })
    .join('')

  return {
    subject: `Ваш заказ Playback Rental #${order.orderId} создан`,
    html: `<h2>Ваш заказ Playback Rental создан</h2>
<p><b>Номер:</b> #${order.orderId}<br><b>Дата:</b> ${escapeHtml(businessDate(order.createdAt))}</p>
<h3>Заказ</h3><ol>${items}</ol>
${order.promoDiscount > 0 ? `<p><b>Скидка:</b> ${escapeHtml(money(order.promoDiscount))}</p>` : ''}
<p><b>Итого:</b> ${escapeHtml(money(order.totalAmount))}</p>
<p>Менеджер свяжется с вами в ближайшее время.</p>`,
  }
}
