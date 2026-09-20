'use client'

import { useMemo, useRef, useState } from 'react'
import { useStore } from '@nanostores/react'
import { $selectedDates, setSelectedDates } from '../stores/dates'
import { isBeforeBusinessToday } from '../lib/rental/businessDay'
import type { RentalAvailability } from '../lib/rentalAvailability'
import PrototypeDatePicker,{type PrototypeDatePickerHandle} from './PrototypeDatePicker'

function startOfMonth(d:Date){return new Date(d.getFullYear(),d.getMonth(),1)}
function sameDay(a:Date|null,b:Date|null){return Boolean(a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate())}
function inRange(day:Date,start:Date|null,end:Date|null){if(!start||!end)return false;const x=new Date(day.getFullYear(),day.getMonth(),day.getDate()).getTime();const a=new Date(start.getFullYear(),start.getMonth(),start.getDate()).getTime();const b=new Date(end.getFullYear(),end.getMonth(),end.getDate()).getTime();return x>=a&&x<=b}
function withHour(day:Date,hour:number){const d=new Date(day);d.setHours(hour,0,0,0);return d}
// Same day-granular overlap rule as the old AvailabilityCalendar
// (components/ProductPurchasePanel.tsx's isBusy): a calendar day counts as
// busy when any booked range touches its local [00:00,24:00) window.
function isBusyDay(day:Date,bookedRanges?:RentalAvailability['bookedRanges']){if(!bookedRanges)return false;const dayStart=new Date(day.getFullYear(),day.getMonth(),day.getDate()).getTime();const dayEnd=dayStart+86400000;return bookedRanges.some(r=>new Date(r.startDate).getTime()<dayEnd&&new Date(r.endDate).getTime()>dayStart)}

export default function PrototypeInlineRentalCalendar({openHour,closeHour,bookedRanges}:{openHour:number;closeHour:number;bookedRanges?:RentalAvailability['bookedRanges']}){
 const selected=useStore($selectedDates)
 const pickerRef=useRef<PrototypeDatePickerHandle>(null)
 const [month,setMonth]=useState(()=>startOfMonth(selected.startDate||new Date()))
 const cells=useMemo(()=>{const first=startOfMonth(month);const count=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();let weekday=first.getDay();weekday=weekday===0?7:weekday;const out:(Date|null)[]=[];for(let i=1;i<weekday;i++)out.push(null);for(let d=1;d<=count;d++)out.push(new Date(first.getFullYear(),first.getMonth(),d));return out},[month])
 const choose=(day:Date)=>{
  // Mirrors PrototypeDatePicker's own guard (isBeforeBusinessToday) plus the
  // new busy-day check — belt-and-suspenders with the buttons' own
  // `disabled`, same as PrototypeDatePicker.choose()'s precedent.
  if(isBeforeBusinessToday(day)||isBusyDay(day,bookedRanges))return
  const start=selected.startDate,end=selected.endDate
  if(!start||end||day.getTime()<=start.getTime()){setSelectedDates(withHour(day,openHour),null);return}
  setSelectedDates(start,withHour(day,closeHour))
 }
 const prev=()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))
 const next=()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))
 const dateLabel=(d:Date|null)=>d?d.toLocaleDateString('ru-RU',{day:'numeric',month:'long'}):'Не выбрано'
 const timeLabel=(d:Date|null,fallback:number)=>`${String(d?.getHours()??fallback).padStart(2,'0')}:00`
 return <div className="pb-inline-calendar">
  <div className="pb-inline-calendar-head"><span className="pb-kicker">Занятость · {month.toLocaleDateString('ru-RU',{month:'long'})}</span><span className="pb-inline-calendar-nav"><button type="button" onClick={prev}>←</button><button type="button" onClick={next}>→</button></span></div>
  <div className="pb-inline-weekdays"><span>ПН</span><span>ВТ</span><span>СР</span><span>ЧТ</span><span>ПТ</span><span>СБ</span><span>ВС</span></div>
  <div className="pb-inline-days">{cells.map((day,index)=>{if(!day)return <span key={index}/>;const busy=isBusyDay(day,bookedRanges),past=isBeforeBusinessToday(day);return <button key={index} type="button" className="pb-inline-day" disabled={busy||past} data-busy={busy} data-edge={sameDay(day,selected.startDate)||sameDay(day,selected.endDate)} data-range={inRange(day,selected.startDate,selected.endDate)} onClick={()=>choose(day)}>{day.getDate()}</button>})}</div>
  <div className="pb-inline-legend"><span><i className="pb-legend-selected"/>Ваши даты</span><span><i className="pb-legend-busy"/>Занято</span></div>
  <div className="pb-product-date-cards">
   <button type="button" onClick={()=>pickerRef.current?.open('from')}><span>Выдача</span><strong>{dateLabel(selected.startDate)}</strong><em>{timeLabel(selected.startDate,openHour)}</em></button>
   <button type="button" onClick={()=>pickerRef.current?.open('to')}><span>Возврат</span><strong>{dateLabel(selected.endDate)}</strong><em>{timeLabel(selected.endDate,closeHour)}</em></button>
  </div>
  <PrototypeDatePicker ref={pickerRef} variant="hidden" openHour={openHour} closeHour={closeHour}/>
 </div>
}
