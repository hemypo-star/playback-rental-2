import type { Metadata } from 'next'
import PrototypeCheckout from '../../../prototype/PrototypeCheckout'
import { getSiteSettings } from '../../../lib/data/siteSettings'
import { buildMetadata } from '../../../lib/seo'
export const dynamic='force-dynamic'
export const metadata:Metadata=buildMetadata({title:'Оформление заказа',path:'/checkout'})
export default async function CheckoutRoutePage(){const s=await getSiteSettings();return <PrototypeCheckout openHour={s.businessHoursOpen??10} closeHour={s.businessHoursClose??21}/>} 