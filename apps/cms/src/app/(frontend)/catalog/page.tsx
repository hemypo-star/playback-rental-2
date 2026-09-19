import type { Metadata } from 'next'
import PrototypeCatalog from '../../../prototype/PrototypeCatalog'
import { buildMetadata } from '../../../lib/seo'
import { parsePageParam } from '../../../lib/catalogQuery'
export const metadata:Metadata=buildMetadata({title:'Каталог техники',path:'/catalog'})
export const dynamic='force-dynamic'
export default async function CatalogIndexPage({searchParams}:{searchParams:Promise<{q?:string;sort?:string;type?:string;free?:string;page?:string}>}){const{q,sort,type,free,page}=await searchParams;return <PrototypeCatalog searchQuery={q} sort={sort} kitOnly={type==='kit'} freeOnly={free==='1'} page={parsePageParam(page)}/>} 