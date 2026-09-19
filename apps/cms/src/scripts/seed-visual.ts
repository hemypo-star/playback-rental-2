import { getPayload } from 'payload'
import config from '@payload-config'

function requiredEnv(name: 'SMOKE_ADMIN_EMAIL' | 'SMOKE_ADMIN_PASSWORD'): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

const adminEmail = requiredEnv('SMOKE_ADMIN_EMAIL')
const adminPassword = requiredEnv('SMOKE_ADMIN_PASSWORD')

const categories = [
  { slug: 'film', name: 'Плёночные и мгновенные', tag: '35мм', order: 1 },
  { slug: 'glasses', name: 'Умные очки с камерой', tag: 'AI', order: 2 },
  { slug: 'sony', name: 'Камеры Sony', tag: 'SONY', order: 3 },
  { slug: 'canon', name: 'Камеры Canon R', tag: 'RF', order: 4 },
  { slug: 'action', name: 'Action-камеры и аксессуары', tag: 'GP', order: 5 },
  { slug: 'compact', name: 'Мобильные фотоаппараты Canon', tag: 'PS', order: 6 },
]

type VisualProduct = {
  id:string
  category:string
  title:string
  subtitle:string
  price:number
  tag:string
  quantity:number
  isKit?:boolean
  oldPrice?:number
  kitItems?:{label:string}[]
}

const products: VisualProduct[] = [
  { id:'funsaver', category:'film', title:'Kodak FunSaver 27', subtitle:'35 мм · ISO 800 · вспышка', price:1490, tag:'Плёнка', quantity:3 },
  { id:'quicksnap', category:'film', title:'Fujifilm QuickSnap Flash 400', subtitle:'35 мм · ISO 400 · 27 кадров', price:1590, tag:'Плёнка', quantity:3 },
  { id:'meta', category:'glasses', title:'Ray-Ban Meta Wayfarer', subtitle:'Умные очки · 12 Мп · 1080p', price:1900, tag:'Очки', quantity:2 },
  { id:'a7siii', category:'sony', title:'Sony A7S III', subtitle:'Полный кадр · 4K 120p', price:3500, tag:'Камера', quantity:3 },
  { id:'zve1', category:'sony', title:'Sony ZV-E1', subtitle:'Полный кадр · для влогов', price:2900, tag:'Камера', quantity:2 },
  { id:'cx190', category:'sony', title:'Sony HDR-CX190E', subtitle:'Видеокамера · 25× зум', price:900, tag:'Видеокамера', quantity:2 },
  { id:'r6', category:'canon', title:'Canon EOS R6', subtitle:'Полный кадр · 20 Мп', price:2700, tag:'Камера', quantity:1 },
  { id:'r50', category:'canon', title:'Canon EOS R50', subtitle:'APS-C · 24 Мп · комплект', price:1700, tag:'Камера', quantity:2 },
  { id:'hero13', category:'action', title:'GoPro HERO13 Black', subtitle:'Экшн · 5.3K 60p', price:1200, tag:'Экшн', quantity:3 },
  { id:'maxlens', category:'action', title:'GoPro Max Lens Mod 2.0', subtitle:'Насадка 177° для HERO', price:400, tag:'Аксессуар', quantity:2 },
  { id:'v10', category:'compact', title:'Canon PowerShot V10', subtitle:'Компакт для влогов', price:1100, tag:'Компакт', quantity:2 },
  { id:'inspic', category:'compact', title:'Canon iNSPiC REC', subtitle:'Мини-камера-карабин', price:700, tag:'Компакт', quantity:2 },
  { id:'wedding', category:'film', title:'Свадебный набор', subtitle:'Набор · 6 позиций', price:8900, tag:'Набор', quantity:2, isKit:true, oldPrice:9350, kitItems:[{label:'5× Kodak FunSaver 27'},{label:'Ray-Ban Meta Wayfarer'},{label:'Зарядный кейс'}] },
  { id:'vlog', category:'sony', title:'Влог-сет', subtitle:'Набор · 3 позиции', price:3900, tag:'Набор', quantity:2, isKit:true, oldPrice:4300, kitItems:[{label:'Sony ZV-E1 с объективом'},{label:'Радиосистема-петличка'},{label:'Настольный штатив'}] },
  { id:'travel', category:'action', title:'Тревел-сет', subtitle:'Набор · 4 позиции', price:2400, tag:'Набор', quantity:2, isKit:true, oldPrice:2700, kitItems:[{label:'GoPro HERO13 Black'},{label:'Canon PowerShot V10'},{label:'Набор креплений'}] },
]

async function upsertCategory(payload: Awaited<ReturnType<typeof getPayload>>, data: (typeof categories)[number]) {
  const found = await payload.find({ collection:'categories', where:{ slug:{ equals:data.slug } }, limit:1, overrideAccess:true })
  if (found.docs[0]) {
    return payload.update({ collection:'categories', id:found.docs[0].id, data, overrideAccess:true })
  }
  return payload.create({ collection:'categories', data, overrideAccess:true })
}

