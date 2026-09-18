'use client'

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useStore } from '@nanostores/react'
import { $selectedDates, OPEN_DATE_PICKER_EVENT, setSelectedDates } from '../stores/dates'

export interface PrototypeDatePickerHandle { open: (target?: 'from' | 'to') => void }
interface Props { variant?: 'navbar' | 'compact' | 'hero'; openHour: number; closeHour: number }

function startOfMonth(d: Date){ return new Date(d.getFullYear(), d.getMonth(), 1) }
function addMonths(d: Date,n:number){ return new Date(d.getFullYear(), d.getMonth()+n,1) }
function sameDay(a:Date|null,b:Date|null){ return Boolean(a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()) }
function fmtDay(d:Date|null){ return d ? d.toLocaleDateString('ru-RU',{day:'numeric',month:'long'}) : 'Не выбрано' }
function fmtRange(a:Date|null,b:Date|null){ if(!a||!b) return 'Выбрать даты'; const am=a.toLocaleDateString('ru-RU',{day:'numeric'}); const bm=b.toLocaleDateString('ru-RU',{day:'numeric',month:'short'}).replace('.',''); return `${am} — ${bm}` }
function timeOf(d:Date|null,fallback:number){ return d ? `${String(d.getHours()).padStart(2,'0')}:00` : `${String(fallback).padStart(2,'0')}:00` }
function withHour(d:Date|null,h:number){ if(!d) return null; const x=new Date(d);x.setHours(h,0,0,0);return x }

