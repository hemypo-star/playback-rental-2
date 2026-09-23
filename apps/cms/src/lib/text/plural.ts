// Russian plural agreement for a counted noun.
//
// lib/checkoutErrors.ts's pluralUnits() sidesteps this by counting in "шт.",
// which does not inflect, and its comment notes full ru pluralization as a
// separate backlog item (B5). This is the arithmetic that item needs; it is
// introduced here for the catalog's own "N позиций" label, which reads "4
// позиций" without it. Other call sites can adopt it as B5 is picked up —
// this does not retrofit them.
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return many
  if (last > 1 && last < 5) return few
  if (last === 1) return one
  return many
}
