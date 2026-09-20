'use client'
import { useEffect,useState } from 'react'
import { useStore } from '@nanostores/react'
import type { Product } from '../payload-types'
import { $selectedDates } from '../stores/dates'
import { addToCart } from '../stores/cart'
import { calculateRentalDays,calculateRentalPrice,formatCurrency } from '../lib/pricing'
import { getRentalAvailability,type RentalAvailability } from '../lib/rentalAvailability'
import PrototypeInlineRentalCalendar from './PrototypeInlineRentalCalendar'

export default function PrototypePurchasePanel({product,imageUrl,openHour,closeHour}:{product:Product;imageUrl?:string;openHour:number;closeHour:number}){
 const dates=useStore($selectedDates);const isRental=product.listingType==='rental';const inStock=Boolean(product.available)&&product.quantity>0
 const hasDates=product.listingType==='sale'||Boolean(dates.startDate&&dates.endDate)
 const days=dates.startDate&&dates.endDate?calculateRentalDays(dates.startDate,dates.endDate):1
 const total=product.listingType==='sale'?product.price:hasDates?calculateRentalPrice(product.price,dates.startDate||undefined,dates.endDate||undefined):product.price
 const startTime=dates.startDate?.getTime(),endTime=dates.endDate?.getTime()
 // Real per-date availability, restored from the old components/
 // ProductPurchasePanel.tsx — this effect runs for every rental product
 // regardless of whether both dates are picked yet (not just "when the
 // customer has both dates selected"), because the response's bookedRanges
 // is what PrototypeInlineRentalCalendar needs to mark busy days *while*
 // the customer is still choosing — gating the fetch on hasDates would
 // leave the calendar with no busy-day data for the first pick.
 const [available,setAvailable]=useState(product.quantity)
 const [bookedRanges,setBookedRanges]=useState<RentalAvailability['bookedRanges']>(undefined)
 const [checking,setChecking]=useState(false)
 // A failed availability lookup is NOT the same as "fully booked", and must not
 // render as it: that is audit finding N10 / work-order A4 ("Ошибку загрузки
 // показывать как ошибку") in mirror image — the original bug swallowed the
 // error into a silent .catch(() => {}) so it read as "everything free", and
 // collapsing it into available=0 would instead tell the customer the item is
 // taken when it may well be free. Tracked separately so it can say so.
 const [loadFailed,setLoadFailed]=useState(false)
 useEffect(()=>{
  if(!isRental)return
  let cancelled=false
  // react-hooks/set-state-in-effect flags these two synchronous setState calls
  // even though the effect as a whole is exactly its own recommended pattern
  // (fetch an external system, setState from the callback) — the loading flag
  // and the cleared error just need to flip before the fetch starts, not
  // after. One directive covers both: the rule reports the first such call in
  // an effect, so a second directive here lints as unused.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setChecking(true)
  setLoadFailed(false)
  const start=startTime===undefined?undefined:new Date(startTime),end=endTime===undefined?undefined:new Date(endTime)
  getRentalAvailability(product.id,start,end).then(res=>{if(cancelled)return;setAvailable(res.available);setBookedRanges(res.bookedRanges)}).catch(()=>{if(!cancelled)setLoadFailed(true)}).finally(()=>{if(!cancelled)setChecking(false)})
  return()=>{cancelled=true}
 },[isRental,product.id,startTime,endTime])
 // Gate on the real check once both dates are picked (including while it's
 // still in flight — a stale/static "in stock" can't stand in for a result
 // that isn't known yet); fall back to the static product.available/
 // quantity check only when there are no dates yet to check against.
 // When the lookup failed we genuinely do not know, so fall back to the static
 // stock check rather than blocking every add-to-cart on an availability
 // service outage. OrderItems' beforeValidate hook still refuses a real
 // conflict at checkout, so this cannot oversell — it only avoids killing the
 // funnel on a transient error.
 const canAdd=isRental?(loadFailed?inStock:hasDates?!checking&&available>0:inStock):inStock
 const add=()=>{if(!canAdd||!hasDates)return;addToCart({productId:product.id,title:product.title,subtitle:product.subtitle||undefined,price:product.price,imageUrl,listingType:product.listingType,unit:product.listingType==='rental'?'смена / 24 часа':'шт.'},1)}
 return <div className="pb-card pb-product-panel">
  <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:12}}><span className="pb-price-large">{formatCurrency(product.price)}</span><span style={{fontSize:11,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--pb-sub)'}}>{product.listingType==='rental'?'/ смена':'/ шт.'}</span></div>
  {isRental&&<div style={{marginTop:22}}><PrototypeInlineRentalCalendar openHour={openHour} closeHour={closeHour} bookedRanges={bookedRanges}/></div>}
  {isRental&&hasDates&&<div style={{marginTop:14,fontSize:12.5,color:!checking&&(loadFailed||available<=0)?'var(--pb-red)':'var(--pb-sub)'}}>{checking?'Проверяем наличие…':loadFailed?'Не удалось проверить наличие на эти даты — подтвердим при звонке.':available>0?`Доступно: ${available} шт. на выбранные даты`:'Забронировано на выбранные даты'}</div>}
  <div style={{marginTop:20}}><div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',fontSize:13.5}}><span style={{color:'var(--pb-sub)'}}>{product.listingType==='rental'?(hasDates?`${days} ${days===1?'смена':days<5?'смены':'смен'} × ${formatCurrency(product.price)}`:'Ставка за смену'):'Стоимость'}</span><span>{hasDates?formatCurrency(total):formatCurrency(product.price)}</span></div><div className="pb-summary"><span style={{fontSize:11,fontWeight:600,letterSpacing:'.13em',textTransform:'uppercase'}}>Итого</span><strong key={hasDates?total:'empty'} className="pb-pop-value">{hasDates?formatCurrency(total):'—'}</strong></div></div>
  <button type="button" className="pb-pill pb-btn pb-purchase-add" onClick={add} disabled={!canAdd||!hasDates} style={{width:'100%',marginTop:16}}><span>{!inStock?'Нет в наличии':!hasDates?'Выберите даты':'В корзину'}</span><span>→</span></button>
  <div style={{marginTop:12,fontSize:12,color:'var(--pb-sub)',lineHeight:1.5,textAlign:'center'}}>Без залога. Бронь держим 2 часа после подтверждения.</div>
 </div>
}
