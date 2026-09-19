import { getPayload } from 'payload'
import config from '@payload-config'

const VISUAL_CATEGORY_SLUGS = ['film','glasses','sony','canon','action','compact']

async function main() {
  const payload = await getPayload({ config })

  const visualOrders = await payload.find({
    collection:'orders',
    where:{ customerEmail:{ contains:'visual-admin-' } },
    limit:0,
    depth:0,
    overrideAccess:true,
  })
  const orderIds = visualOrders.docs.map((doc) => doc.id)

  if (orderIds.length) {
    const items = await payload.find({
      collection:'orderItems',
      where:{ order:{ in:orderIds } },
      limit:0,
      depth:0,
      overrideAccess:true,
    })
    for (const item of items.docs) {
      await payload.delete({ collection:'orderItems', id:item.id, overrideAccess:true })
    }
    for (const order of visualOrders.docs) {
      await payload.delete({ collection:'orders', id:order.id, overrideAccess:true })
    }
  }

  const visualProducts = await payload.find({
    collection:'products',
    where:{ moySkladId:{ contains:'visual-' } },
    limit:0,
    depth:0,
    overrideAccess:true,
  })
  for (const product of visualProducts.docs) {
    await payload.delete({ collection:'products', id:product.id, overrideAccess:true })
  }

  for (const slug of VISUAL_CATEGORY_SLUGS) {
    const found = await payload.find({
      collection:'categories',
      where:{ slug:{ equals:slug } },
      limit:10,
      depth:0,
      overrideAccess:true,
    })
    for (const category of found.docs) {
      await payload.delete({ collection:'categories', id:category.id, overrideAccess:true })
    }
  }

  console.log(JSON.stringify({
    deletedOrders: visualOrders.totalDocs,
    deletedProducts: visualProducts.totalDocs,
    deletedCategories: VISUAL_CATEGORY_SLUGS.length,
  }, null, 2))
  process.exit(0)
}

main().catch((error) => {
  console.error('Visual fixture cleanup failed', error)
  process.exit(1)
})
