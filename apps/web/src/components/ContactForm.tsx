import { useState } from 'react'
import { sendContactNotification } from '../lib/payload'

const NAME_RE = /^[A-Za-zА-Яа-яЁё\s-]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

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
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setStatus('sending')
    try {
      const result = await sendContactNotification(form)
      if (result.success) {
        setStatus('sent')
        setForm({ name: '', email: '', phone: '', subject: '', message: '' })
      } else {
        setStatus('failed')
      }
    } catch {
      setStatus('failed')
    }
  }

  return (
    <div className="card-surface p-6">
      <h2 className="text-[17px] font-semibold">Напишите нам</h2>

      {status === 'sent' && (
        <div className="mt-4 rounded-xl bg-success-bg px-4 py-3 text-[13.5px] text-success">
          Сообщение отправлено — мы свяжемся с вами в ближайшее время.
        </div>
      )}
      {status === 'failed' && (
        <div className="mt-4 rounded-xl bg-danger-bg px-4 py-3 text-[13.5px] text-destructive">
          Не удалось отправить сообщение. Попробуйте ещё раз или напишите на почту.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12.5px] font-semibold text-subtle">Имя</span>
            <input value={form.name} onChange={set('name')} className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none transition-[border-color,background-color] duration-200 focus:border-foreground focus:bg-white" />
            {errors.name && <span className="mt-1 block text-[12px] text-destructive">{errors.name}</span>}
          </label>
          <label className="block">
            <span className="text-[12.5px] font-semibold text-subtle">Телефон</span>
            <input value={form.phone} onChange={set('phone')} placeholder="+7 (___) ___-__-__" className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none transition-[border-color,background-color] duration-200 focus:border-foreground focus:bg-white" />
            {errors.phone && <span className="mt-1 block text-[12px] text-destructive">{errors.phone}</span>}
          </label>
        </div>

        <label className="block">
          <span className="text-[12.5px] font-semibold text-subtle">Email</span>
          <input type="email" value={form.email} onChange={set('email')} className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none transition-[border-color,background-color] duration-200 focus:border-foreground focus:bg-white" />
          {errors.email && <span className="mt-1 block text-[12px] text-destructive">{errors.email}</span>}
        </label>

        <label className="block">
          <span className="text-[12.5px] font-semibold text-subtle">Тема (необязательно)</span>
          <input value={form.subject} onChange={set('subject')} className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none transition-[border-color,background-color] duration-200 focus:border-foreground focus:bg-white" />
        </label>

        <label className="block">
          <span className="text-[12.5px] font-semibold text-subtle">Сообщение</span>
          <textarea rows={4} value={form.message} onChange={set('message')} className="mt-1.5 w-full resize-y rounded-xl border border-input bg-muted-well px-3.5 py-2.5 text-[14px] outline-none transition-[border-color,background-color] duration-200 focus:border-foreground focus:bg-white" />
          {errors.message && <span className="mt-1 block text-[12px] text-destructive">{errors.message}</span>}
        </label>

        <button type="submit" disabled={status === 'sending'} className="btn-primary h-11 w-full text-[14px]">
          {status === 'sending' ? 'Отправляем…' : 'Отправить'}
        </button>
      </form>
    </div>
  )
}
