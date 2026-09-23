'use client'
import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

const TONE: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: 'var(--color-status-warn-bg)', color: 'var(--color-status-warn)', label: 'Ожидает звонка' },
  confirmed: { bg: 'var(--color-status-ok-bg)', color: 'var(--color-status-ok)', label: 'Подтверждён' },
  completed: { bg: 'var(--color-status-info-bg)', color: 'var(--color-status-info)', label: 'Завершён' },
  cancelled: { bg: 'var(--color-status-alert-bg)', color: 'var(--color-status-alert)', label: 'Отменён' },
}

export const OrderStatusCell: React.FC<DefaultCellComponentProps> = ({ cellData }) => {
  const status = String(cellData ?? '')
  const tone = TONE[status] ?? { bg: 'var(--color-muted)', color: 'var(--color-subtle)', label: status }

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
