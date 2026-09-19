'use client'
import { useEffect,useState } from 'react'
import { useStore } from '@nanostores/react'
import { $selectedDates } from '../stores/dates'

const month = new Intl.DateTimeFormat('ru-RU',{month:'long'})

export default function PrototypeCatalogResultLabel({count}:{count:number}){
  const selected=useStore($selectedDates)
  const[hydrated,setHydrated]=useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>setHydrated(true),[])
  if(!hydrated||!selected.startDate||!selected.endDate)return <>{count} позиций</>
  const from=selected.startDate
  const to=selected.endDate
  const sameMonth=from.getMonth()===to.getMonth()&&from.getFullYear()===to.getFullYear()
  const label=sameMonth
    ? `${from.getDate()} — ${to.getDate()} ${month.format(to)}`
    : `${from.toLocaleDateString('ru-RU',{day:'numeric',month:'long'})} — ${to.toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}`
  return <>{count} позиций на {label}</>
}
