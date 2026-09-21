'use client'
import { useStore } from '@nanostores/react'
import { addToCart } from '../stores/cart'
import { $selectedDates, requestDatePickerOpen } from '../stores/dates'
import type { PrototypeProductCardData } from './PrototypeProductCard'
export default function PrototypeAddButton({product,label='Добавить'}:{product:PrototypeProductCardData;label?:string}){const dates=useStore($selectedDates);const add=()=>{if(product.listingType==='rental'&&(!dates.startDate||!dates.endDate)){requestDatePickerOpen();return}addToCart({productId:product.id,title:product.title,price:product.price,imageUrl:product.imageUrl,listingType:product.listingType,unit:product.unit||'шт.'},1)};return <button type="button" className="pb-pill pb-btn pb-btn-light pb-accessory-add" style={{padding:'0 16px'}} onClick={add}>{label}</button>}