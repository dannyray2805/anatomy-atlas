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

## 2026-09-14 — four reviewed cards extended with a second dataset

The heart chambers and the ascending aorta now resolve on the Reference body as well as on the
Visible Human donors, so four cards that were already `reviewed: true` gained a Presence bullet for
that third body, and each gained the `z-anatomy` citation its new bullet cites:

- `heart-left-ventricle`, `heart-right-ventricle`, `heart-right-atrium`, `aorta-ascending`.

**What was checked for this extension, per row:** the new mesh name was confirmed present in the
shipping asset with the app's own loader (not the file's node names — those differ); the Uberon id
was re-confirmed at OLS4; and the page was checked to open the row from that body. The
already-reviewed claims were not re-checked, and nothing was removed.

**Two genuine gaps were closed rather than documented**, which is why the extensions are larger than
a citation edit:

- the **female** left ventricle had been unmapped since the first heart batch, because her asset
  names it `VH_F_left_ventricle` while the male's says `VH_M_heart_left_ventricle`. Cards had been
  apologising for a "male-only" left ventricle; that is now fixed, and the female guided journey
  picks up the left-ventricle stop.
- the **left atrium** had no row at all. Both donors' heart assets carry the mesh
  (`VH_M_left_cardiac_atrium`, `VH_F_left_cardiac_atrium`) and had done since the hearts were first
  mapped — the row was simply never written. A card was added for it (`heart-left-atrium`, still
  `reviewed: false`).

**Caught by the gate, worth recording:** the first patch cited `hubmap-hra-glb` in a card body
without declaring it in the frontmatter. `pnpm validate` failed on the dangling citation, which is
exactly what that rule exists for. Fixed by declaring the source.

## 2026-09-14 — the vessel tree, and a correction to how this project verifies an id

Scope: 229 new `vessel`-layer rows for the Reference body's Z-Anatomy cardiovascular layer, all added
`reviewed: false`. Two already-`reviewed: true` whole-layer rows had their source notes corrected
(below); no reviewed row's id, label, Uberon id or mesh names changed.

### The mapping rule, and the correction to it

Earlier passes accepted an id only when the asset's name equalled the Uberon **label** exactly. That
gate produced an obvious false negative here: UBERON:0001585 is labelled "anterior vena cava", and the
human superior vena cava is one of its synonyms — so "Superior vena cava", which nobody would call
unmappable, was refused.

The gate is now the label **or an exact synonym**, and an earlier note in this project claiming the
OLS4 search API returns no synonyms is simply wrong: the field is `exact_synonyms`, not `synonym`.
Only exact synonyms are accepted — `related_synonyms` are ignored because they can be broader or
narrower than the term. This raised the layer from 202 to 229 resolved labels.

Two further corrections came out of the same work:

- **The search index's own `label` can disagree with the term**, so it is now used only to *propose*
  ids; the label that reaches the graph is always read from the OLS4 term endpoint. Measured
  disagreements: the index calls UBERON:0010408 "ocular angle artery" while the term's label is
  "Angular artery" (whose definition *is* the human angular artery, terminal part of the facial
  artery), and it called UBERON:0006198 "dorsal intercostal artery" while the term's label is
  "Supreme intercostal artery", defined as the highest intercostal artery.
- **Uberon's synonymy is not anatomy.** Two names were refused although an exact synonym matched.
  `Aortic arch` is an exact synonym of UBERON:0004363, which is the **pharyngeal arch artery** — the
  *embryonic* arch artery — so the mesh is mapped to the adult `arch of aorta` (UBERON:0001508)
  instead. `Medial plantar veins` matches UBERON:0006144, the medial plantar **digital** vein of the
  toes, a different vessel from the veins that accompany the plantar artery in the sole. Both
  refusals live in the resolver and are printed on every run.

### What was actually checked

- Every id was read from the OLS4 **term endpoint** (label plus synonyms), never from a search hit's
  label.
- Every `mesh_names` entry came from a loader dump of the shipping GLB, with sidedness read from the
  file's own `.l`/`.r` node names rather than guessed from a trailing letter. 255 of the layer's
  labels exist on both sides and became one row holding both mesh names.
- The graph was dry-run before it was touched (`incoming/check_vessel_resolution.mjs`): 0 id clashes
  with existing rows, 0 mesh names already claimed elsewhere, 0 Uberon ids used by two rows.
- `pnpm validate` passes, including the mesh-name-collision and duplicate-id invariants.

### Not checked, and not claimed

- No anatomist confirmed that each mesh is the vessel its name says. The verification is nominal and
  ontological — the same footing the rest of this graph stands on.
- 166 of the layer's 416 labels stay unmapped and are reported by the script rather than guessed at:
  segmental vessels of the lung, small named branches, and vessels Uberon does not model. A part is
  never mapped to its whole, which is why the M1/M3 segments of the middle cerebral artery, the
  abdominal and thoracic parts of the inferior vena cava and the divisions of the internal iliac
  artery remain unmapped.
- The heart's valves and leaflets, which this layer also carries, are part of the heart rather than
  the vessel tree, and were left to the heart rows instead of being claimed here.

### Two reviewed rows had stale notes corrected

