// Normalizes a Russian phone number for use as a rate-limit bucket key (A2,
// design_handoff_swiss_bento/08-instruction.md) — the same human typing
// "+7 923 123-45-67" and "8 (923) 123 45 67" must land in one bucket, or
// per-phone limiting is trivially evaded by retyping the number differently
// each time.
//
// Not a validator: checkout's own form validation (CheckoutPage.tsx) is
// responsible for rejecting garbage input before it ever reaches here — this
// only has to produce a stable, collision-resistant bucket key from
// whatever string arrives, including a not-quite-valid one, since a bad key
// still needs *some* bucket rather than crashing the rate limiter.
export function normalizePhoneForRateLimit(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return 'empty'

  // 11 digits starting with the domestic trunk prefix (8) and the 10-digit
  // Russian national number both mean the same subscriber as the +7 form —
  // fold all three onto one 7-prefixed 11-digit key.
  if (digits.length === 11 && digits.startsWith('8')) {
    return `7${digits.slice(1)}`
  }
  if (digits.length === 10) {
    return `7${digits}`
  }
  return digits
}
