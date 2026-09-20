'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@nanostores/react'
import { $cartCount } from '../stores/cart'
export default function PrototypeCartBadge(){const count=useStore($cartCount);const[hydrated,setHydrated]=useState(false);
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>setHydrated(true),[]);
 const shown=hydrated?count:0
 return <span key={shown} className="pb-cart-count">{shown}</span>}