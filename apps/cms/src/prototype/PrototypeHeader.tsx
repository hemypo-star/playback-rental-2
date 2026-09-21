'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import PrototypeCartBadge from './PrototypeCartBadge'
import PrototypeDatePicker from './PrototypeDatePicker'

export default function PrototypeHeader({openHour,closeHour}:{openHour:number;closeHour:number}){
 const pathname=usePathname();const params=useSearchParams();const kits=params.get('type')==='kit'
 const active=(p:string)=>pathname===p||pathname.startsWith(`${p}/`)
 return <div className="pb-header-wrap"><header className="pb-header">
  <Link href="/" className="pb-brand"><strong>Playback</strong><span>Rental</span><sup>®</sup></Link>
  <nav className="pb-nav"><Link data-active={active('/catalog')&&!kits} href="/catalog">Каталог</Link><Link data-active={kits} href="/catalog?type=kit">Наборы</Link><Link data-active={active('/how-it-works')} href="/how-it-works">Условия</Link><Link data-active={active('/contact')} href="/contact">Контакты</Link></nav>
  <div className="pb-header-spacer"/><div className="pb-hours"><span className="pb-hours-dot"/><span>{String(openHour).padStart(2,'0')}:00—{String(closeHour).padStart(2,'0')}:00</span></div>
  <PrototypeDatePicker variant="navbar" openHour={openHour} closeHour={closeHour}/>
  <Link href="/checkout" aria-label="Корзина" className="pb-pill pb-cart-link"><span>Корзина</span><PrototypeCartBadge/></Link>
 </header></div>
}