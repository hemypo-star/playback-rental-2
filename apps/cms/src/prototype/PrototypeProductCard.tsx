'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useStore } from '@nanostores/react'
import { $cart, addToCart } from '../stores/cart'
import { $selectedDates, requestDatePickerOpen } from '../stores/dates'
import { $catalogAvailability } from '../stores/catalogAvailability'

// `categoryName` feeds the card's left-hand badge. Precedence is the one the
// card on `2.0` used (apps/cms/src/components/ProductCard.tsx): an explicit
// admin-set `tag` wins, otherwise the product's category name, and only a
// product with neither falls back to the listing type. The unit label beside
// the price is this branch's own category-keyed one (PrototypeCatalog's
// unitOf), not 2.0's flat "сутки"/"шт." — the two were mixed deliberately.
export interface PrototypeProductCardData{
 id:number;title:string;subtitle?:string|null;price:number;listingType:'rental'|'sale';quantity:number;available?:boolean|null;tag?:string|null;categoryName?:string|null;imageUrl?:string;unit?:string
}
export default function PrototypeProductCard({product,delay=0}:{product:PrototypeProductCardData;delay?:number}){
 const cart=useStore($cart);const dates=useStore($selectedDates);const avail=useStore($catalogAvailability);const inCart=cart.some(i=>i.productId===product.id);const inStock=Boolean(product.available)&&product.quantity>0
 // Live per-date availability, published by PrototypeCatalogAvailability. Only
 // applies to a rental card that is in stock at all: an out-of-stock card
 // already says "Нет в наличии" server-side, and overwriting that with
 // "Забронировано" would imply stock exists but is taken for these dates —
 // the same distinction the implementation this replaces was careful about.
 const dated=product.listingType==='rental'&&inStock&&Boolean(dates.startDate&&dates.endDate)
 const freeNow=dated&&avail.status==='ready'?avail.available[product.id]??0:null
 // A lookup that failed is not a lookup that returned zero: say so rather than
 // leaving the static badge standing as if it had been confirmed (audit N10).
 const availFailed=dated&&avail.status==='failed'
 const bookedOut=freeNow!==null&&freeNow<=0
 const add=()=>{if(product.listingType==='rental'&&(!dates.startDate||!dates.endDate)){requestDatePickerOpen();return}if(bookedOut)return;addToCart({productId:product.id,title:product.title,subtitle:product.subtitle||undefined,price:product.price,imageUrl:product.imageUrl,listingType:product.listingType,unit:product.unit|| (product.listingType==='rental'?'смена / 24 часа':'шт.')},1)}
 return <article className="pb-card pb-product-card" style={{animationDelay:`${Math.min(delay,400)}ms`}}>
   <Link href={`/product/${product.id}`} className="pb-product-image" aria-label={product.title}>
    {product.imageUrl?<Image src={product.imageUrl} alt={product.title} fill sizes="(min-width:1021px) 30vw,(min-width:761px) 46vw,92vw" style={{objectFit:'cover'}}/>:<div className="pb-image-placeholder" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.7"/><path d="m5 18 5-5 3.5 3 2.5-2.5 3 4.5"/></svg><span>{product.title}</span></div>}
    <div className="pb-product-tags"><span className="pb-tag">{product.tag||product.categoryName|| (product.listingType==='sale'?'Продажа':'Аренда')}</span><span className={`pb-tag ${!inStock||bookedOut?'pb-tag-red':'pb-tag-light'}`}>{!inStock?'Нет в наличии':availFailed?'Наличие уточним':freeNow!==null?(freeNow>0?`Доступно: ${freeNow}`:'Забронировано'):'Свободно'}</span></div>
   </Link>
   <div className="pb-product-body"><Link href={`/product/${product.id}`} className="pb-product-title">{product.title}</Link>{product.subtitle&&<div className="pb-product-sub">{product.subtitle}</div>}<div className="pb-flex-fill"/><div className="pb-product-price"><strong>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(product.price)}</strong><span style={{fontSize:11,color:'var(--pb-sub)'}}>{product.unit|| (product.listingType==='rental'?'смена / 24 часа':'шт.')}</span></div><button type="button" className="pb-product-add" data-in-cart={inCart} onClick={add} disabled={!inStock||bookedOut}>{bookedOut?'Занято на эти даты':inCart?'В корзине ✓':'В корзину'}</button></div>
 </article>
}