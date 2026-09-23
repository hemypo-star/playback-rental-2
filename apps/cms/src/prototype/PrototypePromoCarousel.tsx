'use client'
import Image from 'next/image'
import { useEffect,useState } from 'react'
export interface PrototypePromo{ id:number;title:string;kicker?:string;text?:string;imageUrl?:string;linkUrl?:string }
export default function PrototypePromoCarousel({promos}:{promos:PrototypePromo[]}){
 const[index,setIndex]=useState(0)
 // 03-motion.md: autoplay stops on hover over the block, under
 // prefers-reduced-motion, and permanently after the first manual arrow click.
 // None of the three were implemented — the interval ran unconditionally.
 const[stopped,setStopped]=useState(false),[hovered,setHovered]=useState(false),[reduced,setReduced]=useState(false)
 useEffect(()=>{
  // Read in an effect rather than at render: matchMedia is browser-only, and
  // the server has no value to agree with. Subscribed, not sampled once, so
  // turning the OS setting on stops a carousel that is already running.
  const mq=window.matchMedia('(prefers-reduced-motion: reduce)')
  const sync=()=>setReduced(mq.matches)
  sync();mq.addEventListener('change',sync)
  return()=>mq.removeEventListener('change',sync)
 },[])
 useEffect(()=>{
  if(promos.length<2||stopped||hovered||reduced)return
  const t=setInterval(()=>setIndex(i=>(i+1)%promos.length),9000)
  return()=>clearInterval(t)
 },[promos.length,stopped,hovered,reduced])
 // Taking control stops autoplay permanently, per the spec — a visitor who
 // has started steering does not get the carousel taken back off them. The
 // spec names the arrows; the dots below are the same act, so they stop it too.
 const goTo=(next:number)=>{setStopped(true);setIndex(((next%promos.length)+promos.length)%promos.length)}
 if(!promos.length)return null;const active=promos[index];return <>
 <div className="pb-section-head"><div><div className="pb-kicker">Акции</div><h2 className="pb-h2">Что выгодно прямо сейчас</h2></div>{promos.length>1&&<div style={{display:'flex',alignItems:'center',gap:12}}><span style={{fontSize:11,fontWeight:600,letterSpacing:'.14em',color:'var(--pb-sub)'}}>{String(index+1).padStart(2,'0')} / {String(promos.length).padStart(2,'0')}</span><button className="pb-promo-nav pb-promo-nav-prev" aria-label="Предыдущая акция" onClick={()=>goTo(index-1)}>←</button><button className="pb-promo-nav pb-promo-nav-next" aria-label="Следующая акция" onClick={()=>goTo(index+1)}>→</button></div>}</div>
 <div className="pb-section-grid" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
  <a href={active.linkUrl||'#'} style={{gridColumn:'span 8',position:'relative',height:470,borderRadius:26,overflow:'hidden',border:'1px solid var(--pb-border)',background:'#E6E4E0'}}>
   {promos.map((p,i)=><div key={p.id} style={{position:'absolute',inset:0,opacity:i===index?1:0,transform:i===index?'none':'scale(1.02)',transition:'opacity 900ms cubic-bezier(.45,0,.15,1),transform 1200ms cubic-bezier(.45,0,.15,1)',zIndex:i===index?2:1}}>{p.imageUrl&&<Image src={p.imageUrl} alt={p.title} fill sizes="70vw" style={{objectFit:'cover'}}/>}</div>)}
   <div style={{position:'absolute',inset:0,zIndex:3,background:'linear-gradient(95deg,rgba(10,10,10,.86) 0%,rgba(10,10,10,.52) 54%,rgba(10,10,10,.08) 100%)'}}/>
   <div key={active.id} style={{position:'absolute',inset:0,zIndex:4,padding:30,display:'flex',flexDirection:'column',justifyContent:'space-between',color:'#fff'}}><span className="pb-promo-copy-kicker" style={{alignSelf:'flex-start',padding:'7px 13px',borderRadius:999,background:'rgba(255,255,255,.16)',fontSize:10,fontWeight:600,letterSpacing:'.16em',textTransform:'uppercase'}}>{active.kicker||'Акция'}</span><div><div className="pb-promo-copy-title" style={{fontSize:'clamp(28px,3.4vw,48px)',fontWeight:500,letterSpacing:'-.04em',lineHeight:1.02,maxWidth:'13ch'}}>{active.title}</div>{active.text&&<div className="pb-promo-copy-text" style={{marginTop:14,fontSize:14,lineHeight:1.5,color:'rgba(255,255,255,.78)',maxWidth:380}}>{active.text}</div>}</div></div>
  </a>
  <div className="pb-card" style={{gridColumn:'span 4',borderRadius:26,padding:14,display:'flex',flexDirection:'column',gap:4}}>{promos.map((p,i)=><button key={p.id} type="button" className="pb-promo-row" onClick={()=>goTo(i)} style={{position:'relative',overflow:'hidden',flex:1,padding:'16px 18px',border:0,borderRadius:18,cursor:'pointer',display:'flex',alignItems:'center',gap:14,textAlign:'left',background:i===index?'#0A0A0A':'#F9F8F7',color:i===index?'#fff':'#0A0A0A'}}> <span style={{fontSize:10,fontWeight:600,letterSpacing:'.14em',opacity:.5}}>{String(i+1).padStart(2,'0')}</span><div><div style={{fontSize:9.5,fontWeight:600,letterSpacing:'.15em',textTransform:'uppercase',opacity:.6}}>{p.kicker||'Акция'}</div><div style={{marginTop:6,fontSize:16,fontWeight:500,lineHeight:1.25}}>{p.title}</div></div>{i===index&&<span key={`${p.id}-${index}`} className="pb-promo-bar" style={{position:'absolute',left:18,bottom:12,height:2,width:'calc(100% - 36px)',borderRadius:999,background:'rgba(255,255,255,.45)'}}/>}</button>)}</div>
 </div>
 </>}