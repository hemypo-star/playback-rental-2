'use client'

// C3 (design_handoff_swiss_bento/08-instruction.md, audit G2) — the entry
// animation applied to page/section blocks (`bnIn`, plus `bnClip`/`bnRule`
// used alongside it in the same hero/product-image compositions — see
// 03-motion.md rule 1 and the CSS comment in styles/prototype.css this
// component's attribute pairs with) is designed to play once, on a genuine
// first view of a page. C1 switched the storefront to `next/link`, which
// made every navigation client-side — including the browser's own
// Back/Forward buttons, which now replay the same entrance instead of
// restoring the page the customer was already looking at.
//
// Detecting Back/Forward: listen for the browser's native `popstate` event,
// which fires only for Back/Forward-driven navigation — a `next/link`
// click or `router.push()` calls `history.pushState()`, which never fires
// `popstate`; only *popping* an existing history entry does. A history
// entry can only be popped after it was previously pushed by a real
// navigation the user already saw, so "a popstate happened" already *is*
// "this page was already shown in this tab" on its own — no separate
// "have I rendered this route before" bookkeeping needed on top of it.
//
// On popstate this sets a `data-nav-back` attribute on <html>. styles/
// prototype.css redirects the specific `bnIn`/`bnClip`/`bnRule` entry
// keyframes to `none` while that attribute is present (matched off the
// literal keyframe name already sitting in each element's own inline
// `style` attribute — see that file's comment for why this reads as
// `animation: none` rather than a broken/blank state), so elements mounted
// by the popstate-triggered render land straight at the animation's *end*
// state instead of replaying from the start.
//
// --- Why the previous version of this file never cleared the flag ---
//
// The first implementation cleared `data-nav-back` from a second
// `useEffect(..., [pathname, searchParams])`, on the theory that this
// fires once per distinct URL commit and so would fire again right after
// the popstate-triggered render committed. Reproduced live (real
// `next build && next start`, a `MutationObserver` on the attribute, and a
// temporary diagnostic log of both effects and the popstate handler
// itself — see the PR description for the transcript) that this effect
// runs *before* the popstate handler on a Back navigation, not after:
// Next 16's client router reacts to the browser's Back/Forward navigation
// (most likely via the newer Navigation API, which resolves a same-
// document `navigate` ahead of the legacy `popstate` event reaching
// listeners registered after the router's own) and has already committed
// the destination route's content — including running this component's
// pathname-keyed effect for that new pathname, finding no flag to clear —
// *before* this component's own `popstate` listener (registered later, as
// a plain child further down the tree) ever runs and sets the flag. Once
// set, nothing changes `pathname`/`searchParams` again until some later,
// genuinely different navigation, so the effect that was supposed to clear
// it never got another chance to. This is not a one-off scheduling
// fluke to patch around with a delay: the pathname/searchParams effect is
// structurally the wrong signal to clear against, because it can equally
// well fire *before* the flag exists at all.
//
// It's also the wrong signal for a second, independent reason, found while
// checking whether simply reordering the two effects (or delaying the
// clear by a frame) would be enough: clearing the flag while the
// *same* Back-destination content is still the one on screen does not
// leave that content alone. Confirmed via `Element.getAnimations()` in a
// live page: once `animation: none` has applied and the browser considers
// the animation `finished`, removing that override — at any later point,
// a frame later or a full session later — is itself a change to the
// animation shorthand's computed value, which per the CSS Animations spec
// starts a *new* animation instance (`playState` flips back to `running`,
// `currentTime` resets to `0`). So a version of this file that reliably
// cleared the flag shortly after the Back-destination's own commit would
// trade "never animates" for "animates late, a beat after the customer has
// already settled on the page" — a different, equally-wrong bug, not a
// fix.
//
// --- The actual mechanism ---
//
// The flag must only ever come off once the content it was set for has
// genuinely been replaced — never while that same content is still what's
// on screen. The only reliable, ordering-independent signal for "a
// *different*, non-Back/Forward navigation has now started" is wrapping
// `history.pushState`/`history.replaceState` themselves: Next's router
// calls one of these for every client-side navigation that isn't a
// Back/Forward traversal (a next/link click, `router.push`/`replace`, a
// Server Action's `redirect()`), and never for a Back/Forward one (that's
// what `popstate` alone already covers, above) — so observing these calls
// needs no assumption about which of this component's own listeners fires
// before which of Next's internals, unlike the popstate/pathname-effect
// race above. The wrapper doesn't clear the attribute itself, though —
// doing that synchronously, before the new route's content has actually
// replaced the old, would strip `animation: none` from the *previous*
// (Back-destination) page's still-fully-mounted entry elements while the
// customer is still looking at them, restarting their animation in place
// for the fraction of a second before the new page swaps in — the exact
// "animates late" failure mode above, just moved a step earlier. Instead
// it only arms a ref; the pathname/searchParams effect (which does still
// reliably fire once the *new* navigation's own content has committed —
// the race above only affected the Back-destination's own first commit,
// where the flag wasn't set yet regardless) checks that ref and only then
// actually clears the attribute, now safely removing the override from
// content that has already replaced whatever was suppressed.
//
// Net effect: a Back/Forward return sets the flag and leaves it set for as
// long as that destination stays the current page — a modal or dropdown
// opened well after landing there is unaffected regardless, because
// styles/prototype.css's own selector structurally exempts click-triggered
// entrances (`data-manual-entry`) rather than depending on this flag
// having cleared in time; see that file's comment. The flag then clears
// the moment a genuinely new navigation's content commits, so that page's
// own entrance plays normally (suppressed for at most its own first paint,
// then released — imperceptible next to the network/render latency that
// already precedes any client-side navigation's first paint).
//
// Rejected alternatives:
// - Delaying the clear with `requestAnimationFrame`/a timer, anchored to
//   when the popstate handler runs: still clears while the Back-
//   destination's own content is what's mounted, so it still hits the
//   "animates late" bug above — the delay changes *when* the glitch is
//   visible, not whether it exists.
// - `PerformanceNavigationTiming`: only describes how the *document*
//   itself was loaded (navigate/reload/back_forward/prerender) and never
//   changes across client-side navigations — it can't tell a `next/link`
//   click from a same-tab Back press once inside the SPA, which is exactly
//   the distinction this bug needs.
// - A module-scope "have I rendered this route before" `Set`: needs its
//   own bookkeeping *and* over-suppresses — it would also skip the
//   animation the second time a customer deliberately clicks back into a
//   section via a normal link (Catalog -> Product -> Catalog via the
//   breadcrumb, say), which the brief only asks to skip for an actual
//   Back/Forward return, not for every repeat visit. `popstate` alone
//   already matches the brief's own wording without that extra state, and
//   needs no per-route memory at all.
import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const NAV_BACK_ATTR = 'data-nav-back'

