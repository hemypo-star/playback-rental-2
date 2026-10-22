// SEC-026: the public /contact form's payload, validated before rate limiting
// or queueing. Without this a non-string field threw a 500 and a multi-MB
// `message` was written straight into the notification queue volume.

export const CONTACT_LIMITS = {
  name: 100,
  email: 254,
  phone: 40,
  subject: 200,
  message: 5000,
} as const

// Requests larger than this are refused before the body is read at all.
export const CONTACT_MAX_BODY_BYTES = 32 * 1024

export interface ContactInput {
  name: string
  email: string
  phone: string
  subject?: string
  message: string
}

export type ContactInputResult = { ok: true; value: ContactInput } | { ok: false; error: string }

// Deliberately loose: one @, something on each side, a dot in the domain.
// Delivery is what really validates an address; this only rejects junk.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function field(raw: unknown, name: keyof typeof CONTACT_LIMITS, required: boolean): string | undefined | Error {
  if (raw === undefined || raw === null || raw === '') {
    return required ? new Error(`${name} is required`) : undefined
  }
  if (typeof raw !== 'string') return new Error(`${name} must be a string`)
  const value = raw.trim()
  if (!value) return required ? new Error(`${name} is required`) : undefined
  if (value.length > CONTACT_LIMITS[name]) return new Error(`${name} is longer than ${CONTACT_LIMITS[name]} characters`)
  return value
}

export function parseContactInput(body: unknown): ContactInputResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'body must be a JSON object' }
  const raw = body as Record<string, unknown>

  const name = field(raw.name, 'name', true)
  const email = field(raw.email, 'email', true)
  const phone = field(raw.phone, 'phone', true)
  const subject = field(raw.subject, 'subject', false)
  const message = field(raw.message, 'message', true)

  for (const value of [name, email, phone, subject, message]) {
    if (value instanceof Error) return { ok: false, error: value.message }
  }
  if (!EMAIL_PATTERN.test(email as string)) return { ok: false, error: 'email is not a valid address' }
  // 152-FZ art. 9: the form collects name, phone and email, so both
  // checkboxes — consent and the privacy policy, kept separate as
  // Roskomnadzor requires — are required server-side too.
  if (raw.agreeData !== true) return { ok: false, error: 'personal-data consent is required' }
  if (raw.agreePolicy !== true) return { ok: false, error: 'privacy policy acknowledgement is required' }

  return {
    ok: true,
    value: {
      name: name as string,
      email: email as string,
      phone: phone as string,
      ...(subject ? { subject: subject as string } : {}),
      message: message as string,
    },
  }
}
