import React from 'react'
import Link from 'next/link'

export const CalendarNavLink: React.FC = () => (
  <Link
    href="/cms/calendar"
    className="nav__link"
    style={{ display: 'flex', alignItems: 'center', padding: '8px 0' }}
  >
    Календарь занятости
  </Link>
)