const PrototypeDatePicker = forwardRef<PrototypeDatePickerHandle,Props>(function PrototypeDatePicker({variant='navbar',openHour,closeHour},ref){
  const selected=useStore($selectedDates)
  const [open,setOpen]=useState(false)
  const [target,setTarget]=useState<'from'|'to'>('from')
  const [month,setMonth]=useState(()=>startOfMonth(selected.startDate || new Date()))
  const [from,setFrom]=useState<Date|null>(selected.startDate)
  const [to,setTo]=useState<Date|null>(selected.endDate)
  const [fromHour,setFromHour]=useState(()=>selected.startDate?.getHours() ?? openHour)
  const [toHour,setToHour]=useState(()=>selected.endDate?.getHours() ?? closeHour)

  const show=(next:'from'|'to'='from')=>{setFrom(selected.startDate);setTo(selected.endDate);setFromHour(selected.startDate?.getHours()??openHour);setToHour(selected.endDate?.getHours()??closeHour);setTarget(next);setOpen(true)}
  useImperativeHandle(ref,()=>({open:show}))
  useEffect(()=>{const fn=()=>show('from');window.addEventListener(OPEN_DATE_PICKER_EVENT,fn);return()=>window.removeEventListener(OPEN_DATE_PICKER_EVENT,fn)},[selected.startDate,selected.endDate,openHour,closeHour])

  const cells=useMemo(()=>{const first=startOfMonth(month);const days=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();let weekday=first.getDay();weekday=weekday===0?7:weekday;const out:(Date|null)[]=[];for(let i=1;i<weekday;i++)out.push(null);for(let d=1;d<=days;d++)out.push(new Date(first.getFullYear(),first.getMonth(),d));return out},[month])
  const hours=useMemo(()=>{const out:number[]=[];for(let h=Math.max(0,openHour-1);h<=Math.min(23,closeHour+1);h++)out.push(h);return out},[openHour,closeHour])
  const choose=(d:Date)=>{if(target==='from'){setFrom(d);if(to && d>=to)setTo(null);setTarget('to')}else{if(from && d<from){setFrom(d);setTo(null);setTarget('to')}else setTo(d)}}
  const done=()=>{if(from&&to){setSelectedDates(withHour(from,fromHour),withHour(to,toHour))}setOpen(false)}
  const days=Math.max(1,from&&to?Math.ceil((to.getTime()-from.getTime())/86400000)+1:1)
  const label=fmtRange(selected.startDate,selected.endDate)
  const activeHour=target==='from'?fromHour:toHour

  const trigger = variant==='hero' ? (
    <button type="button" className="pb-date-card pb-card" onClick={()=>show('from')} style={{width:'100%',textAlign:'left'}}>
      <div className="pb-date-line"><span className="pb-kicker">Даты аренды</span><span className="pb-kicker pb-red">Изменить</span></div>
      <div className="pb-date-line" style={{marginTop:12}}><span className="pb-date-value">{label}</span><span style={{fontSize:13,color:'var(--pb-sub)'}}>{timeOf(selected.startDate,openHour)} — {timeOf(selected.endDate,closeHour)}</span></div>
      <div style={{marginTop:10,fontSize:12.5,color:'var(--pb-sub)'}}>{selected.startDate&&selected.endDate?`${days} ${days===1?'смена':days<5?'смены':'смен'}`:'Выберите период аренды'}</div>
    </button>
  ) : (
    <button type="button" className="pb-pill pb-header-date" onClick={()=>show('from')}><span>{variant==='compact'&&selected.startDate&&selected.endDate?`${label} · ${timeOf(selected.startDate,openHour)}—${timeOf(selected.endDate,closeHour)}`:label}</span></button>
  )

  return <>
    {trigger}
    {open&&<div className="pb-modal-backdrop" role="dialog" aria-modal="true" aria-label="Период аренды">
      <button type="button" aria-label="Закрыть" onClick={()=>setOpen(false)} style={{position:'absolute',inset:0,border:0,background:'transparent'}} />
      <div className="pb-modal">
        <div className="pb-modal-head"><div><div className="pb-kicker">Период аренды</div><div style={{marginTop:6,fontSize:22,fontWeight:500,letterSpacing:'-.03em'}}>{target==='from'?'День и время выдачи':'День и время возврата'}</div></div><button type="button" className="pb-modal-close" onClick={()=>setOpen(false)}>✕</button></div>
        <div className="pb-modal-tabs">
          <button type="button" className="pb-modal-tab" data-active={target==='from'} onClick={()=>setTarget('from')}><div className="pb-kicker" style={{color:'inherit',opacity:.62}}>Выдача</div><div style={{marginTop:6,fontSize:16,fontWeight:500}}>{fmtDay(from)} · {String(fromHour).padStart(2,'0')}:00</div></button>
          <button type="button" className="pb-modal-tab" data-active={target==='to'} onClick={()=>setTarget('to')}><div className="pb-kicker" style={{color:'inherit',opacity:.62}}>Возврат</div><div style={{marginTop:6,fontSize:16,fontWeight:500}}>{fmtDay(to)} · {String(toHour).padStart(2,'0')}:00</div></button>
        </div>
        <div className="pb-picker-grid">
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><button type="button" className="pb-modal-close" onClick={()=>setMonth(addMonths(month,-1))}>←</button><div className="pb-kicker">{month.toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}</div><button type="button" className="pb-modal-close" onClick={()=>setMonth(addMonths(month,1))}>→</button></div>
            <div className="pb-weekdays"><span>ПН</span><span>ВТ</span><span>СР</span><span>ЧТ</span><span>ПТ</span><span>СБ</span><span>ВС</span></div>
            <div className="pb-days">{cells.map((d,i)=>d?<button key={i} type="button" className="pb-day" data-selected={sameDay(d,from)||sameDay(d,to)} onClick={()=>choose(d)}>{d.getDate()}</button>:<span key={i}/>)}</div>
          </div>
          <div><div className="pb-kicker">{target==='from'?'Время выдачи':'Время возврата'}</div><div className="pb-times">{hours.map(h=><button key={h} type="button" className="pb-time" data-active={h===activeHour} onClick={()=>target==='from'?setFromHour(h):setToHour(h)}>{String(h).padStart(2,'0')}:00</button>)}</div></div>
        </div>
        <div className="pb-modal-foot"><span style={{fontSize:12.5,color:'var(--pb-sub)',maxWidth:400}}>Рабочие часы {String(openHour).padStart(2,'0')}:00 — {String(closeHour).padStart(2,'0')}:00.</span><button type="button" className="pb-pill pb-btn" onClick={done} disabled={!from||!to}><span>Готово · {days} {days===1?'смена':days<5?'смены':'смен'}</span><span>→</span></button></div>
      </div>
    </div>}
  </>
})
export default PrototypeDatePicker