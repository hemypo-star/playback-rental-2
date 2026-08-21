# Hierarchical categories — sidebar spec

Hand-authored, not machine-extracted like `spec/tokens.css`/`spec/interactions.css`.
The design bundle (`markup.html`/`dc_script.txt`/`template.html`) predates the
`Categories.parent` field (added `a4c958f`, 2026-08-14) and only ever specified a
flat, single-level sidebar — there is nothing to extract this from. This document
is the source of truth for the feature instead, describing the behavior
implemented in `apps/cms/src/lib/categoryTree.ts` + `CategorySidebar.tsx`
(originally written against `apps/web/src/lib/categoryTree.ts` +
`CategorySidebar.astro`, before `docs/PLAN-next-migration.md` folded that app
into `apps/cms` and then deleted it). Treat this file the same as the generated
spec files: edits to the *behavior* happen in code first, then this doc is
updated to match — it does not drive the code.

## Behavior

Categories nest via a single `parent` relationship (unlimited depth in the data
model; two levels used in practice today). The sidebar renders the tree
depth-first-flattened, sorted by each level's existing `order` field — same sort
key flat lists already used, so manual ordering carries over per-level unchanged.
A category whose `parent` no longer resolves (deleted, or excluded by a scoped
fetch) degrades to a root rather than disappearing from the list.

## Visual spec

- **Indent**: `14px` base left padding for depth 0, `+14px` per additional
  depth level (`padding-left: 14 + depth * 14` px). No connector lines, no
  bullet/chevron — indent alone signals nesting.
- **Row height/type**: identical to depth-0 rows — `py-[11px]`, `text-[13.5px]`,
  same `rounded-xl` hover target. Nesting changes indent and one text color
  rule only, not row geometry.
- **Color**: depth-0 inactive rows use the default row color; depth > 0
  inactive rows use `text-subtle` (dimmer) instead, so nested items read as a
  visually subordinate group without a separate background or border. The
  active row (matching `activeSlug`) always gets the standard solid
  `bg-primary`/`text-primary-foreground` highlight regardless of depth —
  active-state styling doesn't change with nesting.
- **Transitions**: same `transition-colors duration-200` every sidebar row
  already uses — no depth-specific animation.
- **Mobile** (`<lg`, the `<select>` fallback): depth is rendered as leading
  spaces (`'  '.repeat(depth)`) plus an em-dash prefix (`— `) for any
  depth > 0, since a native `<select>` can't carry indent/color styling.

## Non-spec (deliberately unset, don't invent)

No icon/expand-collapse affordance — the full tree renders flat and open,
there is no collapse state. No max-depth cap in the UI (the data model itself
has none either). If either of these becomes a real requirement, update this
file *before* implementing, the same way any other design decision would need
sign-off — this doc existing doesn't retroactively authorize scope beyond
what's described above.
