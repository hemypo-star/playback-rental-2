import React from 'react'
import Link from 'next/link'

export const AnalyticsNavLink: React.FC = () => (
  <Link
    href="/cms/analytics"
    className="nav__link"
    style={{ display: 'flex', alignItems: 'center', padding: '8px 0' }}
  >
    Аналитика
  </Link>
)
