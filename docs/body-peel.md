# Body-peel decision doc — single-individual onion peel for male and female

Status: **APPROVED (2026-09-05) — Path 1 foundation chosen; Phase B (female first) in progress.**
No `structures.json` / `layers.ts` / `.env` code changes yet; this doc is the decision record.
Date: 2026-09-05 (updated 2026-09-05)
Author: agent draft, grounded in repo sources + HuBMAP CCF library listings (verified 2026-09-05)
Supersedes: the cross-individual registration threads of Tasks O–R for whole-body layers

## Goal

A true onion-peel experience — skin → muscle → skeleton → organs peeling outward/inward on
one body — that works for **both a male and a female** reference individual. Implied by the
repo's own hard constraints: layers that nest should belong to the **same individual**, and
missing data is `DATA_MISSING`, never fabricated.

## Why the current scene is not a true peel

Today `/heart-3d` mixes two different individuals:

- Skin + heart (organs): **HuBMAP VH** (male `VH_M_*`, female `VH_F_*`)
- Muscle + skeleton: **Z-Anatomy "Taro"** (a different male reference person)

Because muscle/skeleton are Taro and skin is VH-male, the skin had to be registered *into*
the Z-Anatomy body by hand/bbox fit (Tasks O–R). That fit can never be exact: two different
bodies differ in proportions and pose, which is the whole reason hands/limbs cannot both
align (Task R / R-manual). A "true peel" removes that problem by construction: every layer
of one sex comes from **one** individual and nests at identity.

## Verified source inventory (HuBMAP CCF `ccf-3d-reference-object-library`, v1.2)

Per-sex files confirmed present in the repo listing (GLB only, sizes as served):

| Layer | VH-Male (`VH_Male/v1.2`) | VH-Female (`VH_Female/v1.2`) |
|---|---|---|
| Skin | `VH_M_Skin.glb` ✅ ~5.9 MB | `VH_F_Skin.glb` ✅ ~22 MB |
| Heart | `VH_M_Heart.glb` ✅ | `VH_F_Heart.glb` ✅ |
| Other organs (lung, liver, kidney, pancreas, spleen, GI, bladder, brain, pelvis, …) | ✅ (same frame) | ✅ incl. uterus, ovaries, vagina, fallopian tubes, placenta |
| Vertebrae (spinal column only — NOT a full skeleton) | `VH_M_Vertebrae.glb` ✅ | `VH_F_Vertebrae.glb` ✅ |
| Whole-body muscle | ❌ (only small eye/knee muscle sets) | ❌ (only small eye/knee muscle sets) |
| Full articulated skeleton | ❌ | ❌ |
| "United" whole body | `VH_*_United.glb.zip` — ~68–85 MB; repo rule: never load united bodies as a scene asset | same |

Also relevant:

- **Z-Anatomy / BodyParts3D (Taro)**: full skeleton + whole-body muscle + organs, male only,
  **no skin**, no female. Collection dump `incoming/collection_tree.json` confirms 9 systems
  and no integument mesh. License CC BY-SA 4.0 / 2.1 Japan.
- **NLM Visible Human Project**: male **and** female real datasets, but 2D cryosections (used
  by the `/slices` explorer) — not a 3D mesh stack.
- HuBMAP VH-Male/VH-Female are internally **same-individual** and self-consistent: e.g. the
  VH-male heart sits inside `VH_M_Skin` at identity (verified in Task Q Phase 1), so VH skin
  + VH organs + VH vertebrae nest with **no transform**.

## Truth-rule implications

1. No fabricating muscle/skeleton geometry for either sex.
2. Any layer with no licensed real per-sex source stays `DATA_MISSING` (repo convention),
   not replaced by a different individual's layer silently.
3. Every asset added goes through the normal sourcing process
   (`docs/sources.md` register row, license check, `incoming/` download, R2 sync, `reviewed`
   stays a human call).
4. Registration: per-sex VH layers are identity (same frame). No bbox/heuristic placement is
   needed or permitted for same-individual layers.

## The unavoidable gap

Whole-body **muscle** and a **full articulated skeleton** are not provided by HuBMAP VH for
either sex, and no female whole-body muscle/skeleton exists in any currently-licensed source
we can use. So a literal skin→muscle→skeleton→organs peel for **female**, and full muscle/
skeleton for **male**, cannot be built truthfully today. Those layers must either:

- wait for a real per-sex source (Path 2 below), or
- stay out of the peel / show `DATA_MISSING`.

## Options