async function main() {
  const payload = await getPayload({ config })

  const categoryIds = new Map<string, number>()
  const productIds = new Map<string, number>()
  for (const data of categories) {
    const category = await upsertCategory(payload, data)
    categoryIds.set(data.slug, category.id)
  }

  for (let index = 0; index < products.length; index++) {
    const data = products[index]
    const category = categoryIds.get(data.category)
    if (!category) throw new Error(`Category missing for ${data.title}`)
    const moySkladId = `visual-${data.id}`
    const record = {
      title:data.title,
      subtitle:data.subtitle,
      tag:data.tag,
      price:data.price,
      quantity:data.quantity,
      category,
      listingType:'rental' as const,
      available:true,
      isKit:Boolean(data.isKit),
      oldPrice:data.oldPrice,
      kitItems:data.kitItems,
      moySkladId,
      lastSyncedAt:new Date(Date.UTC(2026,7,20-index,12,0,0)).toISOString(),
    }
    const found = await payload.find({ collection:'products', where:{ moySkladId:{ equals:moySkladId } }, limit:1, overrideAccess:true })
    const saved = found.docs[0]
      ? await payload.update({ collection:'products', id:found.docs[0].id, data:record, overrideAccess:true })
      : await payload.create({ collection:'products', data:record, overrideAccess:true })
    productIds.set(data.id, saved.id)
  }

  const visualOrders = [
    { email:'visual-admin-1@example.invalid', name:'Марк Демидов', phone:'+7 918 000-00-01', product:'a7siii', quantity:1, status:'pending' as const, start:'2027-08-13T11:00:00.000Z', end:'2027-08-15T18:00:00.000Z', total:12300 },
    { email:'visual-admin-2@example.invalid', name:'Алина Крылова', phone:'+7 918 000-00-02', product:'wedding', quantity:1, status:'confirmed' as const, start:'2027-08-15T11:00:00.000Z', end:'2027-08-17T18:00:00.000Z', total:17800 },
    { email:'visual-admin-3@example.invalid', name:'Дарья Волкова', phone:'+7 918 000-00-03', product:'zve1', quantity:1, status:'confirmed' as const, start:'2027-08-12T11:00:00.000Z', end:'2027-08-13T18:00:00.000Z', total:3900 },
    { email:'visual-admin-4@example.invalid', name:'Тимур Раев', phone:'+7 918 000-00-04', product:'hero13', quantity:2, status:'pending' as const, start:'2027-08-11T11:00:00.000Z', end:'2027-08-14T18:00:00.000Z', total:7200 },
    { email:'visual-admin-5@example.invalid', name:'Игорь Панов', phone:'+7 918 000-00-05', product:'r6', quantity:1, status:'completed' as const, start:'2027-08-10T11:00:00.000Z', end:'2027-08-12T18:00:00.000Z', total:9400 },
  ]

  for (const fixture of visualOrders) {
    let order = (await payload.find({ collection:'orders', where:{ customerEmail:{ equals:fixture.email } }, limit:1, overrideAccess:true })).docs[0]
    if (!order) {
      order = await payload.create({
        collection:'orders',
        data:{ customerName:fixture.name, customerEmail:fixture.email, customerPhone:fixture.phone, status:fixture.status },
        overrideAccess:true,
      })
    }
    const existingItems = await payload.find({ collection:'orderItems', where:{ order:{ equals:order.id } }, limit:1, overrideAccess:true })
    if (existingItems.totalDocs === 0) {
      const productId = productIds.get(fixture.product)
      if (!productId) throw new Error(`Visual product missing for order: ${fixture.product}`)
      await payload.create({
        collection:'orderItems',
        data:{ order:order.id, product:productId, quantity:fixture.quantity, startDate:fixture.start, endDate:fixture.end },
        overrideAccess:true,
      })
    }
    await payload.update({ collection:'orders', id:order.id, data:{ status:fixture.status, totalPrice:fixture.total }, overrideAccess:true })
  }

  await payload.updateGlobal({
    slug:'site-settings',
    overrideAccess:true,
    data:{
      heroKicker:'Прокат съёмочной техники',
      heroCity:'Краснодар',
      heroHeadline:'Камеры в аренду без залога',
      heroSubtext:'Плёнка, полный кадр, экшн и умные очки. Выдаём за 10 минут по паспорту — договор, инструктаж и заряженные аккумуляторы уже внутри.',
      depositLabel:'0 ₽',
      depositCaption:'Залог',
      pickupTimeLabel:'10 мин',
      pickupTimeCaption:'Выдача по паспорту',
      contactPhone:'+7 918 000-00-00',
      contactTelegram:'@playbackrental',
      contactAddress:'Красная, 176',
      contactHours:'10:00 — 21:00',
      businessHoursOpen:10,
      businessHoursClose:21,
    },
  })

  const userResult = await payload.find({ collection:'users', where:{ email:{ equals:adminEmail } }, limit:1, overrideAccess:true })
  if (userResult.docs[0]) {
    await payload.update({ collection:'users', id:userResult.docs[0].id, data:{ password:adminPassword }, overrideAccess:true })
  } else {
    await payload.create({ collection:'users', data:{ email:adminEmail, password:adminPassword }, overrideAccess:true })
  }

  console.log(JSON.stringify({ categories:categories.length, products:products.length, orders:visualOrders.length, adminEmail }, null, 2))
  process.exit(0)
}

main().catch((error) => {
  console.error('Visual fixture seed failed', error)
  process.exit(1)
})
