'use client'
import { useEffect } from 'react'
import { useStore } from '@nanostores/react'
import { $selectedDates } from '../stores/dates'
import { getRentalAvailabilityBulk } from '../lib/rentalAvailability'
import { resetCatalogAvailability,setCatalogAvailabilityFailed,setCatalogAvailabilityLoading,setCatalogAvailabilityReady } from '../stores/catalogAvailability'

// Renders nothing. Fetches one bulk availability lookup for the rental products
// on the current catalog page and publishes it to stores/catalogAvailability,
// which PrototypeProductCard subscribes to.
//
// Replaces scripts/catalog-availability.ts + CatalogAvailabilityInit.tsx, whose
// job this was before the storefront rewrite left both unreachable. Two
// deliberate differences from that implementation:
//
//  - it does not hide cards. The old script set display:none on unavailable
//    cards after render, which made the server-rendered pager and the
//    "N позиций" count disagree with what was actually on screen. The in-stock
//    filter is a server-side query param now, so filtering and pagination stay
//    consistent; this component only adds per-date information to the cards
//    that are shown.
//  - a failed lookup is published as 'failed' rather than swallowed, so a card
//    can say it could not check instead of leaving a stale "Свободно" that
//    reads as confirmation (audit N10).
export default function PrototypeCatalogAvailability({productIds}:{productIds:number[]}){
 const dates=useStore($selectedDates)
 const startTime=dates.startDate?.getTime(),endTime=dates.endDate?.getTime()
 // Join to a primitive so a re-render with an equal-but-new array does not
 // re-trigger the effect; the same reason the date deps are .getTime() numbers.
 const idsKey=productIds.join(',')
 useEffect(()=>{
  const ids=idsKey?idsKey.split(',').map(Number):[]
  if(!ids.length||startTime===undefined||endTime===undefined){resetCatalogAvailability();return}
  let cancelled=false
  setCatalogAvailabilityLoading()
  getRentalAvailabilityBulk(ids,new Date(startTime),new Date(endTime))
   .then(map=>{if(!cancelled)setCatalogAvailabilityReady(map)})
   .catch(()=>{if(!cancelled)setCatalogAvailabilityFailed()})
  return()=>{cancelled=true}
 },[idsKey,startTime,endTime])
 // Clear on unmount so a card rendered elsewhere (the homepage grid) never
 // reads a result set computed for the catalog's products.
 useEffect(()=>()=>resetCatalogAvailability(),[])
 return null
}
