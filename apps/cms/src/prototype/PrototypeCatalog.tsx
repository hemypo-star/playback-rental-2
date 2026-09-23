import Link from 'next/link'
import type React from 'react'
import type { Category } from '../payload-types'
import { getCategories } from '../lib/data/categories'
import { getCategoryProductCounts,getProducts } from '../lib/data/products'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getFullyBookedProductIds } from '../lib/rental/bookedQuantity'
import { getSiteSettings } from '../lib/data/siteSettings'
import { buildCategoryTree,flattenCategoryTree,getSubtreeIds } from '../lib/categoryTree'
import { buildCatalogUrl } from '../lib/catalogQuery'
import { mediaUrl } from '../lib/mediaUrl'
import { categoryNameOf } from '../lib/productDisplay'
import PrototypeDatePicker from './PrototypeDatePicker'
import PrototypeProductCard from './PrototypeProductCard'
import PrototypeCatalogAvailability from './PrototypeCatalogAvailability'
import PrototypeCatalogResultLabel from './PrototypeCatalogResultLabel'
import PrototypeFreeToggle from './PrototypeFreeToggle'

const SORT_PARAM:Record<string,string>={pop:'-lastSyncedAt',asc:'price',desc:'-price'}
const PAGE_SIZE=24
export default async function PrototypeCatalog({activeCategory,searchQuery,sort='pop',kitOnly=false,freeOnly=false,from,to,page=1}:{activeCategory?:Category;searchQuery?:string;sort?:string;kitOnly?:boolean;freeOnly?:boolean;from?:Date;to?:Date;page?:number}){
 const categories=await getCategories();const activeIds=activeCategory?getSubtreeIds(activeCategory.id,categories):undefined;const currentPage=Number.isInteger(page)&&page>0?page:1
 // "Только свободные" means "free on the visitor's dates" when they have
 // picked any, and plain "in stock" when they have not. The date-aware half is
 // an id exclusion resolved here and applied inside the product query, so
 // productsResult.totalDocs/totalPages still describe exactly the grid below —
 // see lib/rental/bookedQuantity.ts for why it is derived from the bookings
 // rather than by filtering fetched products after the fact.
 const datedFilter=freeOnly&&from&&to
 const excludeIds=datedFilter?await getFullyBookedProductIds(await getPayload({config}),from,to):undefined
 const fromIso=datedFilter?from.toISOString():undefined,toIso=datedFilter?to.toISOString():undefined
 const [productsResult,directCounts,settings]=await Promise.all([getProducts({categoryIds:activeIds,search:searchQuery,isKit:kitOnly?true:undefined,inStockOnly:freeOnly,excludeIds,limit:PAGE_SIZE,page:currentPage,sort:SORT_PARAM[sort]??SORT_PARAM.pop}),getCategoryProductCounts(categories.map(c=>c.id)),getSiteSettings()])
 const counts=new Map(categories.map(c=>[c.id,getSubtreeIds(c.id,categories).reduce((n,id)=>n+(directCounts.get(id)||0),0)]));const total=[...directCounts.values()].reduce((a,b)=>a+b,0);const base=activeCategory?`/catalog/${activeCategory.slug}`:'/catalog'
 const linkFilters={q:searchQuery,sort,kit:kitOnly,free:freeOnly,from:fromIso,to:toIso}
 // docs/design-reference/hierarchical-categories.md: depth-first-flattened, sorted by each level's `order` — buildCategoryTree/flattenCategoryTree already do both, including degrading an unresolved parent to a root.
 const orderedCategories=flattenCategoryTree(buildCategoryTree(categories))
 const sortHref=(next:string)=>buildCatalogUrl(base,{...linkFilters,sort:next})
 const unitOf=(p:(typeof productsResult.docs)[number])=>{const categoryId=typeof p.category==='object'&&p.category?p.category.id:p.category;const slug=typeof p.category==='object'&&p.category?p.category.slug:categories.find(c=>c.id===categoryId)?.slug;if(p.isKit)return 'набор / сутки';if(slug==='film')return 'за плёнку';if(slug==='glasses')return 'сутки';return p.listingType==='rental'?'смена / 24 часа':'шт.'}
 return <div className="pb-page">
  <section className="pb-container pb-grid" style={{paddingTop:14}}><div className="pb-card pb-page-head"><div><div className="pb-kicker"><Link href="/" className="pb-link-hover">Главная</Link> / {kitOnly?'Наборы':'Каталог'}</div><h1 className="pb-h1" style={{marginTop:12}}>{kitOnly?'Наборы':activeCategory?.name||'Каталог'}</h1><div style={{marginTop:10,fontSize:13,color:'var(--pb-sub)'}}><PrototypeCatalogResultLabel count={productsResult.totalDocs} from={datedFilter?from:undefined} to={datedFilter?to:undefined}/></div></div><PrototypeDatePicker variant="compact" openHour={settings.businessHoursOpen??10} closeHour={settings.businessHoursClose??21}/></div></section>
  <section className="pb-container pb-grid" style={{paddingTop:14,paddingBottom:80,alignItems:'start'}}>
   <aside className="pb-aside"><div className="pb-card pb-filter pb-sticky"><div className="pb-kicker">Категория</div><div className="pb-filter-list"><Link href={buildCatalogUrl('/catalog',linkFilters)} className="pb-filter-link" data-active={!activeCategory}><span>Все позиции</span><span style={{fontSize:11,opacity:.55}}>{total}</span></Link>{orderedCategories.map(({category:c,depth})=>{const active=activeCategory?.id===c.id;return <Link key={c.id} href={buildCatalogUrl(`/catalog/${c.slug}`,linkFilters)} className="pb-filter-link" data-active={active} style={{paddingLeft:14+depth*14,['--pb-row-color' as string]:!active&&depth>0?'var(--pb-sub)':undefined} as React.CSSProperties}><span>{c.name}</span><span style={{fontSize:11,opacity:.55}}>{counts.get(c.id)||0}</span></Link>})}</div><div className="pb-kicker" style={{marginTop:24}}>Сортировка</div><div className="pb-filter-list"><Link href={sortHref('pop')} className="pb-filter-link" data-active={sort==='pop'}>По популярности</Link><Link href={sortHref('asc')} className="pb-filter-link" data-active={sort==='asc'}>Сначала дешевле</Link><Link href={sortHref('desc')} className="pb-filter-link" data-active={sort==='desc'}>Сначала дороже</Link></div><PrototypeFreeToggle href={buildCatalogUrl(base,{...linkFilters,free:!freeOnly})} active={freeOnly} from={fromIso} to={toIso}/><Link href="/catalog" className="pb-reset-link" style={{display:'block',marginTop:14,textAlign:'center',fontSize:11,fontWeight:600,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--pb-sub)'}}>Сбросить фильтры</Link></div></aside>
   <div className="pb-catalog-main"><PrototypeCatalogAvailability productIds={productsResult.docs.filter(p=>p.listingType==='rental').map(p=>p.id)}/><form method="GET" action={base} style={{marginBottom:14}}>{/* audit N8/C6: carry sort/kit/free through a search the same way buildCatalogUrl's own links do, so searching from within "Наборы" (or a free-only/sorted view) doesn't silently drop back to the plain catalog. No hidden `page` input — a new search lands on page 1, same reasoning as every other filter link built from buildCatalogUrl. */}<input type="search" name="q" defaultValue={searchQuery} aria-label="Поиск оборудования" placeholder="Поиск оборудования..." className="pb-search"/><input type="hidden" name="sort" value={sort}/>{kitOnly&&<input type="hidden" name="type" value="kit"/>}{freeOnly&&<input type="hidden" name="free" value="1"/>}{fromIso&&toIso&&<><input type="hidden" name="from" value={fromIso}/><input type="hidden" name="to" value={toIso}/></>}</form>{productsResult.totalDocs===0?<div className="pb-card" style={{marginTop:14,padding:'70px 24px',textAlign:'center'}}><strong style={{fontSize:17}}>Ничего не найдено</strong><p style={{color:'var(--pb-sub)'}}>Измените запрос или сбросьте фильтры.</p><Link href="/catalog" className="pb-pill pb-btn pb-btn-light" style={{height:42}}>Сбросить фильтры</Link></div>:<div className="pb-products">{productsResult.docs.map((p,i)=><PrototypeProductCard key={p.id} delay={i*45} product={{id:p.id,title:p.title,subtitle:p.subtitle,price:p.price,listingType:p.listingType,quantity:p.quantity,available:p.available,tag:p.tag,categoryName:categoryNameOf(p),imageUrl:mediaUrl(p.images?.[0]),unit:unitOf(p)}}/>)}</div>}
    {productsResult.totalPages>1&&<nav style={{marginTop:20,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}} aria-label="Страницы каталога">{productsResult.hasPrevPage?<Link className="pb-pill pb-btn pb-btn-light" style={{height:40}} href={buildCatalogUrl(base,{...linkFilters,page:currentPage-1})}>Назад</Link>:<span/>}<span style={{fontSize:12.5,color:'var(--pb-sub)'}}>Страница {currentPage} из {productsResult.totalPages}</span>{productsResult.hasNextPage?<Link className="pb-pill pb-btn pb-btn-light" style={{height:40}} href={buildCatalogUrl(base,{...linkFilters,page:currentPage+1})}>Далее</Link>:<span/>}</nav>}
   </div>
  </section>
 </div>
}