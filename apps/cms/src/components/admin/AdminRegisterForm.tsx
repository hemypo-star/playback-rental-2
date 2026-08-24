'use client'

// Ported from the inline <script> in apps/web/src/pages/admin/first-
// register.astro (docs/PLAN-next-migration.md Stage 3.5, page group 1).
import { useState } from 'react'

export default function AdminRegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/users/first-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        // A full navigation, not router.push() — matches the Astro
        // source's intent: this just established a brand-new session
        // cookie, so the next page load should be a clean one rather than
        // a client-side transition that might carry over stale RSC/client
        // state from the pre-auth render.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = '/admin'
        return
      }
      const body = await res.json().catch(() => null)
      setError(body?.errors?.[0]?.message || 'Не удалось создать администратора')
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
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none transition-[border-color,background-color] duration-240 ease-expo focus:border-foreground focus:bg-white"
        />
      </div>

      {error && <p className="text-[13px] text-accent">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary mt-1 justify-center">
        {submitting ? 'Создаём…' : 'Создать и войти'}
      </button>
    </form>
  )
}
