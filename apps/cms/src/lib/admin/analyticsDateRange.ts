const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

// Playback Rental operates in Kemerovo (UTC+7, no seasonal clock changes).
// Date inputs in the admin UI are business-calendar dates, so translate
// their midnight boundaries from Kemerovo time to UTC before querying
// Payload's timestamp columns. Keeping this conversion in one pure helper
// also makes the inclusive end-date semantics explicit and testable.
const KEMEROVO_UTC_OFFSET = '+07:00'

export interface AnalyticsDateRange {
  from?: string
  to?: string
  /** Inclusive lower bound for orders.createdAt. */
  fromIso?: string
  /** Exclusive upper bound: midnight after `to`, in Kemerovo time. */
  toExclusiveIso?: string
}

function validDate(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined

  const match = DATE_RE.exec(trimmed)
  if (!match) return undefined

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const probe = new Date(Date.UTC(year, month - 1, day))

  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return undefined
  }

  return trimmed
}

function nextCalendarDay(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + 1))
  return [
    date.getUTCFullYear().toString().padStart(4, '0'),
    (date.getUTCMonth() + 1).toString().padStart(2, '0'),
    date.getUTCDate().toString().padStart(2, '0'),
  ].join('-')
}

function kemerovoMidnightIso(value: string): string {
  return new Date(`${value}T00:00:00${KEMEROVO_UTC_OFFSET}`).toISOString()
}

export function normalizeAnalyticsDateRange(rawFrom?: string, rawTo?: string): AnalyticsDateRange {
  let from = validDate(rawFrom)
  let to = validDate(rawTo)

  // A reversed range is most likely a typing/order mistake. Normalize it
  // rather than returning a silently empty report; the form will render the
  // normalized values on the response so the operator can see what ran.
  if (from && to && from > to) {
    ;[from, to] = [to, from]
  }

  return {
    from,
    to,
    fromIso: from ? kemerovoMidnightIso(from) : undefined,
    toExclusiveIso: to ? kemerovoMidnightIso(nextCalendarDay(to)) : undefined,
  }
}
