import type { Metadata } from 'next'
import type React from 'react'
import { Suspense } from 'react'
import '../../styles/prototype.css'
import PrototypeHeader from '../../prototype/PrototypeHeader'
import PrototypeFooter from '../../prototype/PrototypeFooter'
import { getSiteSettings } from '../../lib/data/siteSettings'
import { SITE_NAME,siteOrigin } from '../../lib/seo'

export const metadata:Metadata={metadataBase:new URL(siteOrigin()),title:{template:`%s · ${SITE_NAME}`,default:SITE_NAME},description:'Прокат фото- и видеотехники.',openGraph:{siteName:SITE_NAME,type:'website',locale:'ru_RU'},twitter:{card:'summary'}}
export default async function RootLayout({children}:{children:React.ReactNode}){const s=await getSiteSettings();const open=s.businessHoursOpen??10,close=s.businessHoursClose??21;return <html lang="ru"><head><link rel="icon" href="/favicon.svg" type="image/svg+xml"/><link rel="preload" href="/fonts/golos-text-cyrillic.woff2" as="font" type="font/woff2" crossOrigin=""/></head><body><div className="pb-app"><Suspense fallback={null}><PrototypeHeader openHour={open} closeHour={close}/></Suspense><main>{children}</main><PrototypeFooter/></div></body></html>}