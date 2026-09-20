import Link from 'next/link'
import Image from 'next/image'
import { getAccessoryProducts,getProductById,getProducts } from '../lib/data/products'
import { getSiteSettings } from '../lib/data/siteSettings'
import { mediaUrl } from '../lib/mediaUrl'
import { formatCurrency } from '../lib/pricing'
import PrototypePurchasePanel from './PrototypePurchasePanel'
import PrototypeProductCard from './PrototypeProductCard'
import PrototypeAddButton from './PrototypeAddButton'

export default async function PrototypeProduct({id}:{id:number}){
 const product=await getProductById(id);if(!product)return null
 const images=(product.images||[]).map((img)=>mediaUrl(img)).filter((x):x is string=>Boolean(x));const main=images[0];const category=typeof product.category==='object'?product.category:undefined;const categoryId=category?.id??(typeof product.category==='number'?product.category:undefined)
 const [relatedResult,accessories,settings]=await Promise.all([getProducts({categoryId,limit:4}),getAccessoryProducts({excludeId:product.id,maxPrice:Math.max(1200,product.price*.4),limit:3}),getSiteSettings()]);const related=relatedResult.docs.filter(p=>p.id!==product.id).slice(0,3);const kit=product.kitItems||[]
 const inStock=Boolean(product.available)&&product.quantity>0
 return <div className="pb-page"><section className="pb-container pb-grid" style={{paddingTop:14,paddingBottom:80}}>
  <div className="pb-product-left">
   <div className="pb-media pb-product-hero">{main?<Image src={main} alt={product.title} fill sizes="(min-width:1021px) 58vw,92vw" style={{objectFit:'cover'}}/>:<div className="pb-image-placeholder" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.7"/><path d="m5 18 5-5 3.5 3 2.5-2.5 3 4.5"/></svg><span>{product.title}</span></div>}<div className="pb-product-tags" style={{left:14,right:14,top:14}}><span className="pb-tag">{product.tag||category?.name||'Техника'}</span><span className={`pb-tag ${inStock?'pb-tag-light':'pb-tag-red'}`}>{inStock?'В наличии':'Нет в наличии'}</span></div></div>
   {images.length>1&&<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>{images.slice(1,5).map(url=><div key={url} className="pb-media" style={{aspectRatio:'1',borderRadius:16}}><Image src={url} alt={product.title} fill sizes="20vw" style={{objectFit:'cover'}}/></div>)}</div>}
   <div className="pb-card pb-product-copy"><div className="pb-kicker"><Link href="/">Главная</Link> / <Link href="/catalog">Каталог</Link>{category?.slug&&<> / <Link href={`/catalog/${category.slug}`}>{category.name}</Link></>}</div><h1>{product.title}</h1>{product.subtitle&&<div style={{marginTop:10,fontSize:14,color:'var(--pb-sub)'}}>{product.subtitle}</div>}{product.description&&<p style={{margin:'20px 0 0',fontSize:16.5,lineHeight:1.5,color:'#2A2925',maxWidth:560}}>{product.description}</p>}</div>
   {kit.length>0&&<div className="pb-card" style={{padding:26}}><div className="pb-kicker">Что в комплекте</div><div style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{kit.map((k,i)=><div key={k.id??i} className="pb-kit-item" style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:14,background:'var(--pb-muted)'}}> <span style={{width:24,height:24,borderRadius:'50%',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10.5,fontWeight:700,color:'var(--pb-red)'}}>{i+1}</span><span style={{fontSize:14}}>{k.label}</span></div>)}</div></div>}
   {accessories.length>0&&<div className="pb-card" style={{padding:26}}><div className="pb-kicker">Совместимые аксессуары</div><div style={{marginTop:10}}>{accessories.map(a=><div key={a.id} className="pb-accessory-row" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,padding:14,borderRadius:14}}> <div><div style={{fontSize:15.5,fontWeight:500}}>{a.title}</div><div style={{marginTop:3,fontSize:12.5,color:'var(--pb-sub)'}}>{formatCurrency(a.price)}{a.listingType==='rental'?' / смена':''}</div></div><PrototypeAddButton product={{id:a.id,title:a.title,subtitle:a.subtitle,price:a.price,listingType:a.listingType,quantity:a.quantity,available:a.available,tag:a.tag,imageUrl:mediaUrl(a.images?.[0]),unit:a.listingType==='rental'?'смена':'шт.'}}/></div>)}</div></div>}
   {related.length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:14}}>{related.map((p,i)=><PrototypeProductCard key={p.id} delay={i*60} product={{id:p.id,title:p.title,subtitle:p.subtitle,price:p.price,listingType:p.listingType,quantity:p.quantity,available:p.available,tag:p.tag,imageUrl:mediaUrl(p.images?.[0]),unit:p.listingType==='rental'?'смена / 24 часа':'шт.'}}/>)}</div>}
  </div>
  <div className="pb-product-right"><div className="pb-sticky"><PrototypePurchasePanel product={product} imageUrl={main} openHour={settings.businessHoursOpen??10} closeHour={settings.businessHoursClose??21}/></div></div>
 </section></div>
}