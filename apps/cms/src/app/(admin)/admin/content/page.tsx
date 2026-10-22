'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

// "Контент" hub: grouped by what an operator wants to change, and every card
// says WHERE on the site the change shows up — the previous flat list of six
// one-liners didn't, and the site's own texts (hero, steps, contacts) were
// hidden behind a card called "Настройки".

const SITE_TEXT_SECTIONS = [
  { anchor: 'hero', label: 'Первый экран главной' },
  { anchor: 'facts', label: 'Цифры под первым экраном' },
  { anchor: 'steps', label: 'Шаги «Как это работает»' },
  { anchor: 'cta', label: 'Тёмный блок «Нужен совет»' },
  { anchor: 'contacts', label: 'Телефон, почта, адрес' },
  { anchor: 'hours', label: 'Часы работы' },
]

const GROUPS = [
  {
    title: 'Каталог',
    items: [
      { href: '/admin/categories', title: 'Категории', where: 'Разделы каталога, их порядок и плитки разделов на главной.' },
      { href: '/admin/kits', title: 'Наборы', where: 'Комплекты техники в разделе «Наборы»: состав, цена, остаток.' },
    ],
  },
  {
    title: 'Маркетинг',
    items: [
      { href: '/admin/promotions', title: 'Акции', where: 'Блок «Акции» на главной и страница каждой акции.' },
      { href: '/admin/promo-codes', title: 'Промокоды', where: 'Коды скидки, которые клиент вводит при оформлении заявки.' },
    ],
  },
  {
    title: 'Файлы и доступ',
    items: [
      { href: '/admin/media', title: 'Медиатека', where: 'Все загруженные изображения и их описания для поисковиков.' },
      { href: '/admin/users', title: 'Пользователи', where: 'Кто может входить в эту админку.' },
    ],
  },
]

export default function AdminContentPage() {
  const router = useRouter()
  const logout = async () => {
    await fetch('/api/users/logout', { method: 'POST' })
    router.push('/admin/login')
  }
  return (
    <div className="pb-admin-content-hub">
      <div className="pb-card pb-admin-content-head">
        <div className="pb-kicker">Контент</div>
        <h1>Что и где меняется на сайте</h1>
        <p className="pb-admin-content-lead">
          Товары, цены и остатки приходят из МойСклад. Здесь — всё остальное: тексты, контакты, разделы, акции и картинки.
        </p>
      </div>

      <div className="pb-card pb-admin-content-primary">
        <div>
          <div className="pb-kicker">Тексты и контакты сайта</div>
          <h2>Главная страница, контакты и часы работы</h2>
          <p>Всё, что написано на главной, в подвале и на странице «Контакты». Сохранение сразу меняет сайт.</p>
        </div>
        <div className="pb-admin-content-anchors">
          {SITE_TEXT_SECTIONS.map((s) => (
            <Link key={s.anchor} href={`/admin/settings#${s.anchor}`}>
              {s.label}
              <span aria-hidden>→</span>
            </Link>
          ))}
        </div>
      </div>

      {GROUPS.map((group) => (
        <section key={group.title} className="pb-admin-content-group">
          <div className="pb-kicker">{group.title}</div>
          <div className="pb-admin-content-grid">
            {group.items.map((item) => (
              <Link key={item.href} href={item.href} className="pb-card pb-admin-content-card">
                <h3>{item.title}</h3>
                <p>{item.where}</p>
                <span>Открыть →</span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <button type="button" className="pb-admin-logout" onClick={logout}>
        Выйти из админки
      </button>
    </div>
  )
}
