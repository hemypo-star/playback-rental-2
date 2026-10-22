'use client'

// Ported from apps/web/src/components/ContactForm.tsx (docs/PLAN-next-
// migration.md Stage 2). apps/web's version called sendContactNotification()
// from lib/payload.ts, a REST wrapper hitting Payload's own /api over the
// (then cross-origin, pre-Stage-1-proxy-flip) network. Here /api is native
// to this app ((payload) route group) so this fetches
// /api/contact-notification directly — the same endpoint
// (apps/cms/src/endpoints/contactNotification.ts), no wrapper needed.
import { useState } from 'react'
import Link from 'next/link'
// A2 (design_handoff_swiss_bento/08-instruction.md) — the rate-limit Russian
// text is reused from the single checkout translation point rather than
// re-derived here, even though this form isn't part of checkout: one place
// owns that wording so it can't drift between the two surfaces that show it.
import { translateCheckoutError } from '../lib/checkoutErrors'

const NAME_RE = /^[A-Za-zА-Яа-яЁё\s-]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RATE_LIMITED_MESSAGE = translateCheckoutError({ code: 'RATE_LIMITED' }).message

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [rateLimited, setRateLimited] = useState(false)
  // The form collects name, phone and email, so it needs the same separate
  // personal-data consent as checkout (152-FZ art. 9).
  const [agreeData, setAgreeData] = useState(false)
  const [agreePolicy, setAgreePolicy] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Введите имя'
    else if (!NAME_RE.test(form.name.trim())) errs.name = 'Имя может содержать только буквы'
    if (!form.email.trim()) errs.email = 'Введите email'
    else if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Введите корректный email'
    if (!form.phone.trim()) errs.phone = 'Введите телефон'
    if (!form.message.trim()) errs.message = 'Введите сообщение'
    if (!agreeData) errs.agreeData = 'Подтвердите согласие на обработку персональных данных'
    if (!agreePolicy) errs.agreePolicy = 'Подтвердите, что ознакомились с политикой конфиденциальности'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setStatus('sending')
    setRateLimited(false)
    try {
      const res = await fetch('/api/contact-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, agreeData, agreePolicy }),
      })
      const result = (await res.json()) as { success: boolean; code?: string }
      if (result.success) {
        setStatus('sent')
        setForm({ name: '', email: '', phone: '', subject: '', message: '' })
        setAgreeData(false)
        setAgreePolicy(false)
      } else {
        setRateLimited(result.code === 'RATE_LIMITED')
        setStatus('failed')
      }
    } catch {
      setStatus('failed')
    }
  }

  // Laid out in the storefront's pb-* vocabulary (the same field, consent and
  // submit styles as checkout); the contact page wraps it in its own card.
  return (
    <div>
      <div className="pb-kicker">Обратная связь</div>
      <h2 className="pb-h2" style={{ fontSize: 'clamp(24px,2.4vw,32px)' }}>Напишите нам</h2>

      {status === 'sent' && (
        <div className="pb-form-status" data-tone="ok" role="status">Сообщение отправлено&nbsp;— мы&nbsp;свяжемся с&nbsp;вами в&nbsp;ближайшее время.</div>
      )}
      {status === 'failed' && (
        <div className="pb-form-status" data-tone="error" role="alert">
          {rateLimited ? RATE_LIMITED_MESSAGE : 'Не удалось отправить сообщение. Попробуйте ещё раз или напишите на почту.'}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="pb-fields" style={{ marginTop: 18 }}>
          <label className="pb-field">
            <span>Имя</span>
            <input value={form.name} onChange={set('name')} autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'cf-name-error' : undefined} />
            {errors.name && <em id="cf-name-error" className="pb-field-error">{errors.name}</em>}
          </label>
          <label className="pb-field">
            <span>Телефон</span>
            <input value={form.phone} onChange={set('phone')} placeholder="+7 (___) ___-__-__" autoComplete="tel" inputMode="tel" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'cf-phone-error' : undefined} />
            {errors.phone && <em id="cf-phone-error" className="pb-field-error">{errors.phone}</em>}
          </label>
          <label className="pb-field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={set('email')} autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'cf-email-error' : undefined} />
            {errors.email && <em id="cf-email-error" className="pb-field-error">{errors.email}</em>}
          </label>
          <label className="pb-field">
            <span>Тема&nbsp;— необязательно</span>
            <input value={form.subject} onChange={set('subject')} />
          </label>
        </div>
        <label className="pb-field" style={{ display: 'block', marginTop: 14 }}>
          <span>Сообщение</span>
          <textarea rows={4} value={form.message} onChange={set('message')} aria-invalid={!!errors.message} aria-describedby={errors.message ? 'cf-message-error' : undefined} />
          {errors.message && <em id="cf-message-error" className="pb-field-error">{errors.message}</em>}
        </label>

        <label className="pb-consent" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={agreeData} onChange={(e) => setAgreeData(e.target.checked)} aria-invalid={!!errors.agreeData} aria-describedby={errors.agreeData ? 'cf-consent-error' : undefined} />
          <span style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--pb-copy)' }}>
            Даю{' '}
            <Link href="/personal-data-consent" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>
              согласие на&nbsp;обработку персональных данных
            </Link>
          </span>
        </label>
        {errors.agreeData && <em id="cf-consent-error" className="pb-field-error">{errors.agreeData}</em>}

        <label className="pb-consent" style={{ marginTop: 4 }}>
          <input type="checkbox" checked={agreePolicy} onChange={(e) => setAgreePolicy(e.target.checked)} aria-invalid={!!errors.agreePolicy} aria-describedby={errors.agreePolicy ? 'cf-policy-error' : undefined} />
          <span style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--pb-copy)' }}>
            Ознакомлен (а) с{' '}
            <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>
              политикой конфиденциальности
            </Link>
          </span>
        </label>
        {errors.agreePolicy && <em id="cf-policy-error" className="pb-field-error">{errors.agreePolicy}</em>}

        <button type="submit" disabled={status === 'sending'} className="pb-submit">
          {status === 'sending' ? 'Отправляем…' : 'Отправить'}
        </button>
      </form>
    </div>
  )
}