export default function EntryAnimationController() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Armed by the history.pushState/replaceState wrap below the instant a
  // genuinely new (non-Back/Forward) navigation starts; read — and
  // consumed — by the commit-effect below, which is the only place that
  // actually removes the attribute. A ref, not state: flipping it must
  // never itself cause a render or compete with React's own scheduling.
  const clearOnNextCommit = useRef(false)
  // True from the moment a Back/Forward `popstate` fires until that
  // traversal's own render commits.
  //
  // The header above says Next calls pushState/replaceState "for every
  // client-side navigation that isn't a Back/Forward traversal, and never
  // for a Back/Forward one." That is not true of Next 16, and this ref is
  // what stops the difference from breaking the feature. Observed in a real
  // headless Chrome against a production build, instrumenting
  // history/setAttribute/removeAttribute on <html>, pressing Back from
  // /catalog to /:
  //
  //   pushState -> /catalog     (the forward nav; arms the ref)
  //   REMOVE                    (its commit consumes the arm — correct)
  //   SET true                  (Back: the popstate handler sets the flag)
  //   replaceState -> /         (Next's own router, mid-traversal)
  //   REMOVE                    (that commit consumes the new arm and
  //                              strips the flag it was just given)
  //
  // So the traversal re-arms the very mechanism meant to survive it, and
  // the entry animation replays on Back — exactly the bug this file exists
  // to prevent. Suppressing arming while a traversal is in flight is
  // ordering-independent in the same way the wrap itself is: it keys off
  // popstate, which only a traversal can fire, rather than off which
  // listener or effect Next happens to run first. If the commit effect ever
  // runs *before* popstate (the ordering the header documents for an older
  // Next), this ref is simply false at that point and nothing changes.
  const traversing = useRef(false)

  useEffect(() => {
    const handlePopState = () => {
      traversing.current = true
      // A traversal is never the "new navigation" the arm is meant to
      // represent, so anything armed before it is stale by definition.
      clearOnNextCommit.current = false
      document.documentElement.setAttribute(NAV_BACK_ATTR, 'true')
    }

    // See the header comment above for why wrapping these, rather than a
    // second popstate-adjacent listener, is the only ordering-independent
    // way to detect "a new, non-Back/Forward navigation just started."
    const originalPushState = history.pushState.bind(history)
    const originalReplaceState = history.replaceState.bind(history)
    history.pushState = (...args: Parameters<History['pushState']>) => {
      if (!traversing.current) clearOnNextCommit.current = true
      return originalPushState(...args)
    }
    history.replaceState = (...args: Parameters<History['replaceState']>) => {
      if (!traversing.current) clearOnNextCommit.current = true
      return originalReplaceState(...args)
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      history.pushState = originalPushState
      history.replaceState = originalReplaceState
    }
  }, [])

  useEffect(() => {
    // Fires once this render's content has committed, regardless of which
    // navigation produced it. Only actually clears the flag if the
    // pushState/replaceState wrap above armed it for *this* commit — a
    // plain Back/Forward return never does, so its own destination page's
    // commit leaves the suppression in place for as long as that page
    // stays displayed, however long that is. See the header comment for
    // why a version of this effect with no arming check both fails to
    // reliably run again (the original bug) and, when it does run,
    // restarts the just-suppressed entrance animation in place on content
    // that's supposed to look settled.
    if (traversing.current) {
      // This commit is the traversal's own. Its destination keeps the flag
      // for as long as it stays on screen; end the traversal window here so
      // the next genuine navigation can arm normally.
      traversing.current = false
      return
    }
    if (clearOnNextCommit.current) {
      document.documentElement.removeAttribute(NAV_BACK_ATTR)
      clearOnNextCommit.current = false
    }
  }, [pathname, searchParams])

  return null
}
