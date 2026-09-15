// Single source of truth for "what is the real client IP" (A2,
// design_handoff_swiss_bento/08-instruction.md — the rate-limiting half;
// see CLAUDE.md's A2 dev log entry for the booking-lifetime half that was
// explicitly ruled out). Every rate-limited write path (checkout Server
// Action, the contact-notification endpoint, the Users collection's login/
// forgotPassword/unlock beforeOperation hook) must resolve the caller's IP
// through this one function rather than inlining header parsing — the
// resolution here is easy to get backwards, and getting it backwards
// silently turns the limit into either "blocks the whole site" or
// "trivially spoofable," which is worse than not rate-limiting at all.
//
// Deployment topology — corrected: an earlier version of this comment cited
// "the A2 task instructions" for a settled nginx topology. That citation
// was false — `grep -n nginx design_handoff_swiss_bento/08-instruction.md`
// returns nothing; the instruction never mentions nginx or any proxy at
// all, and this repo's own `compose.yaml` publishes the `cms` service's
// port straight to the host with nothing in front of it. The nginx
// assumption came from the product owner in conversation, not from any
// document, and a real production deployment may or may not actually put a
// proxy in front of this container — this file cannot know that on its
// own, so it doesn't guess.
//
// `TRUST_PROXY_HEADERS` (env, apps/cms/.env.example) makes that assumption
// an explicit, operator-set fact instead of a hardcoded one:
//
// - Unset/false (the default — safe for the common case, since
//   `compose.yaml` as shipped has no proxy in front of `cms` at all):
//   `X-Real-IP`/`X-Forwarded-For` are NEVER read, full stop. Believing them
//   with nothing in front to strip a client-supplied value would let any
//   visitor pick their own IP bucket per request and bypass every IP-keyed
//   limit entirely, including admin login. `getClientIp` returns `null` in
//   this state — see "the degraded case" below for what callers do with
//   that, and why 'unknown' (a single bucket shared by literally everyone)
//   is not the answer.
// - `true` — set this ONLY when a real reverse proxy sits in front of this
//   deployment and is *known* to (a) overwrite, not merge, an inbound
//   `X-Real-IP` from the client (nginx: `proxy_set_header X-Real-IP
//   $remote_addr;` — the standard config, and the one this app is written
//   against) and (b) either strip a client-supplied `X-Forwarded-For` or
//   reliably append the real peer address as its last hop
//   (`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`).
//   With the flag on:
//   1. `X-Real-IP` first, if the proxy set it — a single value the proxy
//      itself writes from the TCP peer address.
//   2. Otherwise `X-Forwarded-For`, and specifically its RIGHTMOST entry,
//      not the leftmost. This is the one detail that's easy to get
//      backwards: `$proxy_add_x_forwarded_for` APPENDS the real peer
//      address to whatever `X-Forwarded-For` the client already sent, so a
//      client sending a forged `X-Forwarded-For: 1.2.3.4` arrives here as
//      `1.2.3.4, <real client ip>`. Reading the first entry would let any
//      attacker pick their own rate-limit bucket per request and evade the
//      limit entirely just by varying that header. The last entry is the
//      one hop the proxy itself observed and appended, so it's the one
//      entry in the whole chain that wasn't attacker-supplied.
//   3. If neither header is present even though the flag is on (a
//      misconfigured proxy, or a direct connection reaching this app
//      anyway) this falls back to 'unknown' — its own single shared bucket.
//      That's an accepted, opt-in degradation: an operator who turned the
//      flag on asserted a proxy is there, so an absent header means that
//      assertion was wrong, not that this code should silently invent a
//      "no protection at all" mode instead.
//
// The degraded case (flag off, or on with no headers reaching this code —
// null vs. 'unknown' below) is deliberately NOT the same "throttle by IP"
// behavior with a worse key. Two failure directions were both real and
// opposite:
//   - Trusting a header nothing strips: attacker-controlled bucket per
//     request, total bypass.
//   - Collapsing everyone into one 'unknown' bucket: real customers now
//     share a single 5-per-hour budget between all of them — the rate
//     limiter itself becomes a site-wide denial of service.
// `getClientIp` returning `null` (rather than 'unknown') when the IP truly
// cannot be trusted lets every call site tell "no usable IP dimension"
// apart from "a real, if unfamiliar, bucket key" and drop the IP-keyed
// check entirely rather than consuming/blocking on a shared bucket — see
// checkout/actions.ts, endpoints/contactNotification.ts, and
// collections/Users.ts for what each surviving dimension is per call site.
export function getClientIp(headers: Pick<Headers, 'get'>): string | null {
  if (process.env.TRUST_PROXY_HEADERS !== 'true') {
    return null
  }

  const realIp = headers.get('x-real-ip')
  if (realIp && realIp.trim()) {
    return realIp.trim()
  }

  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor && forwardedFor.trim()) {
    const hops = forwardedFor.split(',').map((hop) => hop.trim()).filter(Boolean)
    const rightmost = hops[hops.length - 1]
    if (rightmost) return rightmost
  }

  return 'unknown'
}
