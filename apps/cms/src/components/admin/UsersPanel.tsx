'use client'

// Ported from the inline <script> in apps/web/src/pages/admin/users.astro
// (docs/PLAN-next-migration.md Stage 3.4/3.5) — same create/delete/change-
// own-password behavior, as React state instead of raw DOM manipulation.
import { useState } from 'react'
import type { AdminUserRow } from '../../lib/admin/data/users'
import { createUser, deleteUser, changeOwnPassword } from '../../app/(admin)/admin/users/actions'

interface Props {
  users: AdminUserRow[]
  ownId: number
}

export default function UsersPanel({ users: initialUsers, ownId }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [ownPassword, setOwnPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [changing, setChanging] = useState(false)

  const handleCreate = async () => {
    setError(null)
    setSuccess(null)
    if (!newEmail.trim() || newPassword.length < 8) {
      setError('Укажите email и пароль от 8 символов')
      return
    }
    setCreating(true)
    const result = await createUser(newEmail.trim(), newPassword)
    setCreating(false)
    if (!result.success) {
      setError(result.error || 'Не удалось создать пользователя')
      return
    }
    setUsers((prev) => [...prev, { id: result.id!, email: newEmail.trim() }].sort((a, b) => a.email.localeCompare(b.email)))
    setNewEmail('')
    setNewPassword('')
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить этого администратора?')) return
    setError(null)
    const result = await deleteUser(id)
    if (result.success) {
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } else {
      setError(result.error || 'Не удалось удалить пользователя')
    }
  }

  const handleChangeOwnPassword = async () => {
    setError(null)
    setSuccess(null)
    if (ownPassword.length < 8) {
      setError('Пароль должен быть не короче 8 символов')
      return
    }
    setChanging(true)
    const result = await changeOwnPassword(ownPassword)
    setChanging(false)
    if (!result.success) {
      setError(result.error || 'Не удалось сменить пароль')
      return
    }
    setOwnPassword('')
    setSuccess('Пароль изменён.')
  }

  return (
    <>
      {error && <p className="rounded-2xl bg-status-alert-bg px-4 py-3 text-[13px] text-status-alert">{error}</p>}
      {success && <p className="rounded-2xl bg-status-ok-bg px-4 py-3 text-[13px] text-status-ok">{success}</p>}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Администраторы</div>
          <div className="mt-3 flex flex-col gap-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-xl bg-muted px-3.5 py-2.5 text-[13.5px]">
                <span>{u.email}</span>
                {u.id !== ownId ? (
                  <button type="button" onClick={() => handleDelete(u.id)} className="text-[11px] font-semibold text-accent hover:text-status-alert">
                    Удалить
                  </button>
                ) : (
                  <span className="text-[11px] text-subtle">это вы</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Новый администратор</div>
            <p className="mt-1.5 text-[11.5px] text-subtle">
              Почта для рассылки не настроена — придумайте пароль сами и сообщите его новому администратору лично (например, в Telegram).
            </p>
            <label className="mt-3 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />
            <label className="mt-3 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Пароль</label>
            <input
              type="text"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />
            <button type="button" onClick={handleCreate} disabled={creating} className="btn-primary mt-3 w-full justify-center">
              Создать
            </button>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Сменить свой пароль</div>
            <label className="mt-3 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Новый пароль</label>
            <input
              type="text"
              minLength={8}
              value={ownPassword}
              onChange={(e) => setOwnPassword(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />
            <button type="button" onClick={handleChangeOwnPassword} disabled={changing} className="btn-primary mt-3 w-full justify-center">
              Сменить пароль
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
