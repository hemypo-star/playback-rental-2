import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import PrototypeCatalog from '../../../prototype/PrototypeCatalog'
import { buildMetadata } from '../../../lib/seo'
import { parseDateParam,parsePageParam } from '../../../lib/catalogQuery'
export const metadata:Metadata=buildMetadata({title:'Каталог техники',path:'/catalog'})
export const dynamic='force-dynamic'
// Global search lives in the header and its own /search page now — a stale
// ?q= link (bookmarks, old shared URLs) redirects there instead of silently
// rendering an unfiltered catalog.
export default async function CatalogIndexPage({searchParams}:{searchParams:Promise<{q?:string;sort?:string;type?:string;free?:string;from?:string;to?:string;page?:string}>}){const{q,sort,type,free,from,to,page}=await searchParams;if(q)redirect(`/search?q=${encodeURIComponent(q)}`);return <PrototypeCatalog sort={sort} kitOnly={type==='kit'} freeOnly={free==='1'} from={parseDateParam(from)} to={parseDateParam(to)} page={parsePageParam(page)}/>} 