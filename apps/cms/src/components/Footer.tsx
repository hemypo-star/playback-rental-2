// Ported from apps/web/src/components/Footer.astro (docs/PLAN-next-migration.md
// Stage 2) — a plain async Server Component here (no interactivity of its
// own), reading SiteSettings via the Local API data layer instead of REST.
import { getSiteSettings } from '../lib/data/siteSettings'

export default async function Footer() {
  const s = await getSiteSettings()
  const email = s.contactEmail || 'PlaybackRental@yandex.ru'
  const phone = s.contactPhone || '+7 (996) 527-0026'
  const phoneHref = `tel:${phone.replace(/[^\d+]/g, '')}`
  const telegramUrl = s.contactTelegramUrl || 'https://t.me/Playbackrental_admin'
  const vkUrl = s.contactVkUrl || 'https://vk.com/playbackrental'
  const address = s.contactAddress || 'г. Кемерово, ул. Демьяна Бедного, 6'
  const yandexMapsUrl = s.yandexMapsUrl || 'https://yandex.ru/maps/-/CHvDmII7'
  const twoGisUrl = s.twoGisUrl || 'https://go.2gis.com/2y9MJ'

  return (
    <footer className="mt-20">
      <div className="container-page grid grid-cols-1 gap-10 rounded-t-[26px] border border-b-0 border-border bg-card py-14 md:grid-cols-3">
        <div>
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Контакты</h3>
          <div className="mt-4 flex flex-col gap-3 text-[14.5px] text-muted-foreground">
            <a className="border-none hover:text-accent" href={`mailto:${email}`}>{email}</a>
            <a className="border-none hover:text-accent" href={phoneHref}>{phone}</a>
            <div className="flex items-center gap-4 pt-1">
              <a href={vkUrl} target="_blank" rel="noopener noreferrer" className="border-none hover:text-accent" aria-label="ВКонтакте">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <path d="M2.00053 5.5H5.50053C5.50053 13.5 10.0005 14.5 10.0005 14.5L10.0015 5.5H13.5015L13.4995 10.5C17.9995 8.5 18.4995 5.5 18.4995 5.5H21.9995C21.9995 5.5 20.9995 10 17.0926 12.1534C19.1115 13.3511 21.2684 15.3315 21.9995 18.5H18.4995C18.4995 18.5 17.4995 15.5 13.4995 14L13.5015 18.5C1.88755 18.5 2.00232 7.5 2.00053 5.5Z"></path>
                </svg>
              </a>
              <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="border-none hover:text-accent" aria-label="Telegram">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.62 7.63c-.12.55-.44.68-.9.42l-2.5-1.84-1.2 1.16c-.13.13-.25.25-.5.25l.18-2.55 4.63-4.19c.2-.18-.05-.28-.31-.1l-5.73 3.6-2.47-.77c-.54-.17-.55-.54.11-.8l9.66-3.72c.45-.17.84.1.65.91z"></path></svg>
              </a>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Адрес</h3>
          <p className="mt-4 text-[14.5px] text-muted-foreground">{address}</p>
          <div className="mt-3 flex gap-2">
            <a href={yandexMapsUrl} target="_blank" rel="noopener noreferrer" className="pill border-none bg-muted hover:bg-primary hover:text-primary-foreground">Я.Карты</a>
            <a href={twoGisUrl} target="_blank" rel="noopener noreferrer" className="pill border-none bg-muted hover:bg-primary hover:text-primary-foreground">2ГИС</a>
          </div>
        </div>

        <div>
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Документы</h3>
          <div className="mt-4 flex flex-col gap-2 text-[14.5px] text-muted-foreground">
            <a className="border-none hover:text-accent" href="/privacy-policy">Политика конфиденциальности</a>
            <a className="border-none hover:text-accent" href="/user-agreement">Пользовательское соглашение</a>
            <a className="border-none hover:text-accent" href="/how-it-works">Как это работает</a>
            <a className="border-none hover:text-accent" href="/contact">Контакты</a>
          </div>
        </div>
      </div>

      <div className="container-page flex flex-wrap items-center justify-between gap-3 rounded-b-[26px] border border-t-0 border-border bg-card py-6 text-[13px] text-subtle">
        <div className="flex items-baseline gap-2 text-foreground">
          <span className="text-[15px] font-bold tracking-[-0.03em]">Playback</span>
          <span className="text-[15px] font-light text-subtle">Rental</span>
        </div>
        <p>© {new Date().getFullYear()} Playback Rental</p>
      </div>
    </footer>
  )
}
