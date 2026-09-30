// Shared light morphological normalization for storefront search.
//
// Payload's `like` operator tokenizes the query on spaces and ANDs a
// per-token containment match within one field, so the raw string reaching
// it decides what actually matches. Russian morphology means a literal
// query misses most real-world hits: "камеры" (genitive singular or
// nominative plural) won't contain-match "камера", "объективом" (instrumental)
// won't match "объектив". Full lemmatization would need a dictionary/model;
// this module instead applies two cheap, shared steps that both the dropdown
// endpoint and the /search page run through the same functions, so the two
// surfaces can never drift apart:
//
// 1. foldQuery() — strips every token down to its stem by cutting common
//    Russian case/plural/verb endings, which makes the `like` containment
//    match prefix-wise ("камер" matches камера/камеры/камеру/камерой).
//    Overstemming is intentional and safe here: `like` is a substring match,
//    so a shorter stem only ever widens results, never breaks them.
// 2. expandStems() — adds a few high-frequency suffix variants back on top of
//    the stems, recovering words whose full form doesn't start with the stem
//    after an imperfective/derivational suffix ("поиск" → also tries "поиска").
//    Capped per token so a long query can't build an unbounded where-tree.

const STOPWORDS = new Set(['и', 'в', 'на', 'с', 'по', 'для', 'из', 'к', 'а', 'не', 'the', 'a'])

// Ordered longest-first: cut the first ending that fits, but never below a
// recognizable stem length.
const ENDINGS = [
  'иями', 'ями', 'ами', 'ов', 'ев', 'ий', 'ый', 'ая', 'яя', 'ое', 'ее', 'ые', 'ие',
  'ому', 'ему', 'ых', 'их', 'ую', 'юю', 'ах', 'ях', 'ам', 'ям', 'ом', 'ем',
  'ти', 'ть', 'ла', 'ло', 'ли', 'ет', 'ут', 'ют', 'ит', 'ат', 'ят', 'нн', 'но',
  'на', 'ное', 'ные', 'ь', 'ы', 'и', 'а', 'е', 'о', 'у', 'я', 'й',
]

export function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/ё/g, 'е').trim()
}

function stripEnding(token: string): string {
  for (const end of ENDINGS) {
    if (token.length > end.length + 2 && token.endsWith(end)) {
      return token.slice(0, token.length - end.length)
    }
  }
  return token
}

// Splits the query into words, lowercases them (ё→е), drops stopwords and
// single characters, and reduces each remaining word to its stem. Words that
// are already down to two letters (real short nouns like «ccd», «fx») pass
// through unstemmed so they don't vanish below MIN_QUERY_LENGTH.
export function foldQuery(raw: string): string[] {
  return normalizeSearchText(raw)
    .split(/[^a-zа-я0-9]+/i)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((token) => (token.length <= 3 ? token : stripEnding(token)))
}

// Extra whole-word variants worth ORing onto a stem beyond plain prefix
// containment. Kept small and shared so both search surfaces agree.
const VARIANT_SUFFIXES = ['а', 'ы', 'и', 'е']

export function expandStems(stems: string[]): string[] {
  const out = new Set<string>()
  for (const stem of stems) {
    out.add(stem)
    for (const suffix of VARIANT_SUFFIXES) out.add(stem + suffix)
    if (out.size >= 40) break // guard against a pathological long query
  }
  return [...out]
}

// A query is "searchable" from 2 folded characters up — anything shorter
// (one-letter leftovers, empty input) returns no results rather than
// matching half the catalog.
export const MIN_QUERY_LENGTH = 2
