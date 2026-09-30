// Calendar-day arithmetic in the business's own timezone.
//
// Playback Rental operates in Kemerovo — Asia/Novokuznetsk, UTC+7, and
// unlike most of Russia's zones it has had no seasonal clock change since
// 2011, so a fixed offset is exact here rather than an approximation. The
// same assumption is already made by lib/admin/analyticsDateRange.ts (which
// spells the offset as the string '+07:00' for SQL bounds) and by
// lib/notifications/format.ts (which passes the IANA name to Intl). This
// module is the arithmetic form of the same fact, for code that needs to
// compare two instants as *calendar days* rather than format one.
//
// Why not date-fns, which this app already depends on: its plain
// startOfDay/isBefore work in the *server's* local timezone, which in a
// container is UTC. Between 00:00 and 07:00 Kemerovo time that is still
// "yesterday" in UTC, so a UTC-based "is this date in the past" check would
// reject a same-day booking made during the first seven hours of every
// working morning. That window is precisely when a walk-in customer books
// for today, so the bug would land on the most common real case.
const KEMEROVO_UTC_OFFSET_MS = 7 * 60 * 60 * 1000
const MS_PER_DAY = 24 * 60 * 60 * 1000

// Index of the Kemerovo calendar day an instant falls on. The absolute value
// is meaningless (it counts days since the epoch); only comparisons between
// two results of this function are.
export function businessDayIndex(date: Date): number {
  return Math.floor((date.getTime() + KEMEROVO_UTC_OFFSET_MS) / MS_PER_DAY)
}

// True when `date` falls on a Kemerovo calendar day strictly before the one
// `now` falls on. Deliberately day-granular, not instant-granular: a rental
// picked up at 10:00 is still a legitimate booking when it is placed at
// 14:00 the same day — the customer is standing at the counter. Only a
// genuinely earlier calendar day is refused.
export function isBeforeBusinessToday(date: Date, now: Date = new Date()): boolean {
  return businessDayIndex(date) < businessDayIndex(now)
}
