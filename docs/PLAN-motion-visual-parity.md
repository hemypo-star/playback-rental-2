# Motion and Visual Parity Execution Plan

Branch: `frontend-rebuild-from-html`  
Reference: `design_handoff_swiss_bento/reference/Playback Rental.dc.html`  
Baseline head when this plan was recorded: `ca93cad8a13e97ece96f02764581b3fb09b40419`

## Goal

Finish the Next/Payload frontend so that its layout, interaction states, and motion match the HTML reference bundle while preserving the repository's existing business logic, routes, Payload contracts, Nanostores state, pricing, checkout actions, authentication, and accessibility behavior.

## Execution order

### 1. Close the current CI run

- Verify the CI run for the current head.
- Require green results for:
  - lint;
  - typecheck;
  - tests;
  - production build;
  - Docker/runtime checks;
  - browser/security/admin/order/media smoke;
  - visual regression;
  - motion assertions.
- Fix any CI regression before continuing visual or motion tuning.

### 2. Validate motion in a real browser

Use the HTML bundle as the source of truth and compare computed browser behavior for:

- `animation-duration`;
- `animation-delay`;
- `animation-timing-function`;
- `transition-duration`;
- `transition-timing-function`;
- repeat/infinite behavior;
- stagger;
- state-triggered `pbPop/bnPop`;
- promo 9-second cycle;
- modal/date-picker entrance and spring behavior;
- marquee timing;
- admin KPI/row motion.

Motion assertions must run with `prefers-reduced-motion: no-preference`. Static pixel screenshots may continue using reduced motion for deterministic captures.

### 3. Interactive motion verification

Verify the same interactions implemented by the HTML bundle:

- button hover and gap expansion;
- card hover/lift/shadow;
- hero image/placeholder zoom;
- product add-to-cart state;
- cart badge pop;
- quantity pop;
- total-price pop;
- date selection;
- calendar range/edge transitions;
- consent checkbox spring;
- date-picker open/close;
- promo crossfade, text rise, and progress bar;
- normal navigation;
- browser Back/Forward entrance suppression;
- admin action/KPI/table/calendar hover motion.

Do not alter business calculations to obtain visual parity.

### 4. Verify motion across reference viewports

Test:

- desktop: `1440x900`;
- tablet: `1024x900`;
- mobile: `375x812`.

Check transforms, overflow, sticky behavior, and any responsive substitution so desktop-only motion does not create mobile layout defects.

### 5. Finish remaining static visual parity

Work from fresh visual artifacts, in this priority order:

1. admin desktop/tablet/mobile;
2. product desktop/tablet/mobile;
3. checkout desktop/tablet/mobile;
4. catalog control pass;
5. home control pass.

For each screen:

- use reference/actual/diff screenshots;
- fix only confirmed layout/style mismatches;
- preserve dynamic production data;
- use visual fixtures/reference-mode only when the HTML contains static mock values;
- do not change production pricing to reproduce incorrect mock calculations.

### 6. Regression-check business behavior

After motion and visual changes verify:

- cart Nanostore;
- selected dates store;
- availability behavior;
- rental pricing;
- promo codes;
- checkout validation/submission;
- Payload admin data;
- admin authentication;
- routing;
- browser Back/Forward;
- keyboard interaction;
- focus behavior;
- `prefers-reduced-motion`.

### 7. Final regression pass

Run the complete matrix for:

- home;
- catalog;
- product;
- checkout;
- admin;

at desktop/tablet/mobile sizes.

Required final checks:

- static pixel diff;
- motion assertions;
- browser smoke;
- console/runtime errors;
- production build;
- complete GitHub Actions pipeline.

## Rules while executing

1. The HTML bundle is authoritative for specified layout, motion, timing, easing, hover, selected, and responsive behavior.
2. Existing repository behavior is authoritative for business rules and data contracts.
3. Do not replace or simplify working business logic for visual parity.
4. Do not add a runtime dependency or change architecture unless fidelity cannot be achieved with the existing stack.
5. Do not start a new tuning batch on top of an unverified regression when the current CI has a real failure.
6. Use fresh artifacts and measured browser values rather than CSS changes by eye.
7. Keep reduced-motion behavior functional even when normal-motion parity is exact.
8. Record any unavoidable mismatch and its technical reason instead of hiding it.

## Current next action

Complete step 1 by checking the CI result for the current motion head, then continue strictly in the order above.
