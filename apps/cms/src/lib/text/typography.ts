import Typograf from 'typograf'

// Russian typography for storefront text that people type in — the admin
// (site settings, promotions, categories) and МойСклад (product names and
// descriptions): non-breaking spaces after short words and before dashes,
// « » quotes, a real dash for " - ", "т. е.", "г. Кемерово" and the like.
//
// Applied in the storefront data layer (lib/data/*) to an explicit list of
// text fields, never to phones, e-mails, URLs or prices, and never to what the
// admin reads or saves: the admin works with the text as typed, so no invisible
// characters end up in its inputs. Output is plain Unicode — React renders it
// as text — so Typograf's HTML rules are switched off.
//
// Library: typograf (MIT), https://github.com/typograf/typograf

let instance: Typograf | null = null

function typograf(): Typograf {
  if (!instance) {
    instance = new Typograf({ locale: ['ru', 'en-US'] })
    // Plain text in, plain text out: no tags, no entities, no auto-links.
    instance.disableRule('common/html/*')
    // Equipment names and contacts must stay as typed: phone numbers keep
    // their format, model numbers and capacities are not split into digit
    // groups ("10000 мАч"), and thread sizes are not turned into ¼.
    instance.disableRule('ru/other/phone-number')
    instance.disableRule('common/number/digitGrouping')
    instance.disableRule('common/number/fraction')
  }
  return instance
}

// The same strings (settings, category names, card titles) are formatted on
// every request; Typograf is not free, so remember recent results.
const MEMO_LIMIT = 5000
const memo = new Map<string, string>()

export function typo<T extends string | null | undefined>(text: T): T {
  if (!text) return text
  const hit = memo.get(text)
  if (hit !== undefined) return hit as T
  const out = typograf().execute(text)
  if (memo.size >= MEMO_LIMIT) memo.clear()
  memo.set(text, out)
  return out as T
}

/** Shallow copy of `obj` with the listed string fields typographed. */
export function typoFields<T extends object>(obj: T, keys: readonly (keyof T)[]): T {
  const out = { ...obj }
  for (const key of keys) {
    const value = out[key]
    if (typeof value === 'string') out[key] = typo(value) as T[keyof T]
  }
  return out
}
