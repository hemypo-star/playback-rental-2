'use client'
import { useStore } from '@nanostores/react'
import { $cartCount } from '../stores/cart'
export default function PrototypeCartBadge(){const count=useStore($cartCount);return <span className="pb-cart-count">{count}</span>}