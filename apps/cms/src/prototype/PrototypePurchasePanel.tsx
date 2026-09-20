'use client'
import { useStore } from '@nanostores/react'
import type { Product } from '../payload-types'
import { $selectedDates } from '../stores/dates'
import { addToCart } from '../stores/cart'
import { calculateRentalDays,calculateRentalPrice,formatCurrency } from '../lib/pricing'
import PrototypeInlineRentalCalendar from './PrototypeInlineRentalCalendar'

export default function PrototypePurchasePanel({product,imageUrl,openHour,closeHour}:{product:Product;imageUrl?:string;openHour:number;closeHour:number}){
 const dates=useStore($selectedDates);const inStock=Boolean(product.available)&&product.quantity>0
 const hasDates=product.listingType==='sale'||Boolean(dates.startDate&&dates.endDate)
 const days=dates.startDate&&dates.endDate?calculateRentalDays(dates.startDate,dates.endDate):1
 const total=product.listingType==='sale'?product.price:hasDates?calculateRentalPrice(product.price,dates.startDate||undefined,dates.endDate||undefined):product.price
 const add=()=>{if(!inStock||!hasDates)return;addToCart({productId:product.id,title:product.title,subtitle:product.subtitle||undefined,price:product.price,imageUrl,listingType:product.listingType,unit:product.listingType==='rental'?'смена / 24 часа':'шт.'},1)}
 return <div className="pb-card pb-product-panel">
  <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:12}}><span className="pb-price-large">{formatCurrency(product.price)}</span><span style={{fontSize:11,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--pb-sub)'}}>{product.listingType==='rental'?'/ смена':'/ шт.'}</span></div>
  {product.listingType==='rental'&&<div style={{marginTop:22}}><PrototypeInlineRentalCalendar openHour={openHour} closeHour={closeHour}/></div>}
  <div style={{marginTop:20}}><div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',fontSize:13.5}}><span style={{color:'var(--pb-sub)'}}>{product.listingType==='rental'?(hasDates?`${days} ${days===1?'смена':days<5?'смены':'смен'} × ${formatCurrency(product.price)}`:'Ставка за смену'):'Стоимость'}</span><span>{hasDates?formatCurrency(total):formatCurrency(product.price)}</span></div><div className="pb-summary"><span style={{fontSize:11,fontWeight:600,letterSpacing:'.13em',textTransform:'uppercase'}}>Итого</span><strong key={hasDates?total:'empty'} className="pb-pop-value">{hasDates?formatCurrency(total):'—'}</strong></div></div>
  <button type="button" className="pb-pill pb-btn" onClick={add} disabled={!inStock||!hasDates} style={{width:'100%',marginTop:16}}><span>{!inStock?'Нет в наличии':!hasDates?'Выберите даты':'В корзину'}</span><span>→</span></button>
  <div style={{marginTop:12,fontSize:12,color:'var(--pb-sub)',lineHeight:1.5,textAlign:'center'}}>Без залога. Бронь держим 2 часа после подтверждения.</div>
 </div>
}