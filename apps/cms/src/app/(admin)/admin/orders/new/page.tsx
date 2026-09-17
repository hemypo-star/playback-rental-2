import type { Metadata } from 'next'
import AdminPageHeader from '../../../../../components/admin/AdminPageHeader'
import ManualOrderForm from '../../../../../components/admin/ManualOrderForm'
import { getAdminProducts } from '../../../../../lib/admin/data/products'

export const metadata: Metadata = { title: 'Новый заказ' }
export const dynamic = 'force-dynamic'

export default async function NewAdminOrderPage() {
  const products = await getAdminProducts()

  return (
    <>
      <AdminPageHeader title="Новый заказ" subtitle="Заявка, принятая по телефону или в мессенджере" />
      <ManualOrderForm
        products={products.map((product) => ({
          id: product.id,
          title: product.title,
          listingType: product.listingType,
          price: product.price,
          available: product.available,
        }))}
      />
    </>
  )
}
