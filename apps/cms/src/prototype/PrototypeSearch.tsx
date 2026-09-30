'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

// Global header search. One input, two surfaces: a live dropdown (categories
// first, then products, fed by GET /api/search) on desktop, and a full-screen
// overlay with the same list on mobile (<=760px, driven purely by CSS — see
// .pb-search-overlay rules in prototype.css). Enter or tapping the submit
// button navigates to the /search results page; clicking a suggestion goes
// straight to that category/product.
interface SearchProductItem { id: number; title: string; price: number; listingType: 'rental' | 'sale'; categoryName?: string; imageUrl?: string }
interface SearchCategoryItem { id: number; name: string; slug: string }
interface SearchResponse { categories: SearchCategoryItem[]; products: SearchProductItem[]; totalProducts: number }

const EMPTY: SearchResponse = { categories: [], products: [], totalProducts: 0 }
const MIN_QUERY = 2
const DEBOUNCE_MS = 300

const rub = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })

export default function PrototypeSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResponse>(EMPTY)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced fetch, driven from onChange rather than an effect body — all
  // setState calls happen inside event handlers or async callbacks, never
  // synchronously during an effect (react-hooks/set-state-in-effect). The
  // AbortController drops an in-flight request whenever a newer keystroke
  // supersedes it, so a slow earlier response can never land after a faster
  // later one and flash stale suggestions.
  const scheduleFetch = useCallback((raw: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const q = raw.trim()
    if (q.length < MIN_QUERY) {
      abortRef.current?.abort()
      setResult(EMPTY)
      setLoading(false)
      return
    }
    setLoading(true)
    timerRef.current = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((data: SearchResponse) => { setResult(data); setLoading(false) })
        .catch(() => { /* aborted or failed — keep the previous list */ setLoading(false) })
    }, DEBOUNCE_MS)
  }, [])

  // A close/clear/navigation may skip onChange, so drop any pending timer and
  // in-flight request on unmount; reset state is handled by the callers above.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    abortRef.current?.abort()
  }, [])

  // Click-outside closes the dropdown; Escape closes it and blurs the input.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() } }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onPointer); document.removeEventListener('keydown', onKey) }
  }, [open])

  const go = (href: string) => { setOpen(false); setQuery(''); inputRef.current?.blur(); router.push(href) }
  const submit = (e: React.FormEvent) => { e.preventDefault(); const q = query.trim(); if (q.length >= MIN_QUERY) go(`/search?q=${encodeURIComponent(q)}`) }

  const hasResults = result.categories.length > 0 || result.products.length > 0
  const showPanel = open && query.trim().length >= MIN_QUERY

  return (
    <div className="pb-search-root" ref={rootRef}>
      <form className="pb-search-form" role="search" onSubmit={submit}>
        <svg className="pb-search-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m16.5 16.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); scheduleFetch(e.target.value) }}
          onFocus={() => setOpen(true)}
          placeholder="Поиск по каталогу..."
          aria-label="Поиск по каталогу"
          className="pb-search pb-search-header"
        />
        {query && <button type="button" className="pb-search-clear" aria-label="Очистить поиск" onClick={() => { setQuery(''); scheduleFetch(''); inputRef.current?.focus() }}>×</button>}
      </form>
      {showPanel && (
        <div className="pb-search-panel">
          <div className="pb-search-overlay-head">
            <span className="pb-kicker">Поиск</span>
            <button type="button" className="pb-search-close" aria-label="Закрыть поиск" onClick={() => setOpen(false)}>×</button>
          </div>
          {loading && result === EMPTY ? (
            <div className="pb-search-note">Ищем…</div>
          ) : !hasResults ? (
            <div className="pb-search-note">Ничего не найдено. Попробуйте другой запрос.</div>
          ) : (
            <>
              {result.categories.length > 0 && (
                <div className="pb-search-group">
                  <div className="pb-search-group-title">Категории</div>
                  {result.categories.map((c) => (
                    <Link key={`c${c.id}`} href={`/catalog/${c.slug}`} prefetch={false} className="pb-search-item" onClick={(e) => { e.preventDefault(); go(`/catalog/${c.slug}`) }}>
                      <span className="pb-search-item-name">{c.name}</span>
                      <span className="pb-search-label">Категория</span>
                    </Link>
                  ))}
                </div>
              )}
              <div className="pb-search-group pb-search-products">
                <div className="pb-search-group-title">Товары</div>
                {result.products.map((p) => (
                  <Link key={`p${p.id}`} href={`/product/${p.id}`} prefetch={false} className="pb-search-item" onClick={(e) => { e.preventDefault(); go(`/product/${p.id}`) }}>
                    <span className="pb-search-thumb">{p.imageUrl ? <Image src={p.imageUrl} alt="" fill sizes="48px" style={{ objectFit: 'cover' }} /> : <span className="pb-search-thumb-empty" />}</span>
                    <span className="pb-search-item-main">
                      <span className="pb-search-item-name">{p.title}</span>
                      {p.categoryName && <span className="pb-search-item-sub">{p.categoryName}</span>}
                    </span>
                    <span className="pb-search-price">
                      <strong>{rub.format(p.price)}</strong>
                      <span>{p.listingType === 'rental' ? 'в сутки' : 'шт.'}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
          <div className="pb-search-foot">
            <button type="button" className="pb-pill pb-btn pb-search-all" onClick={submit}>Показать все результаты</button>
          </div>
        </div>
      )}
    </div>
  )
}
