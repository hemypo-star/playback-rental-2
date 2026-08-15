'use client'
import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

// A `type: 'ui'` field's Cell — computed from sibling fields (quantity,
// available), not stored. Matches the design's Stock badge ("В наличии" /
// "Мало" / "Нет в наличии") over the real Products list, so the built-in
// search/sort/filter/pagination stay intact rather than being reimplemented
// in a bespoke static view.
export const StockStatusCell: React.FC<DefaultCellComponentProps> = ({ rowData }) => {
  const available = Boolean((rowData as any)?.available)
  const quantity = (rowData as any)?.quantity ?? 0

  let tone: { bg: string; color: string; label: string }
  if (!available || quantity === 0) {
    tone = { bg: '#FFE9E4', color: '#B03017', label: 'Нет в наличии' }
  } else if (quantity <= 2) {
    tone = { bg: '#FFF2DE', color: '#9A6100', label: 'Мало' }
  } else {
    tone = { bg: '#F0EFEC', color: '#0A0A0A', label: 'В наличии' }
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 8,
        background: tone.bg,
        color: tone.color,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {tone.label}
    </span>
  )
}
