# UI Vision — Anatomy Atlas (dark immersive "lab")

Status: **APPROVED** (2026-09-05). Approved by human review of the modern-UI recommendation ("Yes do that"). This doc is the capture of that direction. It is a design/UX spec, not a data claim — the truth rules in `docs/specs/00-truth-rules.md` still govern every label, caption, and structure resolution.

**Implemented so far (both shipped to Pages, anatomy-atlas-5ca.pages.dev):**
- **P0 — Performance (2026-09-05):** uniform Draco/weld compression of all four R2 layer GLBs via `packages/tools/compress_layers.mjs` (`-draco` R2 keys, `.env` rewired; male skin 5.93→0.30 MB, female skin 22.96→0.76 MB, skeleton 8.18→1.60 MB, muscle 22.49→4.00 MB).
- **P1 — Dark immersive layout (2026-09-05):** slim dark top bar with pill nav; `/body` + `/reference` render in a full-height "lab" stage with floating glass controls (Sex, Layers pills + peel slider), one dismissible context line + "Notes & licensing" popover, and a right-hand detail drawer (no permanent empty sidebar). Home (HOA) + slices restyled to the dark theme. Truth semantics unchanged.
- **P2 — Interaction (2026-09-05):** hover → highlight + small floating label (resolved via structures.json; unmapped mesh → quiet "? Not in this dataset" chip); click → right drawer (from P1); camera presets Front / ¾ / Top with smooth fly + idle auto-orbit; search-to-fly that only offers structures actually present as mapped meshes in the current body/sex/layer state (honest — no dead-end picks).
- **P3 — Peel experience (2026-09-05):** one-tap "▸ Peel skin / ⟲ Restore skin" action on the VH body; a spotlight "Guided peel" journey (Whole body → Peel the skin → Focus: left ventricle [when that mesh is mapped — male] or an honest "Inside: the heart" step [female/elsewhere]) with step dots, Back/Next/Done, and per-step layer + camera animation; exiting restores all layers. Guide appears only where a true outer→inner peel exists (per-sex VH body), never on the whole-layer Reference Atlas.
- **P3 follow-up checks + hardening (2026-09-05):** the two end-to-end reviews (female-guide pacing; throttled/mobile connection) both passed after one fix. Female final step now flies the camera to the **real `VH_F_heart` mesh** (node name verified in the loaded GLB — no fabricated pick; drawer stays closed because female mesh→structure mappings aren't published). Peel/guide controls are hidden until the current body's GLBs finish loading ("scene ready" gating), so the journey cannot race ahead of asset loads on slow connections — confirmed under slow-3G network + CPU throttle on the live site.

---

## 1. Why

The current UI is functional but reads as a plain technical page: a white document with a small black canvas, text-heavy banners, and an "Inspect a structure" panel that is empty until a click. The product goal is a credible education + curiosity experience ("true onion peel" per `docs/body-peel.md`) that is also visually modern and inviting. Every redesign decision below must keep the honesty guarantees (per-sex VH identity nesting, DATA_MISSING rows, real cited sources) intact.

This doc proposes the direction in phases, each ending in a human checkpoint before the next begins.

---

## 2. Design pillars

### P1 — Dark immersive "lab" layout

- Dark, low-glare canvas environment (deep neutral, not pure black) with a subtle vignette; the 3D body dominates ~70–80% of the viewport.
- Controls float over the canvas as glass pills/palettes instead of a document row:
  - **Sex** segmented control (Male / Female) — only on pages with a per-sex body.
  - **Layers** pills (Skin, Organs (heart)) + the reveal opacity control.
- Collapse the current amber/red banner stack into **one dismissible context line** (per-route dataset + individual disclosure) with a small **"Sources & licensing"** affordance that opens a popover (data from `docs/sources.md` register), instead of paragraph banners.
- Keep the thin header (route tabs) but restyle to sit on the dark theme.
- Selection detail moves to a **right-hand drawer** that slides in only when a structure is picked (no permanent empty panel).

### P2 — Interaction model

- **Hover** a mesh → subtle highlight + small floating label/tooltip with the structure name (resolved from `structures.json`; never guessed).
- **Unmapped part** (a mesh not in the graph) → quiet "?" chip / "not in this dataset", not a red error wall.
- **Click** → the right drawer slides in with the structure detail (reuse the existing `StructureSidebar` content, including the "Open S-20-29 HOA volume →" action where applicable).
- **Camera presets** — Front / ¾ / Top buttons; idle slow auto-orbit; drag to spin remains.
- **Search-to-fly** — type a structure name, camera flies to it (structure lookup drives the camera, mirroring the existing lookup → sidebar resolution).

### P3 — Peel experience (the "onion peel")

- Layer pills (Skin, Organs) act as a peel control; an explicit **peel** camera action hides the outermost visible layer so the next layer is revealed, with an animated transition between layers.
- **Guided mode** (education): step through skin → heart (→ future layers when sourced), each step showing the fact card content for that structure.
- Reveal semantics stay as implemented and verified: **at full opacity the outer layer fully occludes the inner one (heart hidden under skin); revealing = unchecking the outer layer or lowering opacity.** The heart is chest-anchored and never floats on the surface.

---

## 3. Truth guardrails (must survive any visual change)

- `DATA_MISSING` surfaces as a quiet "not in this dataset" chip on hover/selection — never a fabricated placeholder, never a red wall for a normal state.
- Hover/click resolution goes through `structures.json` via `structureLookup` — no side-channel names, no guessing.
- All captions keep per-sex VH same-individual identity and cross-individual disclosures (Z-Anatomy "Reference Atlas" is a different male; skeleton/muscle for the VH individuals remain DATA_MISSING).
- Accessibility: keyboard-operable controls, `aria` labels on pills/toggles, color-blind-safe highlight colors, focus-visible styling.
- **Performance first**: the visual experience only ships after assets are compressed (P0). A 22 MB female skin behind a "fast, responsive lab" aesthetic is a contradiction.

---

## 4. Audience pull

- **Curiosity**: body dominates the screen; one tap peels a layer; camera fly-through and animated layer transitions make exploring feel like an experience, not a settings page.
- **Education**: fact cards and a guided layer-by-layer peel (skin → heart) with links to the real donor volume give it a credibility edge over purely decorative anatomy toys — the data is real and cited.

---

## 5. Phasing (each phase is a human checkpoint)

| Phase | Scope | Gate |
|---|---|---|
| **P0 — Performance** | Draco/weld pass across all layer GLBs (uniform, all layers — not female-only). Female skin ~22 MB → ~3–4× smaller. Prerequisite for everything visual. | **DONE 2026-09-05** — female skin 0.76 MB; renders intact; deployed |
| **P1 — Dark immersive layout** | Full-bleed canvas, floating glass controls, slim dark header, right drawer replaces empty sidebar, banners collapsed to one info line + sources popover. | **DONE 2026-09-05** — human visual review passed; deployed |
| **P2 — Interaction** | Hover highlight + tooltip, click → drawer, camera presets + auto-orbit, search-to-fly. | **DONE 2026-09-05** — hover label, Front/¾/Top presets, auto-orbit, search-to-fly; deployed |
| **P3 — Peel experience** | Layer pill toggles + hide-outer-layer peel, guided educational mode, animated transitions. | **DONE 2026-09-05** — one-tap peel + guided journey with camera fly; deployed |
| **P4 — Single pane** | One body, one route: peel rail replaces layer toggles, Body source control replaces the Sex toggle, the four peer tabs collapse and HOA/slices become click-through deep dives. | **DONE 2026-09-13** — dev-verified; deploy is a separate gate |

---

## 6. Decisions recorded

- Human approved this direction on 2026-09-05 ("Yes do that" to the recommendation, then "continue with the capture and the recommendations").
- The heart-occlusion behavior is part of the peel semantics and is fixed/hardened in `VolumeViewer.tsx` (full opacity forces an opaque, depth-writing shell so an outer layer always occludes inner layers; `sameFrame` layers never accept alignment overrides).
- P0 (Draco/weld) is the agreed first implementation step after this capture — it benefits both the redesign and the 22 MB female skin.
- UI styling changes are cosmetic; they do not relax truth rules or data sourcing.

---

## 7. Out of scope for this capture

- No new anatomy data, layers, or sources (still gated by the truth rules / sourcing process).
- No generated 3D meshes, no beating-heart geometry, no fabricated female-equivalent anatomy.
- Not a Figma-to-code contract; treat this as the direction spec each phase implements and checks with a human.

---

## 8. Content pipeline decision (2026-09-05)

Priority decision: **content before more layers.** There is exactly one proven guided moment
(male "Focus: left ventricle"). Before sourcing new geometry, scale the guide on the existing
male heart where meshes *and* mappings already exist — right ventricle, then the atria, then
"out to the lungs" once any vessel mesh is available — to prove the mechanism generalizes.
Each new guided stop needs a real fact card (published facts/structures), never invented text.

Sequencing notes (grounded, with caveats):

- **Vasculature is content-shaped, not layer-shaped.** A vessel mesh directly extends the
  existing left-ventricle stop ("where blood leaves the heart") rather than sitting as a
  disconnected fourth layer. **STATUS 2026-09-05: pulled as a whole-layer Vessels pill** on
  `/body` (male + female). Existence, filenames, female twin, and same-individual identity
  nesting were all verified against the source repo before sourcing (`docs/sources.md`). The
  whole-layer wiring (structure row `blood-vasculature`, UBERON:0004537, layer `vessel`) is
  shipped; MOST per-vessel node names (103 male / 107 female) remain unmapped, so those mesh
  clicks still show "not in this dataset". First per-vessel structure added (2026-09-05):
  `aorta-ascending` (UBERON:0001496, layer `vessel`, part_of blood-vasculature, mesh_names
  `VH_M_ascending_aorta` + `VH_F_ascending_aorta`, reviewed:false) with a real fact card
  (`content/published/facts/aorta-ascending.md`) — verified resolving live on BOTH sexes.
  The guide now has an ascending-aorta stop ("Follow the aorta out"): male = 4 steps (whole
  body → peel → left ventricle → aorta), female = 3 steps (whole body → peel → aorta). Per-sex
  step counts derive from which structures actually resolve — never padded to symmetry; the old
  female "Inside: the heart" fallback is retired because female now ends on a real aorta card.
  "Out to the lungs" remains content-gated (needs more vessel fact cards).
- **Nervous system later.** Brain + spinal cord would be real (brain mesh license from its own
  contributor must be checked first); there is no whole-body peripheral nerve network in the
  current source, so "nerves throughout the body" stays DATA_MISSING.
- **Honest-positioning notes (product direction, not claims):** (1) radical source transparency
  is a differentiator — "the anatomy site that shows its work" via DATA_MISSING + visible
  citations; (2) the VH body is literally one real scanned donor, not an illustrated composite —
  worth saying explicitly in the UI; (3) free, no-login, ad-supported journey vs. subscription
  reference atlases. All three must stay truthful and never overclaim what a donor is or isn't.

---

## 9. Single pane of glass (2026-09-13, P4)

Human review: “I still not satisfied… multiple tabs and user confusing wondering which tab to go.
The site may require a restructuring into a single pane of glass focusing purely on human anatomy
and then on-click, interactive user experience will deep dive into the most interior parts.”

### What was actually wrong (measured, not guessed)

1. **The landing page was not anatomy.** `/` was a hero video plus a Neuroglancer iframe of one
   heart volume — a research volume viewer was the first thing a visitor met.
2. **Two rival bodies.** `/body` (HuBMAP Visible Human, per sex, skin + heart + vessels — honestly
   almost hollow) and `/reference` (Z-Anatomy “Taro”, the full eight-layer peel, male only). A
   visitor could not tell which to open, and neither was complete by itself.
3. **The real experience was mislabelled and hidden.** Only `/reference` supported peel + interior
   deep dive, its name read like a footnote, and its five systems started HIDDEN behind a
   “▸ All systems” pill — so the default view looked empty.
4. **Deep-dive targets were peer tabs.** The tissue volume and the cross-sections competed in the
   nav instead of being what you get when you click something.

The existing drawer (identity + published fact card + citation-gated tutor) was already the
on-click deep dive and was kept as-is.

### What shipped

- **One route: `/` is the body.** `BodyPage` owns the canvas; there is no route per body.
- **Body source control** (replaces the Male|Female toggle): `Reference body` | `Donor male` |
  `Donor female`, each with a permanent one-line identity (whose body it is). A toggle that
  silently swaps which *person* you are looking at is exactly the kind of thing that misleads, so
  the control now names the bodies. Default = **Reference body**, because it is the only source
  with a complete interior — the complaint was precisely that there was nothing inside.
- **Peel rail** (replaces eight independent layer pills): the body's layers in one canonical
  outer→inner order (`peel.ts`). A stop outside the peel point is struck through (already taken
  off), the outermost visible layer is where the peel currently ends, and the rest are available
  deeper in. Clicking a stop peels to it. Layers *inside* the peel point keep whatever the user
  set — a peel never silently switches on something deeper. `⟲ Restore` returns the body to its
  opening state.
- **Deep dives left the nav**: `/volume` (HOA tissue volume) and `/slices` (NLM cross-sections)
  are reached from a structure's drawer, and are also listed in the Notes & licensing panel. They
  keep their URLs so a specific view can still be linked.
- **The guided peel is unchanged and still donor-only.** Its stops are real mapped structures
  (right ventricle → left ventricle → ascending aorta) on the VH hearts. The reference body's
  heart meshes are not mapped to structures, so offering the journey there would be theatre; the
  pane simply does not offer it.
- **Legacy URLs redirect**: `/body` → `/?body=donor-male`, `/reference` → `/?body=reference`,
  `/heart-3d` → `/?body=donor-male`, `/volume/heart` → `/volume`. `?body=` is parsed defensively
  (unknown value → default; never a broken pane).

### New pure modules (unit-tested, no React)

- `bodySource.ts` — the source model, labels, identities, `?body=` parsing, donor sex mapping.
- `peel.ts` — `PEEL_ORDER`, `peelRail`, `peelTo`, `isPeeled`, `restorePeel`, `peelStops`. The rail
  reads each layer's **resolved** `visible` flag, so the peel order and the visibility defaults
  can never disagree.

### Consequence worth stating

On the reference body the peel makes **17 organs reachable** (and its ducts, bronchi and
brainstem), where before the default view offered no search at all.

**The male donor body now opens up too (2026-09-13).** 21 of his published assets are wired —
liver, lungs, kidneys, gallbladder and biliary tree, pancreas, spleen, thymus, small and large
intestine, urinary bladder, ureters, urethra and prostate, plus the spine, bony pelvis, spinal
cord, brain and one lymph node — which takes that body from **4 resolvable structures to 23 on
first paint (25 once the brain and lymph-node layers are mounted)**. The organs show on first
paint so peeling the skin reveals a real interior; the spine, cord, brain and lymph node are
opt-in because they are the heavy ones. Each layer is named for exactly what it holds
(`Spine + pelvis`, `Brain + cord`, `Lymph node`), never stretched to imply more.

Three of those assets come from **other labs** and are included deliberately, because the sources
are authentic and licensed: the large intestine (SBU), the Allen Institute brain atlas and an NIH
lymph node. What each one actually is — the brain is an atlas, not that donor's scanned brain; the
lymph node is one node, not a lymphatic system — is stated on its structure row and in the page's
notes, which is what keeps a composite reference body honest rather than pretending it is one
person's scan throughout.

The remaining gaps are surfaced rather than hidden: `Muscle · not in this dataset`, no full
articulated skeleton (only the spine, pelvis and cord), and a female donor body remains the only
female body there is — no female whole-body anatomy is published, so none is shown and none is
invented.

### Follow-ups (deliberately not done)

- A guided journey on the **reference** body would need its heart/viscera meshes mapped to
  structures first (and the existing heart cards touched, which would invalidate the human's
  pending review read). Content task, not a UI one.
- Per-structure mapping for bone, muscle, vessel and peripheral-nerve meshes — those clicks
  still, correctly, report “not in this dataset”.

---

## 10. Viewing theme — light / dark (2026-09-13)

Human review: “add light and dark toggle button with a icon as the current dark theme does not
have clear view of the anatomy.”

That is a correct reading of the dark theme's limitation: a dark backdrop flattens the shading of
the meshes, and the pale skeleton loses contrast against it. Dark stays the app's identity, but
light is a **viewing mode**, not a cosmetic alternative.

- **Switch**: an icon button in the top bar. The icon and the word name the theme you will *get*
  (`☀ Light` while dark), and `aria-label` states it as an action ("Switch to Light theme").
- **Persisted** per device (`localStorage`, versioned key `anatomy-atlas.theme.v1`), with a
  defensive parse — an unknown or unreadable value falls back to dark rather than leaving the pane
  unstyled. Private-mode storage failures are caught.
- **Applied as a document attribute** (`data-theme` on `<html>`), so every surface — including the
  3D viewing canvas, which is a CSS backdrop behind a transparent Canvas — switches together
  without any component needing to know the theme. `color-scheme` is set alongside it so native
  form controls and scrollbars follow.
- **No dark flash**: a tiny pre-mount script in `index.html` applies the remembered theme before
  React loads. Its key and accepted values must stay in sync with `src/theme.ts`.
- **The light viewing surface is deliberately not white.** A pure white backdrop washes out both
  the pale skeleton and the translucent skin, so it is a soft blue-grey
  (`#f4f7fc → #dde5f1 → #c7d3e6`) that light and dark meshes both read against. The vignette is
  softened to match rather than removed.
- Light-theme rules live in one labelled block in `styles.css`: palette variables first, then the
  handful of rules that carry hardcoded dark values (surfaces, gradients, shadows, drawer,
  canvas). Kept together so the two themes are compared and changed as a pair instead of drifting
  rule by rule.

---

## 11. Quiet disclosure + illustrative colour (2026-09-13)

Human review: “Ensure the Notes and Licensing pane is somewhere at the bottom of the page and not
obviously visible… embedded text on the page with not so visible font size.” and “Why the donor
female and male color is blue, see if real human skin color is possible even if it deviates from
originals… ensure to apply real color throughout the exterior and interior.”

### Disclosure is a bottom sheet that occupies no page height

The dismissible bar across the top of the pane is gone, and so is the in-flow footer. Disclosure
always lives in a **slim fixed strip along the bottom edge of the viewport** (30 px), which shows the
per-body disclosure line and a “Notes & licensing” affordance. Opening it slides a panel **up over
the pane** rather than pushing the layout down: measured, the page height is identical collapsed and
expanded (`scrollHeight` 1044 = viewport in both states, panel 436 px), so the pane never gains a
scrollbar and the body keeps the whole viewport.

Deliberate limits on “not obviously visible”: the line is **small and muted, never hidden**. It is
still present on every view (truth rule 10), still selectable and searchable, still exposed to
assistive technology, and a native `<details>` drives it — so it needs no JavaScript (it cannot be
lost to a script failure) and adds no state. The global `.site-credit` line is suppressed on the
body pane for the same reason it was moved: a second in-flow footer would only duplicate the strip
and push the pane past the viewport.

### Illustrative anatomy colour

Why: the sources are not coloured like anatomy. The HuBMAP Visible Human skin ships as **one flat
blue material (`#3566d5`)** and the Z-Anatomy/BodyParts3D layers are flat or near-flat, so the body
read as a 3D asset rather than as a body.

How: `anatomyColors.ts` (pure, unit-tested) resolves a mesh's colour as
**mapped structure tone → its layer's tone → nothing** (nothing = leave the asset's own colour
alone, so an unmapped or unknown layer is never given an invented colour). It is applied in
`VolumeViewer` as the material **base**, which keeps the existing picked-amber and hover-lighten
tints working on top of it, and the per-mesh structure lookup is cached on the mesh because the
material effect re-runs on every hover.

**This is presentation, not data.** The colours are conventional anatomy-illustration tones: they
are NOT measured from the scans, and they are not the skin or tissue colour of either donor. Only
geometry, names and structures come from the cited sources. That sentence lives beside the values
(`COLOR_DISCLOSURE`) and is shown to the reader under **Colour** in the notes footer, so the claim
and the caveat cannot drift apart.

Skin tone is deliberately a warm human tone and **not varied by sex** — inventing a per-sex tone
would assert something about the individuals that we do not know.
