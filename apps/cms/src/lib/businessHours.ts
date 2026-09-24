// The fallback open/close hours for the storefront.
//
// B4 (design_handoff_swiss_bento/08-instruction.md, audit N5) — the real
// values come from SiteSettings (`businessHoursOpen`/`businessHoursClose`,
// apps/cms/src/globals/SiteSettings.ts) and are threaded to every component
// that renders a time, so the calendar's hour grid and the caption under it
// can no longer disagree the way two separately-hardcoded numbers once did.
// This constant is only the fallback for the (practically unreachable, since
// both fields carry a `defaultValue`) case where SiteSettings has no value
// yet; it intentionally matches that `defaultValue`, not the old, wrong `9`.
//
// It is what remains of lib/dateRange.ts, deleted on 2026-09-24: that
// module's other 15 exports were the old date picker's grid/selection and
// formatting helpers, and the prototype rewrite replaced the components that
// called them without removing the module. See docs/DEV-LOG.md.
export const DEFAULT_BUSINESS_HOURS = { open: 10, close: 21 }
