# Review log

## What `reviewed: true` means here

Per `docs/specs/00-truth-rules.md` rule 9, `reviewed: true` records that the maintainer granted
**REVIEW_ACCEPT** for a structure row or fact card. The maintainer granted it for the batches below
and delegated the checking, so the `reviewer` field names the reviewer that actually did the work —
an agent — rather than putting the maintainer's name on material they did not read.

**This is not a human anatomical peer review, and the flags do not claim one.** Read the scope below
before treating a `reviewed: true` row as expert-verified.

## 2026-09-13 — Visible Human donor organs, cards, and the whole graph

Scope: 52 of 53 structure rows, and all 42 published fact cards.

### What was actually checked

Each of these was run against the real files, not asserted:

- **Uberon identifiers re-verified at OLS4** for all 52 rows — the term exists, is not obsolete, and
  its label or a synonym matches the row's label. (`incoming/review_cards.mjs`,
  `incoming/review_layer_rows.mjs`.)
- **Card frontmatter parses**, and the card's `id` matches both its filename and the row's
  `facts_id`.
- **The card's `uberon` matches the row's `uberon`.**
- **Every citation key resolves** to a row in `docs/sources.md`.
- **Every key cited in a card's body is declared in that card's frontmatter.** This check did not
  exist before this review; adding it found a live card citing `z-anatomy` while declaring only
  `hubmap-hra-glb`/`uberon`/`wikipedia-*`.
- **A `reviewed: true` row has sources** (the schema's own requirement).
- **Cards carry the three required sections** (Identity / Relations / Presence).
- **Presence claims were checked against the mesh-name sets the app actually resolves against**, so
  a card cannot claim a body carries a structure the mapping does not support.

### What the review did NOT establish

- No anatomist verified the descriptions. The prose is quoted from the OLS4 term definition and a
  fetched Wikipedia article; those quotations were checked for correct attribution and for being
  used only for the structure the article is about, but the underlying science was not
  independently confirmed.
- Photographic or measurement accuracy of the meshes was not assessed.
- Claims about *that donor* (as opposed to the anatomy in general) rest on the source's own
  labelling. Where a source is a contributed model rather than the donor's own scan, the card says
  so.

### Defects found and fixed during the review

1. **Fourteen published cards were stale.** The donor batches added hundreds of mesh names to rows
   whose cards were written when only the Reference Atlas body existed, so those cards never
   mentioned the donor bodies a visitor could be looking at. Each now carries the `hubmap-hra-glb`
   citation and a per-body Presence bullet whose counts come from the same mesh-name sets the app
   resolves against (`incoming/patch_donor_presence.mjs`, `incoming/audit_cards.mjs`).
2. **A card cited a source key it did not declare** (`vertebral-column`), which renders an
   attribution that resolves to nothing.
3. **`trachea.md` had an un-indented continuation line**, which breaks its list in Markdown.
4. **`heart-left-ventricle.md` used a `## Source volume` heading** where every later card uses
   `## Presence`. Aligned.

### Held back: `body`

The `body` row is deliberately **still `reviewed: false`**. It is the graph root and is never
clickable (it has no mesh names), and it carries three unresolved problems:

- its label is "Human body" but UBERON:0000468 is "multicellular organism" — those are not the same
  claim, and the row does not say why they are being equated;
- its `layer` is `unknown`;
- its source note reads "whole-body context — asset path after R2 sync", which has been stale since
  R2 went live on 2026-09-02.

It needs a human decision about what that row is meant to represent before it is signed off.

## Maintaining this log

When a batch is review-accepted, add an entry: the date, the scope, what was checked, what was
**not** checked, and anything held back with the reason. The point of this file is that "reviewed"
stays falsifiable — a reader should be able to see exactly how far the review went.
