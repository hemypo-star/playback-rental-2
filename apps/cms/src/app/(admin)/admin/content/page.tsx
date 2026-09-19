'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

const SECTIONS = [
  { href:'/admin/categories', title:'Категории', text:'Структура каталога и порядок разделов.' },
  { href:'/admin/promotions', title:'Акции', text:'Промо-блоки и предложения на витрине.' },
  { href:'/admin/promo-codes', title:'Промокоды', text:'Скидочные коды и условия применения.' },
  { href:'/admin/media', title:'Медиатека', text:'Изображения и загруженные материалы.' },
  { href:'/admin/users', title:'Пользователи', text:'Доступ сотрудников к админке.' },
  { href:'/admin/settings', title:'Настройки', text:'Контакты, часы работы и параметры сайта.' },
]

export default function AdminContentPage(){
  const router=useRouter()
  const logout=async()=>{await fetch('/api/users/logout',{method:'POST'});router.push('/admin/login')}
  return <div className="pb-admin-content-hub">
    <div className="pb-card pb-admin-content-head">
      <div><div className="pb-kicker">Контент</div><h1>Управление сайтом</h1></div>
    </div>
    <div className="pb-admin-content-grid">
      {SECTIONS.map(section=><Link key={section.href} href={section.href} className="pb-card pb-admin-content-card"><div className="pb-kicker">{section.title}</div><p>{section.text}</p><span>Открыть →</span></Link>)}
    </div>
    <button type="button" className="pb-admin-logout" onClick={logout}>Выйти из админки</button>
  </div>
}
