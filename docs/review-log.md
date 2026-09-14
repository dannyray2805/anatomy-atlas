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

## 2026-09-14 — the nervous-system layer, and three rows that had never resolved

Scope: 157 new `nerve` rows for the Reference body's Z-Anatomy nervous-system layer, and three
already-`reviewed: true` brainstem rows corrected. Graph 486 → 643 rows.

### What was checked

- Every id accepted only on an **exact Uberon label or an exact synonym**, read from the OLS4 term
  endpoint (`incoming/resolve_nerves.mjs`). 160 of the layer's 315 names resolved, covering 293 mesh
  names; 116 matched the term's own label, 26 an exact synonym, 6 needed a rename.
- The dry run before the graph was touched: 0 mesh names already claimed elsewhere, 0 Uberon ids used
  by two new rows, and the 3 id clashes it found were the brainstem rows below.
- `packages/tools/audit_mesh_reachability.mjs` after the batch: **2087 published mesh names, all
  reachable from a loader dump, 0 rows unverifiable**. `audit_source_coverage.mjs`: 0 unaccounted.

### Three rows that had never resolved

`midbrain`, `pons` and `medulla-oblongata` were written from the FILE's node names (`Pons.l`) while
the loader reports `Ponsl`. They were `reviewed: true` with published fact cards and resolved for
nobody — a dead mapping behind a live-looking row, found by the reachability audit rather than by
anything in the UI. Their mesh names are corrected; the generic apply writes a row wholesale, which
would have dropped their `facts_id` and reset `reviewed`, so `incoming/repair_brainstem_rows.mjs`
restores both and rewrites each note to record what was wrong. `shared/apply_layer_mappings.mjs` now
refuses to overwrite a reviewed row unless it is explicitly told to, so this cannot happen quietly
again.

### Two mistakes made and corrected during the batch, recorded because both were silent

1. **Grouping by the object that owns a mesh mislabels anatomy.** The loader names a multi-primitive
   object after the mesh-data block, and that block can hold unrelated structures: the object `Ponsr`
   carries the pons AND the facial motor nucleus, the abducens nucleus, the salivatory nuclei and the
   vestibular nuclei. Grouping by the owner put all nine on the `pons` row, so a click on the facial
   nucleus would have reported "Pons". Labels now come from the mesh a click actually reports.
   This also recovered 15 more structures, because those nuclei are now their own names.
2. **An exclusion rule dropped mappable rows.** A first draft excluded anything containing "part of"
   and the "proprius" names. Uberon DOES name the opercular, orbital and triangular parts of the
   inferior frontal gyrus, so three real structures were being discarded by a rule, not by the
   ontology. The exclusions are now limited to names that are not structures at all, and the gate
   decides everything else.

### Not checked, and not claimed

- No anatomist confirmed the meshes are the structures their names say.
- 155 of the layer's names stay unmapped, and the reasons are recorded rather than smoothed over:
  Uberon has no term at all for several named nerves (iliohypogastric, genitofemoral, lateral femoral
  cutaneous); for others it names the structure with a qualifier its synonym list does not shorten to
  the asset's word (`Culmen` is "cerebellum vermis culmen", `Lens` is "lens of camera-type eye",
  `Lateral ventricle` is "telencephalic ventricle"); and a few are the source's own atlas
  abbreviations (`Lat Fis-ant-Horizont`).
- A limitation of the OLS4 search index, worth knowing for any future layer: some names exist as
  synonyms the search never returns. `Hippocampus` is an exact synonym of UBERON:0002421
  "hippocampal formation", yet no query form surfaces that term — so it stays unmapped even though the
  ontology does name it. The search index also claims exact synonyms the term record denies (`Lateral
  ventricle` for UBERON:0002285), which is why acceptance follows the TERM record, not the index.

## 2026-09-14 — the joint layer, and the end of the layer-by-layer mapping pass

Scope: 22 new `joint` rows for the Z-Anatomy periarticular layer, all `reviewed: false`. Graph
643 → 665 rows. This is the last of the Reference body's layers: every one of them now has its own
per-structure mapping, with what could not be mapped stated in the row, the route copy and here.

### What was checked

- 22 of the layer's 234 names resolved, covering 38 mesh names. Each id came from an exact Uberon
  label or an exact synonym read from the OLS4 term endpoint, or from one new documented route.
