'use client'
import { useState } from 'react'
import { useStore } from '@nanostores/react'
import type { Product } from '../payload-types'
import { $selectedDates } from '../stores/dates'
import { addToCart } from '../stores/cart'
import { calculateRentalPrice,formatCurrency } from '../lib/pricing'
import PrototypeDatePicker from './PrototypeDatePicker'

export default function PrototypePurchasePanel({product,imageUrl,openHour,closeHour}:{product:Product;imageUrl?:string;openHour:number;closeHour:number}){
 const dates=useStore($selectedDates);const[qty,setQty]=useState(1);const inStock=Boolean(product.available)&&product.quantity>0;const max=Math.max(1,product.quantity||1)
 const hasDates=product.listingType==='sale'||Boolean(dates.startDate&&dates.endDate)
 const total=product.listingType==='sale'?product.price*qty:hasDates?calculateRentalPrice(product.price,dates.startDate||undefined,dates.endDate||undefined)*qty:product.price*qty
 const add=()=>{if(!inStock||!hasDates)return;addToCart({productId:product.id,title:product.title,price:product.price,imageUrl,listingType:product.listingType,unit:product.listingType==='rental'?'смена / 24 часа':'шт.'},qty)}
 return <div className="pb-card pb-product-panel">
  <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:12}}><span className="pb-price-large">{formatCurrency(product.price)}</span><span style={{fontSize:11,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--pb-sub)'}}>{product.listingType==='rental'?'/ смена':'/ шт.'}</span></div>
  {product.listingType==='rental'&&<div style={{marginTop:22}}><PrototypeDatePicker variant="hero" openHour={openHour} closeHour={closeHour}/></div>}
  <div style={{marginTop:20,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><span className="pb-kicker">Количество</span><div className="pb-qty"><button type="button" onClick={()=>setQty(q=>Math.max(1,q-1))}>−</button><span>{qty}</span><button type="button" onClick={()=>setQty(q=>Math.min(max,q+1))}>+</button></div></div>
  <div style={{marginTop:20}}><div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',fontSize:13.5}}><span style={{color:'var(--pb-sub)'}}>{product.listingType==='rental'?(hasDates?'Аренда на выбранные даты':'Ставка за смену'):'Стоимость'}</span><span>{formatCurrency(total)}</span></div><div className="pb-summary"><span style={{fontSize:11,fontWeight:600,letterSpacing:'.13em',textTransform:'uppercase'}}>Итого</span><strong>{hasDates?formatCurrency(total):'—'}</strong></div></div>
  <button type="button" className="pb-pill pb-btn" onClick={add} disabled={!inStock||!hasDates} style={{width:'100%',marginTop:16}}><span>{!inStock?'Нет в наличии':!hasDates?'Выберите даты':'В корзину'}</span><span>→</span></button>
  <div style={{marginTop:12,fontSize:12,color:'var(--pb-sub)',lineHeight:1.5,textAlign:'center'}}>Без залога. Наличие подтверждается при оформлении заявки.</div>
 </div>
}