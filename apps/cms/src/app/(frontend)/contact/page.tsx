import type { Metadata } from 'next'
import ContactForm from '../../../components/ContactForm'
import { getSiteSettings } from '../../../lib/data/siteSettings'
import { buildMetadata } from '../../../lib/seo'

// Ported from apps/web/src/pages/contact.astro (docs/PLAN-next-migration.md
// Stage 2, page group 2). SiteSettings via the Local API data layer, same
// pattern as Footer.tsx — no mutate()/REST unwrapping needed.
//
// force-dynamic: this page's own getSiteSettings() call is a real DB read
// (SiteSettings is admin-editable, so a statically-cached copy would go
// stale) — and even without it, the shared layout's Footer makes the exact
// same call regardless. A genuine `next build`'s static-generation pass
// executes both for real, which fails in Docker's build stage (no live
// DATABASE_URI there — see apps/cms/Dockerfile).
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
  const address = s.contactAddress || 'г. Кемерово, ул. Демьяна Бедного, 6'
  const hours = s.contactHours || '10:00 — 21:00'
  const yandexMapsUrl = s.yandexMapsUrl || 'https://yandex.ru/maps/-/CHvDmII7'
  const twoGisUrl = s.twoGisUrl || 'https://go.2gis.com/2y9MJ'

  return (
    <>
      <section className="border-b border-border py-16">
        <div className="container-page">
          <h1 className="text-[38px] font-bold tracking-[-0.03em]">Связаться с нами</h1>
          <p className="mt-4 max-w-[520px] text-[15.5px] text-muted-foreground">
            Есть вопросы по аренде оборудования? Напишите нам — мы на связи.
          </p>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="mx-auto max-w-[880px]">
          <h2 className="text-[26px] font-bold tracking-[-0.03em]">О компании Playback</h2>
          <div className="mt-5 space-y-4 text-[14.5px] leading-[1.6] text-muted-foreground">
            <p><span className="font-medium text-foreground">Компания Playback</span> работает на рынке фото/видео производства с 2017 года — предлагаем в аренду оборудование от известных брендов.</p>
            <p>Подбираем и обслуживаем технику для съёмок любого масштаба — от небольших проектов до крупных производств. Готовы помочь с выбором и индивидуальными условиями аренды.</p>
            <p>Работаем с частными клиентами, видеографами, фотографами и продакшн-командами — только проверенная техника и гибкие условия.</p>
          </div>
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="card-surface p-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Адрес</div>
              <p className="mt-2 text-[14.5px] text-foreground">{address}</p>
              <div className="mt-3 flex gap-2">
                <a href={yandexMapsUrl} target="_blank" rel="noopener noreferrer" className="pill border-none bg-muted hover:bg-primary hover:text-primary-foreground">Я.Карты</a>
                <a href={twoGisUrl} target="_blank" rel="noopener noreferrer" className="pill border-none bg-muted hover:bg-primary hover:text-primary-foreground">2ГИС</a>
              </div>
            </div>

            <div className="card-surface p-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Контакты</div>
              <div className="mt-3 flex flex-col gap-2 text-[14.5px]">
                <a href={phoneHref} className="border-none hover:text-accent">{phone}</a>
                <a href={`mailto:${email}`} className="border-none hover:text-accent">{email}</a>
                <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="border-none hover:text-accent">Telegram · {telegram}</a>
                <a href={vkUrl} target="_blank" rel="noopener noreferrer" className="border-none hover:text-accent">VK · /playbackrental</a>
              </div>
            </div>

            <div className="card-surface p-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">График работы</div>
              <div className="mt-3 space-y-1.5 text-[14.5px] text-muted-foreground">
                <div className="flex justify-between"><span>Часы работы</span><span className="text-foreground">{hours}</span></div>
                <div className="flex justify-between"><span>Выходные</span><span className="text-foreground">По записи</span></div>
              </div>
            </div>
          </div>

          <ContactForm />
        </div>
      </section>
    </>
  )
}
