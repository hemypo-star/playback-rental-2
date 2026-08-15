'use client'
import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

const TONE: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: '#FFF2DE', color: '#9A6100', label: 'Ожидает звонка' },
  confirmed: { bg: '#E4F6E9', color: '#0B6B32', label: 'Подтверждён' },
  completed: { bg: '#E8EDFF', color: '#1F3FBF', label: 'Завершён' },
  cancelled: { bg: '#FFE9E4', color: '#B03017', label: 'Отменён' },
}

export const OrderStatusCell: React.FC<DefaultCellComponentProps> = ({ cellData }) => {
  const status = String(cellData ?? '')
  const tone = TONE[status] ?? { bg: '#F0F0F3', color: '#6E6E73', label: status }

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