- The dry run first: 0 id clashes, 0 mesh names already claimed, 0 Uberon ids used by two rows.
- `packages/tools/audit_mesh_reachability.mjs` after the batch: **all published mesh names
  reachable from a loader dump, 0 rows unverifiable** (2087 → 2125 names).

### The one new acceptance route, and why it is narrow

Uberon qualifies many periarticular structures by the joint they belong to — the asset says
`Anterior cruciate ligament`, Uberon's term is `anterior cruciate ligament of knee joint`. So the
joint resolver accepts a term whose label is the asset's name followed by ` of …`, but ONLY when
exactly one non-obsolete Uberon term matches that way. An ambiguous name is refused rather than
decided here. It changed the outcome for one label (`Glenoid labrum` → "Glenoid labrum of
scapula"); the cruciate and talofibular ligaments turned out to match exactly after all, through the
term record rather than the joint qualifier. Every acceptance on that route is printed by the
resolver for reading.

### The ceiling here is the ontology, measured rather than assumed

212 of the layer's 234 names stay unmapped, and it is worth being precise about why, because "UBERON
has no term" is a strong claim: for the acromioclavicular ligament the search returns only
`coracoclavicular ligament`; for the fibular collateral ligament, only `anterolateral ligament of
knee`; for the medial meniscus, only `tibial plateau of tibia`; and for the knee's articular capsule,
only `synovial joint`. Those are different structures, so they are refused. The layer's mesh names
come from the 3 group objects and 404 nodes of `joints-v1.glb` (`packages/tools/dump_layer_meshes.mjs`),
and its row note now says how many are mapped and what is not.

### Not checked

- No anatomist confirmed the meshes are the structures their names say.
- No card was written for the new joint rows, so the tutor declines on them and the drawer says so.

## 2026-09-14 — the two Visible Human donors' own vessel trees

Scope: 76 rows — the 73 this batch wrote (26 new, 47 merged into rows the reference body's vessel
pass had already created) plus the one row (`aorta-ascending`) that already shared meshes with them.
Everything here is `reviewed: false`: the maintainer has not been asked for `REVIEW_ACCEPT` on it.

### What was checked

- **The layer's own vocabulary, before any mapping was designed.** 106 labels across both donors (90
  of them on both bodies), from loader dumps of `VH_M_Blood_Vasculature.glb` and
  `VH_F_Blood_Vasculature.glb` (`packages/tools/dump_layer_meshes.mjs`) — not from the files' node
  names, which the loader rewrites.
- **Every id, at OLS4.** Search proposes, the term endpoint confirms an exact label or an exact
  synonym, and the label written into the graph is the term's own. 86 of the 105 labelled meshes
  resolved, on the term's label for 81 of them and on an exact synonym for 5.
- **One row per structure.** Several wordings landing on one term produce ONE row holding both
  sides — 13 terms merged 26 side-worded labels (the `iliac`, `ophthalmic`, `rectal` and
  `brachiocephalic` veins, the central retinal artery and vein, and so on). The donor even splits one
  artery into two surfaces per body (`brachiocephalic_artery_a`/`_b`): 4 meshes, one row, because that
  is the same `_a`/`_b` mesh split, not two structures.
- **The audits after the batch**: `audit_mesh_reachability.mjs` — 2310 published mesh names, every
  one a name the loader really reports, 0 rows unverifiable. `audit_source_coverage.mjs` — 0 rows
  with an unaccounted-for mesh name. `pnpm validate` graph ok; 191 tests pass.
- **In the app**, because the graph is not the product: the male donor's Find list holds 72 options
  and the female's 73, including the two new uterine rows. That list is built from the same resolved
  inventory a click resolves against, so it is the click result, enumerated. A React duplicate-key
  warning seen mid-edit was chased down and is **not** a defect: the graph has 0 duplicate ids and
  exactly one `aortic-arch` row; it was stale hot-reload state from a half-written JSON file, and a
  clean load of `/?body=donor-male`, `/?body=donor-female` and `/structures` logs no errors.

### Defects found and fixed

1. **A side written as a leading word was not treated as a side.** The resolver recognised the
   source's `_L`/`_R` suffix (`opthalmic_artery_L` → "Left ophthalmic artery", with a side-less
   fallback to `ophthalmic artery`) but not its leading-word form (`VH_F_left_uterine_artery`), which
   it filed as an indivisible name — so the side-less fallback never fired and the female donor's
   uterine artery and vein stayed unmapped. That was a defect in the tool, not a gap in the ontology:
   `uterine artery` is UBERON:0002493 and `uterine vein` UBERON:8600058, both exact labels. Fixed,
   and the re-run's delta was measured rather than assumed: it produced **exactly** those 2 rows, and
   the other 15 unresolved labels stayed unresolved under the new rule. Coverage went from 92/104 and
   91/108 to **92/104 (male) and 95/108 (female)**.
