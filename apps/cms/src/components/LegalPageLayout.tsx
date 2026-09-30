'use client'

// Shared shell for the two long-text legal pages (privacy-policy,
// user-agreement) — design_handoff_swiss_bento/08-instruction.md, Block E,
// "Правовые страницы": "это длинный текст, а не экран: одна общая
// раскладка, колонка 680px, 17/1.65, липкое оглавление на ≥1024px, никаких
// карточек вокруг абзацев." No corresponding screen exists in
// docs/design-reference/template.html (its prototype only ever covers
// home/catalog/product/cart/admin) — the numbers above come straight from
// the instruction text itself, not extracted markup.
//
// 'use client' only for the scroll-spy IntersectionObserver below; both
// pages stay Server Components and pass their (static) section markup in
// as children — that doesn't force them client, same as any other
// server-renders-into-a-client-shell composition in this app.
import { useEffect, useState } from 'react'

export interface LegalTocItem {
  id: string
  label: string
}

interface LegalPageLayoutProps {
  title: string
  subtitle?: string
  toc: LegalTocItem[]
  children: React.ReactNode
}

export default function LegalPageLayout({ title, subtitle, toc, children }: LegalPageLayoutProps) {
  const [activeId, setActiveId] = useState<string>(toc[0]?.id ?? '')

  useEffect(() => {
    const headings = toc
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)
    if (headings.length === 0) return

    // -112px top margin clears the sticky header (h-16 + pt-3 ≈ 76px, same
    // ~96px breathing room every other sticky panel in the app uses —
    // CategorySidebar, the checkout summary, the product purchase panel);
    // -65% bottom margin keeps a generous "currently reading" band instead
    // of only firing right as a heading touches the very top of the page.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length === 0) return
        const topmost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b))
        setActiveId(topmost.target.id)
      },
      { rootMargin: '-112px 0px -65% 0px', threshold: 0 },
    )
    headings.forEach((heading) => observer.observe(heading))
    return () => observer.disconnect()
  }, [toc])

  return (
    <div className="container-page py-16">
      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
        <aside className="hidden lg:block">
          <nav aria-label="Оглавление" className="sticky top-[96px] max-h-[calc(100vh-120px)] space-y-0.5 overflow-y-auto pr-2 text-[13px]">
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`block rounded-lg px-3 py-2 leading-[1.35] transition-colors duration-240 ease-expo ${
                  activeId === item.id
                    ? 'bg-muted font-semibold text-foreground'
                    : 'text-subtle hover:text-foreground'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="mx-auto w-full max-w-[680px] lg:mx-0">
          <h1 className="text-[30px] font-bold tracking-[-0.03em]">{title}</h1>
          {subtitle && <p className="mt-4 text-[13.5px] text-subtle">{subtitle}</p>}
          <div className="mt-8 space-y-8 text-[17px] leading-[1.65] text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  )
}
