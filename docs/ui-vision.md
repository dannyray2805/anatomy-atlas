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
