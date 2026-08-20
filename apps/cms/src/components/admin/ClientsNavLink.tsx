import React from 'react'
import Link from 'next/link'

export const ClientsNavLink: React.FC = () => (
  <Link
    href="/cms/clients"
    className="nav__link"
    style={{ display: 'flex', alignItems: 'center', padding: '8px 0' }}
  >
    Клиенты
  </Link>
)
