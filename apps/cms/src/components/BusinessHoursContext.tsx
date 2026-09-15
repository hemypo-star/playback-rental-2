'use client'

// B4 (design_handoff_swiss_bento/08-instruction.md, audit N5) — the single
// path business hours (from SiteSettings) travel from the root layout's one
// Local API read down to every RentalDatePicker instance, without prop-
// drilling through the 5 places that render one (Navbar, the homepage hero,
// CatalogPage's compact trigger, ProductPurchasePanel, CheckoutPage) or the
// extra hardcoded "10:00—21:00" label in Navbar itself.
//
// Why Context instead of a prop from each of the 5 call sites: (frontend)/
// layout.tsx is the one Server Component every one of those 5 already
// renders underneath (directly, or via a page.tsx it wraps) — CheckoutPage
// in particular has no server data-fetching of its own at all (Stage 2's own
// dev log note: "the cart is entirely client-side localStorage"), so a
// prop-drilled approach would need to give checkout/page.tsx a server data
// fetch it doesn't otherwise need, just to forward one value down to a
// client child. Reading through Context here means layout.tsx fetches
// SiteSettings once (already established — Footer.tsx does the same read
// independently; lib/data/siteSettings.ts's `cache()` wrap, added alongside
// this file, dedupes the two calls within one request) and every consumer,
// however deeply nested, reads the same value with a plain hook call. No
// `createContext` existed anywhere in this codebase before this — considered
// a client-side fetch instead (the pattern lib/rentalAvailability.ts already
// uses for per-session, unknowable-at-SSR data like selected dates), but
// business hours are ordinary server-known site config, not session state,
// so a network round-trip on every mount would be pure overhead next to one
// server-side read shared by the whole page tree.
import { createContext, useContext, type ReactNode } from 'react'
import { DEFAULT_BUSINESS_HOURS } from '../lib/dateRange'

export interface BusinessHours {
  open: number
  close: number
}

const BusinessHoursContext = createContext<BusinessHours>(DEFAULT_BUSINESS_HOURS)

export function BusinessHoursProvider({ value, children }: { value: BusinessHours; children: ReactNode }) {
  return <BusinessHoursContext.Provider value={value}>{children}</BusinessHoursContext.Provider>
}

export function useBusinessHours(): BusinessHours {
  return useContext(BusinessHoursContext)
}
