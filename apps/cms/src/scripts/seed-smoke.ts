import { getPayload } from 'payload'
import config from '@payload-config'

function requiredEnv(name: 'SMOKE_ADMIN_EMAIL' | 'SMOKE_ADMIN_PASSWORD'): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

const adminEmail = requiredEnv('SMOKE_ADMIN_EMAIL')
const adminPassword = requiredEnv('SMOKE_ADMIN_PASSWORD')

async function main() {
  const payload = await getPayload({ config })

  const parentResult = await payload.find({
    collection: 'categories',
    where: { slug: { equals: 'smoke-cameras' } },
    limit: 1,
    overrideAccess: true,
  })
  const parent =
    parentResult.docs[0] ||
    (await payload.create({
      collection: 'categories',
      overrideAccess: true,
      data: {
        name: 'Smoke Cameras',
        slug: 'smoke-cameras',
        description: 'Disposable CI smoke-test category',
        tag: 'SMOKE',
        order: 9000,
      },
    }))

  const childResult = await payload.find({
    collection: 'categories',
    where: { slug: { equals: 'smoke-lenses' } },
    limit: 1,
    overrideAccess: true,
  })
  const child =
    childResult.docs[0] ||
    (await payload.create({
      collection: 'categories',
      overrideAccess: true,
      data: {
        name: 'Smoke Lenses',
        slug: 'smoke-lenses',
        description: 'Disposable nested CI smoke-test category',
        tag: 'SMOKE-LENS',
        order: 9001,
        parent: parent.id,
      },
    }))

  const products = [
    {
      moySkladId: 'smoke-ci-camera-001',
      title: 'Smoke Camera Alpha',
      description: 'SmokeDescriptionNeedle full-frame camera for browser QA',
      subtitle: 'CI fixture · rental',
      tag: 'SmokeTagNeedle',
      price: 1500,
      quantity: 3,
      category: parent.id,
    },
    {
      moySkladId: 'smoke-ci-lens-001',
      title: 'Smoke Lens Beta',
      description: 'Disposable nested-category product',
      subtitle: 'CI fixture · nested category',
      tag: 'SMOKE-LENS',
      price: 700,
      quantity: 2,
      category: child.id,
    },
  ]

  for (const data of products) {
    const existing = await payload.find({
      collection: 'products',
      where: { moySkladId: { equals: data.moySkladId } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs[0]) continue
    await payload.create({
      collection: 'products',
      overrideAccess: true,
      data: {
        ...data,
        listingType: 'rental',
        available: true,
        isKit: false,
      },
    })
  }

  const promoFixtures = [
    {
      code: 'SMOKE10',
      discountType: 'percent' as const,
      discountValue: 10,
      minOrderAmount: 1000,
      active: true,
      description: 'Disposable CI percentage promo fixture',
    },
    {
      code: 'SMOKEFIXED',
      discountType: 'fixed' as const,
      discountValue: 500,
      minOrderAmount: 1500,
      active: true,
      description: 'Disposable CI fixed promo fixture',
    },
    {
      code: 'SMOKEINACTIVE',
      discountType: 'fixed' as const,
      discountValue: 500,
      minOrderAmount: 1500,
      active: false,
      description: 'Disposable inactive CI promo fixture',
    },
    {
      code: 'SMOKEEXPIRED',
      discountType: 'percent' as const,
      discountValue: 25,
      minOrderAmount: 0,
      active: true,
      validUntil: '2020-01-01T00:00:00.000Z',
      description: 'Disposable expired CI promo fixture',
    },
  ]

  for (const data of promoFixtures) {
    const existing = await payload.find({
      collection: 'promoCodes',
      where: { code: { equals: data.code } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs[0]) {
      await payload.update({ collection: 'promoCodes', id: existing.docs[0].id, data, overrideAccess: true })
    } else {
      await payload.create({ collection: 'promoCodes', data, overrideAccess: true })
    }
  }

  const userResult = await payload.find({
    collection: 'users',
    where: { email: { equals: adminEmail } },
    limit: 1,
    overrideAccess: true,
  })
  if (userResult.docs[0]) {
    await payload.update({
      collection: 'users',
      id: userResult.docs[0].id,
      overrideAccess: true,
      data: { password: adminPassword },
    })
  } else {
    await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: { email: adminEmail, password: adminPassword },
    })
  }

  console.log(
    JSON.stringify(
      {
        parentCategory: parent.slug,
        childCategory: child.slug,
        products: products.map((product) => product.title),
        promoCodes: promoFixtures.map((promo) => promo.code),
        adminEmail,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

main().catch((error) => {
  console.error('Smoke fixture seed failed', error)
  process.exit(1)
})