- **Path 1 — Per-sex VH bodies (truthful foundation).**
  Male = VH-M (skin + organs + vertebrae), Female = VH-F (skin + organs + vertebrae); each
  sex's layers nest at identity. Muscle + full skeleton are absent → `DATA_MISSING` in the
  peel (or Z-Anatomy male anatomy moves to a clearly-separate, disclosed "reference male
  anatomy" view that is never claimed to be that person's muscle/skeleton).
  Cost: female skin ≈22 MB (load budget to confirm); current muscle/skeleton visuals leave
  the peel.
- **Path 2 — Close the gaps with real data.** Source a properly-licensed per-sex whole-body
  muscle + full-skeleton set (same frame as the skin/organs if possible). If no such source
  exists, the gaps remain `DATA_MISSING`.
- **Path 3 — Hybrid interim.** Keep today's cross-individual mix (disclosed) while Path 1/2
  land; not a "true peel", just the current product.

## Recommended direction

**Path 1 as the foundation**, then **Path 2** for muscle/skeleton when a real source is
found. Path 3 only as a stopgap. Rationale: Path 1 is the only fully-truthful option today
and removes the entire cross-individual registration problem for the layers that exist.

## Decisions (human, 2026-09-05)

1. **Partial peel is fine to ship.** Skin + organs with muscle / full-skeleton
   `DATA_MISSING` is acceptable and not blocking; backfill later only if a real source
   appears. (Consistent with the project's "honest and incomplete beats complete and
   wrong" stance — `DATA_MISSING` has already shipped for other layers.)
2. **Female skin ≈22 MB is acceptable to start**, but the male/female size gap (5.9 MB vs
   22 MB) is flagged for a one-line sanity check as Phase B sub-step B0 (why is it ~4× a
   comparable mesh?). Not blocking. Also noted: **mesh compression (Draco) applied
   uniformly across ALL layer assets** (not singled out for female) is a near-term
   cross-cutting optimization — real performance/mobile-data win and not fabrication, so
   it does not touch the truth rules.
3. **Z-Anatomy is kept, demoted to its own clearly-separated "Reference Atlas" mode** —
   not retired. Tasks L–N sourcing/label/export work stays valuable. The Reference Atlas is
   explicitly labeled as a different individual than whichever body the peel is currently
   showing; it is for muscular/skeletal study, never claimed as that person's muscle/
   skeleton.
4. **The per-sex VH body REPLACES what `/heart-3d` currently does** (evolve that route in
   place), rather than adding another tab. Z-Anatomy content moves OUT of `/heart-3d` to
   its own new route/tab. No new overlapping "body" tab is added — avoids the
   "which of these is actually the body" confusion.

Net instruction: **Path 1 approved as the foundation. Partial peel ships. `/heart-3d`
becomes the true per-sex VH peel; Z-Anatomy moves to a labeled "Reference Atlas" route.
Flag the skin size gap; note Draco as a future cross-cutting task. Neither blocks Phase B.
Start Phase B — female first (B0 = inspect `VH_F_Skin.glb` first).**

## Proposed phases (each a human checkpoint)

- **Phase A (decision) — DONE 2026-09-05**: Path 1 approved. Z-Anatomy male muscle/skeleton
  becomes a separate, disclosed **"Reference Atlas"** mode/route (kept, not dropped).
- **Phase B (female first, biggest gap) — IN PROGRESS**: add VH-Female body —
  `VH_F_Skin.glb` + VH-F organs; verify identity nesting in the app; schema/structures
  rows (`reviewed:false`); sources.md register rows; R2 sync + `.env`.
  - **B0 (pre-step) — DONE 2026-09-05**: inspected `VH_F_Skin.glb` (22,959,832 B) with the
    app's three.js loader. Size cause: **not textures/images/cruft** (0 images, 1 opaque
    single-color material). It is a ~2.1× denser mesh than male AND near-unwelded topology:
    765,280 verts / 382,640 tris vs male 92,659 / 185,314. Female index ≈1.5 refs/vertex
    (male ≈6), so float32 position+normal arrays are ~8× male's → ~22 MB. Genuine geometry,
    fine to ship; a strong candidate for the Draco / pre-export weld follow-up. Female is
    slightly smaller: identity bbox ≈ [0.97 × 1.67 × 0.33] vs male [1.05 × 1.83 × 0.32],
    centered ~origin in its own frame (same pattern as male → VH-F organs should nest at
    identity).
- **Phase C (male skin swap)**: switch male skin to the same-individual VH-M body; retire the
  Task R bbox fit for skin (no longer needed at identity); keep the VH-M heart at identity.
- **Phase D (vertebrae + organ layers)**: optional progressive peel with VH vertebrae and
  more per-sex organs as real assets allow.
- **Phase E (sourcing)**: actively look for a real per-sex whole-body muscle/full-skeleton
  source; until found, those layers are `DATA_MISSING` in the peel.

## Resolved questions (2026-09-05)

1. Partial peel (muscle/full-skeleton `DATA_MISSING`) acceptable? **Yes — ship it; backfill
   only if a real source appears.**
2. Female skin ≈22 MB — acceptable load? **Yes to start**; B0 explains the size; Draco
   (uniform across all layers) filed as a cross-cutting follow-up.
3. Z-Anatomy male anatomy retired? **No** — demoted to a clearly-labeled separate
   "Reference Atlas" mode/route, disclosed as a different individual.
4. Per-sex body replaces `/heart-3d` framing or lives beside it? **Replaces `/heart-3d`**
   content (route evolves in place); Z-Anatomy moves to its own route.

## Not changed by this doc

`content/published/structures.json` (incl. `skin` row), `packages/app/src/layers.ts`
(incl. `SKIN_TRANSFORM`), `packages/app/.env`, `docs/sources.md`. This file records the
decision space only. Phase B code changes will touch these files **after** B0.

## Applied (2026-09-05, Phase B main work)

- Route realignment: `/heart-3d` → **`/body`** ("Visible Human body", nav label; old URL
  redirects). Z-Anatomy is on **`/reference`** ("Reference Atlas"). "Visible Human slices"
  and "HOA volume" kept (slices = NLM 2D; HOA volume = donor S-20-29 tissue volume).
- `layers.ts`: per-sex VH skin + heart at identity (sameFrame); Z-Anatomy → Reference Atlas
  builder. Tasks O–R cross-individual registration retired.
- `VH_F_Skin.glb` (22,959,832 B) → R2 `hubmap/glb/skin-female-v1.glb`; `.env`
  `VITE_SKIN_GLB_MALE` / `VITE_SKIN_GLB_FEMALE`.
- `content/published/structures.json` unchanged (existing `skin`/`heart` rows suffice; all
  `reviewed: false`).
