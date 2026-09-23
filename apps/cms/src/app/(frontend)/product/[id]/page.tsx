import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import PrototypeProduct from '../../../../prototype/PrototypeProduct'
import { getProductById } from '../../../../lib/data/products'
import { mediaUrl } from '../../../../lib/mediaUrl'
import { buildMetadata,siteOrigin } from '../../../../lib/seo'
export const dynamic='force-dynamic'
interface Props{params:Promise<{id:string}>}
async function load(raw:string){const id=Number(raw);if(!Number.isInteger(id)||id<=0)redirect('/catalog');const p=await getProductById(id);if(!p)redirect('/catalog');return p}
export async function generateMetadata({params}:Props):Promise<Metadata>{const{id}=await params;const p=await load(id);return buildMetadata({title:p.title,description:p.description??undefined,path:`/product/${p.id}`,image:mediaUrl(p.images?.[0])})}
export default async function ProductPage({params}:Props){const{id}=await params;const p=await load(id);const images=(p.images||[]).map((img)=>mediaUrl(img)).filter(Boolean);const json={ '@context':'https://schema.org','@type':'Product',name:p.title,description:p.description??p.subtitle??undefined,image:images.length?images:undefined,offers:{'@type':'Offer',price:p.price,priceCurrency:'RUB',availability:p.available&&p.quantity>0?'https://schema.org/InStock':'https://schema.org/OutOfStock',url:new URL(`/product/${p.id}`,siteOrigin()).toString(),businessFunction:p.listingType==='rental'?'https://schema.org/LeaseOut':'https://schema.org/Sell'}};return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(json).replace(/</g,'\\u003c')}}/><PrototypeProduct id={p.id}/></>} 