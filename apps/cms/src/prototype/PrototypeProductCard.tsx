'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useStore } from '@nanostores/react'
import { $cart, addToCart } from '../stores/cart'
import { $selectedDates, requestDatePickerOpen } from '../stores/dates'

export interface PrototypeProductCardData{
 id:number;title:string;subtitle?:string|null;price:number;listingType:'rental'|'sale';quantity:number;available?:boolean|null;tag?:string|null;imageUrl?:string;unit?:string
}
export default function PrototypeProductCard({product,delay=0}:{product:PrototypeProductCardData;delay?:number}){
 const cart=useStore($cart);const dates=useStore($selectedDates);const inCart=cart.some(i=>i.productId===product.id);const inStock=Boolean(product.available)&&product.quantity>0
 const add=()=>{if(product.listingType==='rental'&&(!dates.startDate||!dates.endDate)){requestDatePickerOpen();return}addToCart({productId:product.id,title:product.title,price:product.price,imageUrl:product.imageUrl,listingType:product.listingType,unit:product.unit|| (product.listingType==='rental'?'смена / 24 часа':'шт.')},1)}
 return <article className="pb-card pb-product-card" style={{animationDelay:`${Math.min(delay,400)}ms`}}>
   <Link href={`/product/${product.id}`} className="pb-product-image" aria-label={product.title}>
    {product.imageUrl&&<Image src={product.imageUrl} alt={product.title} fill sizes="(min-width:1021px) 30vw,(min-width:761px) 46vw,92vw" style={{objectFit:'cover'}}/>}
    <div className="pb-product-tags"><span className="pb-tag">{product.tag|| (product.listingType==='sale'?'Продажа':'Аренда')}</span><span className={`pb-tag ${inStock?'pb-tag-light':'pb-tag-red'}`}>{inStock?'Свободно':'Нет в наличии'}</span></div>
   </Link>
   <div className="pb-product-body"><Link href={`/product/${product.id}`} className="pb-product-title">{product.title}</Link>{product.subtitle&&<div className="pb-product-sub">{product.subtitle}</div>}<div className="pb-flex-fill"/><div className="pb-product-price"><strong>{new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(product.price)}</strong><span style={{fontSize:11,color:'var(--pb-sub)'}}>{product.unit|| (product.listingType==='rental'?'смена / 24 часа':'шт.')}</span></div><button type="button" className="pb-product-add" onClick={add} disabled={!inStock}>{inCart?'В корзине ✓':'В корзину'}</button></div>
 </article>
}