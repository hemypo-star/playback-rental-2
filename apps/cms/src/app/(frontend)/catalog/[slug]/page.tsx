import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import PrototypeCatalog from '../../../../prototype/PrototypeCatalog'
import { getCategoryBySlug } from '../../../../lib/data/categories'
import { mediaUrl } from '../../../../lib/mediaUrl'
import { buildMetadata } from '../../../../lib/seo'
import { parseDateParam,parsePageParam } from '../../../../lib/catalogQuery'
export const dynamic='force-dynamic'
interface Props{params:Promise<{slug:string}>;searchParams:Promise<{q?:string;sort?:string;free?:string;from?:string;to?:string;page?:string}>}
export async function generateMetadata({params}:Props):Promise<Metadata>{const{slug}=await params;const c=await getCategoryBySlug(slug);return c?buildMetadata({title:c.name,description:c.description??undefined,path:`/catalog/${slug}`,image:mediaUrl(c.image)}):buildMetadata({title:'Каталог',path:`/catalog/${slug}`})}
export default async function CategoryPage({params,searchParams}:Props){const{slug}=await params;const c=await getCategoryBySlug(slug);if(!c)redirect('/catalog');const{q,sort,free,from,to,page}=await searchParams;return <PrototypeCatalog activeCategory={c} searchQuery={q} sort={sort} freeOnly={free==='1'} from={parseDateParam(from)} to={parseDateParam(to)} page={parsePageParam(page)}/>} 