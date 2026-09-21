import sharp from 'sharp'
import { getPayload } from 'payload'
import config from '@payload-config'

// Extra fixtures for the local visual preview stack (compose.preview.yaml),
// layered on top of `visual:seed`.
//
// Deliberately NOT part of seed-visual.ts: that script's order fixtures are
// pinned to fixed dates so the committed visual-regression baselines stay
// reproducible, and its catalog is what CI screenshots. Everything here is
// relative to "now" instead, because the things worth looking at by hand —
// busy days in the rental calendar, the date-aware "Только свободные" filter,
// per-card availability — only show up when bookings overlap dates a visitor
// would plausibly pick today.
//
// Idempotent: re-running it reuses what it already created.
const DAY = 86_400_000

function at(offsetDays: number, hour: number): string {
  const d = new Date(Date.now() + offsetDays * DAY)
  d.setUTCHours(hour, 0, 0, 0)
  return d.toISOString()
}

// A flat two-tone gradient, generated rather than committed as a binary.
// Promotions.image is a required upload, so the promo carousel cannot be
// seeded without one; product cards deliberately keep their designed
// placeholder instead of a stand-in photo.
async function gradientPng(from: string, to: string): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient></defs>
    <rect width="1600" height="1000" fill="url(#g)"/>
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

const promos = [
  { title: 'Плёнка на выходные', kicker: 'Акция', text: 'Два одноразовых фотоаппарата по цене одного с пятницы по понедельник.', from: '#E6E4E0', to: '#CFC9C0' },
  { title: 'Неделя проката дешевле', kicker: 'Скидка', text: 'От пяти суток аренды — минус 20% на любую камеру из каталога.', from: '#D8D5D0', to: '#B9B3A9' },
]

// product moySkladId -> booking. Sizes are chosen against the quantities in
// seed-visual.ts so the two states a visitor should be able to tell apart are
// both on screen: Canon EOS R6 has one unit and is taken outright, Sony A7S III
// has three and keeps one free.
const bookings = [
  { email: 'preview-booking-1@example.invalid', name: 'Ольга Немцова', phone: '+7 918 000-01-01', product: 'visual-r6', quantity: 1, status: 'confirmed' as const, start: at(1, 10), end: at(5, 18) },
  { email: 'preview-booking-2@example.invalid', name: 'Павел Юдин', phone: '+7 918 000-01-02', product: 'visual-a7siii', quantity: 2, status: 'pending' as const, start: at(2, 10), end: at(4, 18) },
]

async function main() {
  const payload = await getPayload({ config })

  for (const promo of promos) {
    const existing = await payload.find({ collection: 'promotions', where: { title: { equals: promo.title } }, limit: 1, overrideAccess: true })
    if (existing.docs[0]) continue
    const data = await gradientPng(promo.from, promo.to)
    const media = await payload.create({
      collection: 'media',
      data: { alt: promo.title },
      file: { data, mimetype: 'image/png', name: `preview-${promo.title.replace(/\s+/g, '-').toLowerCase()}.png`, size: data.length },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'promotions',
      data: { title: promo.title, kicker: promo.kicker, text: promo.text, image: media.id, active: true },
      overrideAccess: true,
    })
  }

  for (const booking of bookings) {
    const found = await payload.find({ collection: 'orders', where: { customerEmail: { equals: booking.email } }, limit: 1, overrideAccess: true })
    if (found.docs[0]) continue
    const product = await payload.find({ collection: 'products', where: { moySkladId: { equals: booking.product } }, limit: 1, overrideAccess: true })
    if (!product.docs[0]) throw new Error(`Run visual:seed first — product ${booking.product} is missing`)
    const order = await payload.create({
      collection: 'orders',
      data: { customerName: booking.name, customerEmail: booking.email, customerPhone: booking.phone, status: booking.status },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'orderItems',
      data: { order: order.id, product: product.docs[0].id, quantity: booking.quantity, startDate: booking.start, endDate: booking.end },
      overrideAccess: true,
    })
  }

  // Gives SiteSettings.howItWorksSteps real rows, so the homepage block reads
  // as editable content rather than its built-in fallback — docs/PREVIEW.md
  // points at /admin/settings to change them and watch the page follow.
  await payload.updateGlobal({
    slug: 'site-settings',
    overrideAccess: true,
    data: {
      howItWorksSteps: [
        { title: 'Выбираете даты', text: 'Каталог сразу показывает, что свободно на выбранные даты.' },
        { title: 'Оставляете заявку', text: 'Имя и телефон — без регистрации. Перезвоним и подтвердим бронь.' },
        { title: 'Забираете технику', text: 'Приезжаете по адресу, получаете оборудование, короткий инструктаж.' },
        { title: 'Возвращаете', text: 'В оговорённый срок, по тому же адресу.' },
      ],
      contactVkUrl: 'https://vk.com/playbackrental',
      contactTelegramUrl: 'https://t.me/Playbackrental_admin',
      yandexMapsUrl: 'https://yandex.ru/maps/-/CHvDmII7',
      twoGisUrl: 'https://go.2gis.com/2y9MJ',
    },
  })

  const counts = {
    promotions: (await payload.count({ collection: 'promotions', overrideAccess: true })).totalDocs,
    orders: (await payload.count({ collection: 'orders', overrideAccess: true })).totalDocs,
    bookedWindow: `${bookings[0].start.slice(0, 10)} … ${bookings[0].end.slice(0, 10)}`,
  }
  console.log(JSON.stringify(counts, null, 2))
  process.exit(0)
}

main().catch((error) => {
  console.error('Preview fixture seed failed', error)
  process.exit(1)
})