2. **Case-sensitive grouping** split one structure into two rows that resolved to the same term (the
   source writes `left_renal_vein` and `Left_renal_vein`).
3. **Prefix-only alias matching**: an alias could only ever rewrite a name's first word, so a
   correction further into the name could not be expressed.
4. **A stale count in the graph's own note.** The whole-layer `blood-vasculature` row's source note
   said "73 of the ~104 vessel meshes each publishes are mapped" — a figure left behind by the
   previous, partial pass, i.e. the row was still claiming a mapping rate the graph no longer had. It
   was found by grepping the built bundle for the old number after updating the app's own copy, which
   is the same lesson as the donor-card batch: **when a batch changes what maps, audit the notes and
   cards that describe the mapping**. The note now carries the measured 92/104 and 95/108.
5. **That fix then destroyed a note of its own** — recorded because of how it failed rather than what
   it did. Refreshing the layer note matched rows by their asset string, so it also overwrote
   `aorta-ascending`'s own note: the one naming the two mesh nodes that justify the row. Distinguishing
   the two needed the asset string *and* the em-dash shape — the first "narrowed" attempt matched the
   row note as well and clobbered it a second time. The row note is restored, the refresh now touches
   only the layer-description note, and it was proven idempotent by running it twice and watching it
   report 0 rewrites.

### The aortic arch, refused for the second time

Search accepts UBERON:0004363 for the wording `aortic arch` — and that term is the **embryonic**
pharyngeal arch artery, which carries the adult wording as a synonym from embryology. These meshes are
the adult arch (UBERON:0001508). It is refused by the same documented `REJECT` table that caught it on
the reference body's vessel pass, it is printed on every run, and it is the reason neither the adult
arch nor "pharyngeal arch artery" appears twice in the graph.

### Not checked

- No anatomist confirmed that these meshes are the structures their names say. Their names are the
  source's, and the source is the donor's published model.
- **No fact card was written for any new row**, so the tutor declines on them and the drawer says so.
  The rows are `reviewed: false` and the flags claim no review.
- 15 labels stay unmapped. Each is recorded here with its evidence, because "UBERON has no term" is a
  strong claim:
  - **No term at all**: `anterior cardiac vein`, `anterior segmental right hepatic artery`,
    `posterior segmental right hepatic artery`, `middle hepatic artery branch of left hepatic artery`,
    `diagonal branch of ... left coronary artery` (both spellings), `posterior left ventricular
    branch`, `left/right posterior descending artery`, `oblique vein of left atrium` (searched as
    "vein of Marshall" too), `posterior vein of left ventricle` (the only hits are
    `posterior interventricular sulcus`, a sulcus, and `middle cardiac vein`).
  - **Part of a structure that has a term, and refused as such**: `Left/Right branch of portal vein`
    (parts of UBERON:0002017 `portal vein`); `anterior cardiac vein` against `cardiac vein`
    (UBERON:0004148). A part is never mapped to its whole.
  - **Its own name is ambiguous**: `Left marginal branch` — UBERON names a `left marginal vein` and a
    `right marginal artery`, and the source's name does not say which this is.
  - **The interesting one**: `Left circumflex artery`. UBERON:0035422 *is* the structure a clinician
    means by that name — "Circumflex branch of left coronary artery" — but neither its label nor any
    of its three synonyms (`circumflex coronary artery`, `left circumflex branch of left coronary
    artery`, `ramus circumflexus (arteria coronaria sinistra)`) is the asset's shorter wording, so the
    gate refuses it. It is recorded as a gap rather than accepted on a judgement call, because
    loosening an exactness rule to fit one preferred answer is exactly how the embryonic-arch error
    happened. Closing it deliberately would need a documented third route, the way the joint pass
    added one for `label + " of …"`.

## Maintaining this log

When a batch is review-accepted, add an entry: the date, the scope, what was checked, what was
**not** checked, and anything held back with the reason. The point of this file is that "reviewed"
stays falsifiable — a reader should be able to see exactly how far the review went.