`cardiovascular-system` and `blood-vasculature` both carried notes this batch made false ("no
per-vessel mapping yet"). They now state what is and is not mapped. Neither row's id, label, Uberon
id, layer or mesh names were touched and both keep `reviewed: true` — recorded here because a note is
part of what was reviewed.

## 2026-09-14 — stale `asset` placeholders, and the heart's own parts

Scope: 36 published rows whose source `asset` still read `"pending"`, four stale notes, and 5 new
`organ` rows for the heart's valves and interventricular septum (all `reviewed: false`).

### What was wrong

Every one of those 36 rows has been serving real data since 2026-09-02 while telling a reader "asset
pending" — a placeholder written when the graph was scaffolded and never corrected, because each later
batch fixed only the rows it touched. Three notes were stale in the same way: `heart` and `body` both
said "asset path after R2 sync", and `heart-left-ventricle`'s ASCT+B note was still a build-time TODO
("map mesh node before review") on a `reviewed: true` row that has been mapped for weeks.

### What was checked

- **All six Z-Anatomy R2 keys were ranged-GET through the Pages proxy and answered 206** before any
  value was written, so the strings name assets that exist.
- Visible-human file names are either already used elsewhere in this graph (`Allen_M_Brain.glb`,
  `VH_F_Uterus.glb`, …) or the HRA heart GLB the app itself loads for that body.
- **A new audit** (`incoming/audit_source_coverage.mjs`) asks whether every mesh name a row claims has
  a source that could have provided it, using the library prefix and the SEX the prefix encodes. It
  found two real gaps: `heart-left-atrium` listed both donors' meshes while declaring no
  visible-human source at all, and `heart-left-ventricle` listed a **woman's** mesh while declaring
  only a male table. Both now declare the HRA heart GLBs. The audit's first version was itself wrong —
  its sex rule was written for underscore names (`VH_F_Liver.glb`) and missed the hyphenated
  `3d-vh-f-heart.glb` — which is recorded here because a check that silently passes is worse than
  none.
- The five new ids were accepted **only on an exact Uberon label** at OLS4 (interventricular septum
  0002094, aortic valve 0002137, mitral valve 0002135, pulmonary valve 0002146, tricuspid valve
  0002134), and every mesh name came from a loader dump of the shipping heart GLBs — three group
  nodes carrying fourteen individually-named meshes each.
- **The ten named papillary muscles are left unmapped, with the reason and a test**: Uberon models
  them as a group, so filing five named muscles under one broad term would map a part to its whole.
  `structureIndex.test.ts` asserts both that the five new rows resolve from the mesh names a click
  produces and that the papillary muscles do not.

### Also corrected

Two unit tests used `VH_M_mitral_valve` as their example of "a mesh not in the graph". That name is
now a published row. The tests still passed, because they run against a hand-written fixture rather
than the published graph — which is exactly why the example was misleading: it read as a claim about
the product. Both now use a name no row can ever claim.

### Not checked

- No anatomist confirmed the valve meshes are the valves their names say.
- The Z-Anatomy cardiovascular layer names valve **leaflets**, not whole valves; those stay unmapped
  because a leaflet is part of a valve whose own row comes from the donor heart assets. A click on a
  leaflet on the reference body still reports "not mapped to a structure".

## 2026-09-14 — a reachability audit, and the two defects it found

New tracked tools in `packages/tools/` (documented in that package's README):
`dump_layer_meshes.mjs`, `analyse_layer_names.mjs`, `audit_mesh_reachability.mjs`,
`audit_source_coverage.mjs`.

`audit_mesh_reachability.mjs` checks the graph's core invariant — every published `mesh_names` entry
must be a string the app's loader really reports — against a loader dump of the asset each row
declares. Result over the whole graph: **1800 mesh names, 486 rows, all reachable, 0 rows
unverifiable.**

It found two real defects, neither visible in the interface:

1. **`aorta-ascending` declared the wrong asset.** Its meshes (`VH_M_ascending_aorta`,
   `VH_F_ascending_aorta`) live in the donor Blood_Vasculature assets — the row's own note said so —
   while the asset field named the HRA heart GLBs. The names were right; the documentation was not.
   (This one was introduced earlier the same day, by the batch that filled in the placeholder asset
   fields: it mapped that row to the heart GLBs by mistake.)
2. **`duodenum` claims `VH_M_hepatopancreatic_ampulla`**, which lives in `VH_M_Biliary_Tree.glb`, an
   asset the row did not declare.

Both are the same failure mode: the row is correct but points at the wrong asset, so nothing can
check it. A second audit, `audit_source_coverage.mjs`, asks a different question of the same kind —
could a declared source have supplied each mesh name, judged by the library prefix and the sex that
prefix encodes — and caught `heart-left-atrium` listing both donors' meshes with no visible-human
source at all, and `heart-left-ventricle` listing a woman's mesh while declaring only a male table.

**The audit was wrong twice before it was right**, which is worth recording: its first version
flagged 55 names as unreachable, and all 55 resolve fine, because the app normalises both sides
(`Pons.l` and `Ponsl` fold to the same key). Its multi-primitive rule then ran in the wrong
direction — it stripped `_N` off the registered name instead of accepting it in the dump — so
`Liver` and the five lung lobes read as missing when their dump entries are `Liver_1`,
`Inferior_lobe_of_left_lung_1`, … A check that reports failures nobody can reproduce is worse than
no check, so both mistakes are recorded here with their cause.

None of this is a review of anatomy. These audits check names, not meanings.

## Maintaining this log

When a batch is review-accepted, add an entry: the date, the scope, what was checked, what was
**not** checked, and anything held back with the reason. The point of this file is that "reviewed"
stays falsifiable — a reader should be able to see exactly how far the review went.
