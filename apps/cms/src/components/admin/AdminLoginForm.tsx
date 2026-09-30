'use client'

// Ported from the inline <script> in apps/web/src/pages/admin/login.astro
// (docs/PLAN-next-migration.md Stage 3.5, page group 1) — same
// fetch('/api/users/login') call, now same-origin natively rather than via
// apps/web's own proxy.
import { useState } from 'react'

export default function AdminLoginForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        window.location.href = nextPath
        return
      }
      const body = await res.json().catch(() => null)
      setError(body?.errors?.[0]?.message || 'Неверный email или пароль')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none transition-[border-color,background-color] duration-240 ease-expo focus:border-foreground focus:bg-white"
        />
      </div>
      <div>
        <label htmlFor="password" className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Пароль</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none transition-[border-color,background-color] duration-240 ease-expo focus:border-foreground focus:bg-white"
        />
      </div>

      {error && <p className="text-[13px] text-accent">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary mt-1 justify-center">
        {submitting ? 'Входим…' : 'Войти'}
      </button>
    </form>
  )
}
