'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { AdminNavBadges } from '../lib/admin/data/navBadges'

const NAV = [
  { label:'Заказы', href:'/admin/orders', badge:'orders' as const },
  { label:'Календарь', href:'/admin/calendar' },
  { label:'Склад', href:'/admin/stock', badge:'stock' as const },
  { label:'Категории', href:'/admin/categories' },
  { label:'Акции', href:'/admin/promotions' },
  { label:'Промокоды', href:'/admin/promo-codes' },
  { label:'Клиенты', href:'/admin/clients', badge:'clients' as const },
  { label:'Аналитика', href:'/admin/analytics' },
  { label:'Медиатека', href:'/admin/media' },
  { label:'Пользователи', href:'/admin/users' },
  { label:'Настройки', href:'/admin/settings' },
]
export default function PrototypeAdminSidebar({userEmail,badges}:{userEmail:string;badges:AdminNavBadges}){
 const pathname=usePathname(),router=useRouter()
 const logout=async()=>{await fetch('/api/users/logout',{method:'POST'});router.push('/admin/login')}
 return <aside className="pb-admin-sidebar">
  <div className="pb-admin-brand"><strong>Playback</strong><span>Admin</span></div>
  <nav className="pb-admin-nav">{NAV.map(item=>{const active=pathname===item.href||pathname.startsWith(item.href+'/');const count=item.badge?badges[item.badge]:undefined;return <Link key={item.href} href={item.href} data-active={active}><span>{item.label}</span>{count?<span className="pb-admin-badge">{count}</span>:null}</Link>})}</nav>
  <div className="pb-admin-bottom"><Link href="/">← На сайт</Link><button type="button" onClick={logout}>Выйти · {userEmail}</button></div>
 </aside>
}