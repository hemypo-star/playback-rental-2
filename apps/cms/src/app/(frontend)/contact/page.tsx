import type { Metadata } from 'next'
import Link from 'next/link'
import ContactForm from '../../../components/ContactForm'
import { getSiteSettings } from '../../../lib/data/siteSettings'
import { buildMetadata } from '../../../lib/seo'

// S5 "Контакты" (design_handoff_swiss_bento/04-screens.md): 7/5 — a card of
// caps label + 17px value rows with dividers and "Позвонить" / "Telegram"
// buttons, beside a map card. The map is a drawn panel with links out to
// Яндекс.Карты and 2ГИС, not an auto-loading iframe. Then "о компании" and
// the contact form. Every value comes from SiteSettings (/admin → Контент →
// Тексты и контакты), with the previous hardcoded copy as fallback.
//
// force-dynamic: SiteSettings is admin-editable, so a statically-cached copy
// would go stale — and Docker's build stage has no DATABASE_URI.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildMetadata({ title: 'Контакты', path: '/contact' })

export default async function ContactPage() {
  const s = await getSiteSettings()
  const phone = s.contactPhone || '+7 (996) 527-0026'
  const phoneHref = `tel:${phone.replace(/[^\d+]/g, '')}`
  const email = s.contactEmail || 'PlaybackRental@yandex.ru'
  const telegram = s.contactTelegram || '@Playbackrental_admin'
  const telegramUrl = s.contactTelegramUrl || 'https://t.me/Playbackrental_admin'
  const vkUrl = s.contactVkUrl || 'https://vk.com/playbackrental'
  const address = s.contactAddress || 'г. Кемерово, ул. Демьяна Бедного, 6, офис 33'
  const hours = s.contactHours || '10:00 — 21:00'
  const yandexMapsUrl = s.yandexMapsUrl || 'https://yandex.ru/maps/-/CHvDmII7'
  const twoGisUrl = s.twoGisUrl || 'https://go.2gis.com/2y9MJ'
  const vkHandle = vkUrl.replace(/^https?:\/\/(www\.)?/, '')

  return (
    <div className="pb-page">
      <section className="pb-container pb-grid" style={{ paddingTop: 14 }}>
        <div className="pb-card pb-page-head">
          <div>
            <div className="pb-kicker">
              <Link href="/" className="pb-link-hover">Главная</Link> / Контакты
            </div>
            <h1 className="pb-h1" style={{ marginTop: 12 }}>Контакты</h1>
            <p className="pb-lead">Есть вопрос по аренде или нужно подобрать комплект — позвоните, напишите или приезжайте.</p>
          </div>
        </div>

        <div className="pb-card pb-contacts-card">
          <div className="pb-contact-line">
            <span className="pb-kicker">Адрес</span>
            <span className="pb-contact-value">{address}</span>
          </div>
          <div className="pb-contact-line">
            <span className="pb-kicker">Телефон</span>
            <a href={phoneHref} className="pb-contact-value">{phone}</a>
          </div>
          <div className="pb-contact-line">
            <span className="pb-kicker">Почта</span>
            <a href={`mailto:${email}`} className="pb-contact-value">{email}</a>
          </div>
          <div className="pb-contact-line">
            <span className="pb-kicker">Мессенджеры</span>
            <span className="pb-contact-value">
              <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="pb-link-hover">Telegram · {telegram}</a>
              <a href={vkUrl} target="_blank" rel="noopener noreferrer" className="pb-link-hover pb-contact-sub">ВКонтакте · {vkHandle}</a>
            </span>
          </div>
          <div className="pb-contact-line">
            <span className="pb-kicker">Часы работы</span>
            <span className="pb-contact-value">
              {hours}
              <span className="pb-contact-sub">Выходные — по записи</span>
            </span>
          </div>
          <div className="pb-contact-actions">
            <a href={phoneHref} className="pb-pill pb-btn pb-hero-cta">
              <span>Позвонить</span>
              <span aria-hidden>→</span>
            </a>
            <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="pb-pill pb-btn pb-btn-light">
              Telegram
            </a>
          </div>
        </div>

        <div className="pb-map-card">
          <span className="pb-map-pin" aria-hidden />
          <div className="pb-map-panel">
            <div className="pb-kicker">Как добраться</div>
            <div className="pb-map-panel-title">{address}</div>
            <div className="pb-map-panel-links">
              <a href={yandexMapsUrl} target="_blank" rel="noopener noreferrer" className="pb-pill pb-btn" style={{ height: 40, padding: '0 16px', fontSize: 10.5 }}>
                Яндекс.Карты
              </a>
              <a href={twoGisUrl} target="_blank" rel="noopener noreferrer" className="pb-pill pb-btn pb-btn-light" style={{ height: 40, padding: '0 16px', fontSize: 10.5 }}>
                2ГИС
              </a>
            </div>
          </div>
        </div>

        <div className="pb-card pb-about-card">
          <div className="pb-kicker">О компании</div>
          <h2 className="pb-h2" style={{ fontSize: 'clamp(24px,2.4vw,32px)' }}>Playback Rental</h2>
          <p>
            Работаем на рынке фото- и видеопроизводства с 2017 года. Подбираем и обслуживаем технику для съёмок любого масштаба — от
            небольших проектов до крупных производств.
          </p>
          <p>Работаем с частными клиентами, фотографами, видеографами и продакшн-командами — только проверенная техника и гибкие условия.</p>
          <div className="pb-about-facts">
            <div className="pb-about-fact">
              <strong>с 2017</strong>
              <span>на рынке</span>
            </div>
            <div className="pb-about-fact">
              <strong>4 ч</strong>
              <span>минимальная аренда</span>
            </div>
          </div>
        </div>

        <div className="pb-card pb-form-card">
          <ContactForm />
        </div>
      </section>
    </div>
  )
}
