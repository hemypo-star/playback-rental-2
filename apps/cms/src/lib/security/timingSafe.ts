import { timingSafeEqual } from 'crypto'

// Plain !== leaks timing information about how many leading bytes matched —
// a textbook side channel for any secret/token comparison gating an action.
// Lengths must match before timingSafeEqual() runs, or it throws instead of
// comparing; that early return doesn't need to be constant-time itself,
// only the byte-by-byte comparison does.
export function secretsMatch(provided: string | null | undefined, expected: string): boolean {
  if (!provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
