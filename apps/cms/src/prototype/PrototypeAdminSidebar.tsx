'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { AdminNavBadges } from '../lib/admin/data/navBadges'

const NAV = [
  { label:'Заказы', href:'/admin/orders', badge:'orders' as const },
  { label:'Календарь', href:'/admin/calendar' },
  { label:'Склад', href:'/admin/stock', badge:'stock' as const },
  { label:'Клиенты', href:'/admin/clients', badge:'clients' as const },
  { label:'Аналитика', href:'/admin/analytics' },
  { label:'Контент', href:'/admin/content' },
]

export default function PrototypeAdminSidebar({badges}:{badges:AdminNavBadges}){
 const pathname=usePathname()
 return <aside className="pb-admin-sidebar">
  <div className="pb-admin-brand"><strong>Playback</strong><span>Admin</span></div>
  <nav className="pb-admin-nav">{NAV.map(item=>{const active=pathname===item.href||pathname.startsWith(item.href+'/');const count=item.badge?badges[item.badge]:undefined;return <Link key={item.href} href={item.href} data-active={active}><span>{item.label}</span>{count?<span className="pb-admin-badge">{count}</span>:null}</Link>})}</nav>
  <div className="pb-admin-bottom"><Link href="/">← На сайт</Link></div>
 </aside>
}