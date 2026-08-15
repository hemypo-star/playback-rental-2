# Design reference

Decoded copy of `Playback Rental - прокат техники.html` (repo root) — a
self-extracting Claude Artifact bundle, not plain HTML. Opening it in a
browser directly shows nothing useful; extraction recipe is in the repo
root `CLAUDE.md`.

- `dc_script.txt` — the artifact's React source. This is the canonical
  reference: it contains all five prototype screens switched via the
  `defaultScreen` prop (`home`, `catalog`, `product`, `cart`, `admin`),
  including the admin dashboard/orders/calendar/warehouse/clients/analytics
  layout that `docs/PLAN-docker-admin.md` targets.
- `markup.html` — static rendered HTML of the *default* screen only
  (`home`). Useful for a quick visual read of the storefront hero, but does
  **not** contain the admin screen — use `dc_script.txt` for that.
- `dc_props.json` — the artifact's configurable props (`defaultScreen`
  enum, `promoAuto`, `showKits`, `offHoursFee`) — confirms which screens
  exist and their default values.
- `template.html` — the raw artifact bundle before final decode (kept for
  reference; regenerate `dc_script.txt`/`markup.html`/`dc_props.json` from
  this if they're ever lost, following the recipe in the root `CLAUDE.md`).
