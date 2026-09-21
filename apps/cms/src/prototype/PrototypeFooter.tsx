import Link from 'next/link'
import { getSiteSettings } from '../lib/data/siteSettings'

// The delivered design bundle has no footer at all (neither template.html nor
// markup.html contains one), so this is the app's own composition in the
// prototype's card language. The three columns are this branch's; the social
// icons, the map links and the copyright bar are carried over from the
// footer on `2.0` (apps/cms/src/components/Footer.tsx), which had them.
const VkIcon=()=><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.00053 5.5H5.50053C5.50053 13.5 10.0005 14.5 10.0005 14.5L10.0015 5.5H13.5015L13.4995 10.5C17.9995 8.5 18.4995 5.5 18.4995 5.5H21.9995C21.9995 5.5 20.9995 10 17.0926 12.1534C19.1115 13.3511 21.2684 15.3315 21.9995 18.5H18.4995C18.4995 18.5 17.4995 15.5 13.4995 14L13.5015 18.5C1.88755 18.5 2.00232 7.5 2.00053 5.5Z"/></svg>
const TelegramIcon=()=><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.62 7.63c-.12.55-.44.68-.9.42l-2.5-1.84-1.2 1.16c-.13.13-.25.25-.5.25l.18-2.55 4.63-4.19c.2-.18-.05-.28-.31-.1l-5.73 3.6-2.47-.77c-.54-.17-.55-.54.11-.8l9.66-3.72c.45-.17.84.1.65.91z"/></svg>

export default async function PrototypeFooter(){
 const s=await getSiteSettings()
 const phone=s.contactPhone||'+7 (996) 527-0026'
 const email=s.contactEmail||'PlaybackRental@yandex.ru'
 const vkUrl=s.contactVkUrl||'https://vk.com/playbackrental'
 const telegramUrl=s.contactTelegramUrl||'https://t.me/Playbackrental_admin'
 const yandexMapsUrl=s.yandexMapsUrl||'https://yandex.ru/maps/-/CHvDmII7'
 const twoGisUrl=s.twoGisUrl||'https://go.2gis.com/2y9MJ'
 return <footer className="pb-footer pb-container">
  <div className="pb-card pb-footer-inner">
   <div>
    <div className="pb-kicker">Контакты</div>
    <a href={`tel:${phone.replace(/[^\d+]/g,'')}`}>{phone}</a>
    <a href={`mailto:${email}`}>{email}</a>
    <div className="pb-social">
     <a href={vkUrl} target="_blank" rel="noopener noreferrer" aria-label="ВКонтакте"><VkIcon/></a>
     <a href={telegramUrl} target="_blank" rel="noopener noreferrer" aria-label="Telegram"><TelegramIcon/></a>
    </div>
   </div>
   <div>
    <div className="pb-kicker">Адрес</div>
    <p style={{color:'var(--pb-copy)'}}>{s.contactAddress||'г. Кемерово, ул. Демьяна Бедного, 6'}</p>
    <p style={{color:'var(--pb-sub)'}}>{s.contactHours||'10:00 — 21:00'}</p>
    <div className="pb-map-links">
     <a href={yandexMapsUrl} target="_blank" rel="noopener noreferrer" className="pill">Я.Карты</a>
     <a href={twoGisUrl} target="_blank" rel="noopener noreferrer" className="pill">2ГИС</a>
    </div>
   </div>
   <div>
    <div className="pb-kicker">Документы</div>
    <Link href="/how-it-works">Условия проката</Link>
    <Link href="/privacy-policy">Политика конфиденциальности</Link>
    <Link href="/user-agreement">Пользовательское соглашение</Link>
    <Link href="/contact">Контакты</Link>
   </div>
  </div>
  <div className="pb-card pb-footer-bottom">
   <span className="pb-wordmark"><strong>Playback</strong> <span>Rental</span></span>
   <p>© {new Date().getFullYear()} Playback Rental</p>
  </div>
 </footer>
}
