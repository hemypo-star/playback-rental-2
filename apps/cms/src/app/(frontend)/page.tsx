import type { Metadata } from 'next'
import PrototypeHome from '../../prototype/PrototypeHome'
import { buildMetadata } from '../../lib/seo'
export const metadata:Metadata=buildMetadata({title:'Прокат фото- и видеотехники',path:'/'})
export const dynamic='force-dynamic'
export default function HomePage(){return <PrototypeHome/>}