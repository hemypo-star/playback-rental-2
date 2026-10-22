import { notFound } from 'next/navigation'

// Any storefront URL no other route matches lands here, so it gets the
// site's own not-found page (with header and footer) and a real 404 status
// instead of Next's bare default. Static and more specific routes, /api and
// /admin included, always win over this catch-all.
export default function Unmatched() {
  notFound()
}
