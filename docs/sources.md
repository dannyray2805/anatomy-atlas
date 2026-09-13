# Source register

Fill exact HOA DOI / voxel size before marking any tissue structure `reviewed: true`.
Do not let an agent invent rows.

| id | name | license | access | used_for | citation |
|---|---|---|---|---|---|
| nlm-vhp-male | Visible Human Male | NLM terms; acknowledge NLM | https://data.lhncbc.nlm.nih.gov/public/Visible-Human/Male-Images/ | whole-body slices / coarse volume | NLM Visible Human Project |
| hubmap-hra-glb | HRA 3D Reference Objects (HuBMAP CCF) | CC BY 4.0 | https://cdn.humanatlas.io/digital-objects/ref-organ/heart-{male,female}/v1.3/assets/3d-vh-{m,f}-heart.glb ; https://github.com/hubmapconsortium/ccf-3d-reference-object-library (VH_Male/v1.2 + VH_Female/v1.2) | per-sex VH body peel (Path 1): VH-M / VH-F skin + heart + blood vasculature, identity-nested within each sex (see docs/body-peel.md). Vasculature = VH_{M,F}_Blood_Vasculature.glb (v1.2, same individual frame as the skins), whole-layer `blood-vasculature` row — per-vessel node names not mapped yet | HuBMAP HRA ref-organ heart-male v1.3 + heart-female v1.3 (CC BY 4.0); hubmapconsortium/ccf-3d-reference-object-library VH_Male + VH_Female v1.2 (CC BY 4.0) — VH_M_Skin.glb / VH_F_Skin.glb / VH_{M,F}_Blood_Vasculature.glb are repo-wide CC BY 4.0, no per-asset exceptions |
| hubmap-asctb-heart | ASCT+B heart table | CC BY 4.0 | https://humanatlas.io | partonomy | HuBMAP ASCT+B heart |
| hoa-heart-S-20-29 | HOA heart dataset — donor S-20-29 | CC BY 4.0 | https://human-organ-atlas.esrf.fr/datasets/1773963465 (19.89 µm complete-organ, BM18) | tissue volume | Walsh et al., Science Advances; DOI 10.15151/ESRF-DC-1773964017 |
| uberon | Uberon ontology | CC BY 3.0 | http://purl.obolibrary.org/obo/uberon.owl | ids | Haendel et al. |
| wikipedia-ascending-aorta | Wikipedia — "Ascending aorta" (its anatomical prose reproduces public-domain Gray's Anatomy, 20th ed., 1918, p. 545) | CC BY-SA 4.0 (article); the reproduced Gray's text is public domain | https://en.wikipedia.org/wiki/Ascending_aorta | aorta-ascending fact card — anatomical reference (fetched 2026-09-05; NCI/NHLBI direct URLs returned 404, search engines blocked the fetch tool) | Wikipedia "Ascending aorta" (fetched 2026-09-05); Gray's Anatomy, 20th ed. (1918), p. 545 (public domain) |
| wikipedia-ventricle-heart | Wikipedia — "Ventricle (heart)" (the target of the "Right ventricle" redirect; right-ventricle prose therein is largely Gray's-derived) | CC BY-SA 4.0 (article); reproduced Gray's text public domain | https://en.wikipedia.org/wiki/Ventricle_(heart) | heart-right-ventricle fact card — anatomical relations reference (fetched 2026-09-06) | Wikipedia "Ventricle (heart)" (fetched 2026-09-06) |
| wikipedia-atrium-heart | Wikipedia — "Atrium (heart)" (the target of the "Right atrium" redirect; right-atrium prose therein) | CC BY-SA 4.0 (article) | https://en.wikipedia.org/wiki/Atrium_(heart) | heart-right-atrium fact card — anatomical relations reference (fetched 2026-09-06) | Wikipedia "Atrium (heart)" (fetched 2026-09-06) |
| wikipedia-liver | Wikipedia — "Liver" | CC BY-SA 4.0 (article) | https://en.wikipedia.org/wiki/Liver | liver fact card — anatomical reference (fetched 2026-09-12) | Wikipedia "Liver" (fetched 2026-09-12) |
| wikipedia-kidney | Wikipedia — "Kidney" | CC BY-SA 4.0 (article) | https://en.wikipedia.org/wiki/Kidney | kidney fact card — anatomical reference (fetched 2026-09-12) | Wikipedia "Kidney" (fetched 2026-09-12) |
| wikipedia-lung | Wikipedia — "Lung" | CC BY-SA 4.0 (article) | https://en.wikipedia.org/wiki/Lung | lung fact card — anatomical reference (fetched 2026-09-12) | Wikipedia "Lung" (fetched 2026-09-12) |
| wikipedia-stomach | Wikipedia — "Stomach" | CC BY-SA 4.0 (article) | https://en.wikipedia.org/wiki/Stomach | stomach fact card — anatomical reference (fetched 2026-09-12) | Wikipedia "Stomach" (fetched 2026-09-12) |
| wikipedia-spleen | Wikipedia — "Spleen" | CC BY-SA 4.0 (article) | https://en.wikipedia.org/wiki/Spleen | spleen fact card — anatomical reference (fetched 2026-09-12) | Wikipedia "Spleen" (fetched 2026-09-12) |
| wikipedia-pancreas | Wikipedia — "Pancreas" | CC BY-SA 4.0 (article) | https://en.wikipedia.org/wiki/Pancreas | pancreas fact card — anatomical reference (fetched 2026-09-12) | Wikipedia "Pancreas" (fetched 2026-09-12) |
| wikipedia-gallbladder | Wikipedia — "Gallbladder" | CC BY-SA 4.0 (article) | https://en.wikipedia.org/wiki/Gallbladder | gallbladder fact card — anatomical reference (fetched 2026-09-13) | Wikipedia "Gallbladder" (fetched 2026-09-13) |
| wikipedia-bladder | Wikipedia — "Bladder" (the target of the "Urinary bladder" redirect) | CC BY-SA 4.0 (article) | https://en.wikipedia.org/wiki/Urinary_bladder | urinary-bladder fact card — anatomical reference (fetched 2026-09-13) | Wikipedia "Bladder" (fetched 2026-09-13) |
| wikipedia-trachea | Wikipedia — "Trachea" | CC BY-SA 4.0 (article) | https://en.wikipedia.org/wiki/Trachea | trachea fact card — anatomical reference (fetched 2026-09-13) | Wikipedia "Trachea" (fetched 2026-09-13) |
| wikipedia-thyroid | Wikipedia — "Thyroid" | CC BY-SA 4.0 (article) | https://en.wikipedia.org/wiki/Thyroid | thyroid-gland fact card — anatomical reference (fetched 2026-09-13) | Wikipedia "Thyroid" (fetched 2026-09-13) |
| wikipedia-adrenal-gland | Wikipedia — "Adrenal gland" | CC BY-SA 4.0 (article) | https://en.wikipedia.org/wiki/Adrenal_gland | adrenal-gland fact card — anatomical reference (fetched 2026-09-13) | Wikipedia "Adrenal gland" (fetched 2026-09-13) |
| wikipedia-midbrain | Wikipedia — "Midbrain" | CC BY-SA 4.0 (article) | https://en.wikipedia.org/wiki/Midbrain | midbrain fact card — anatomical reference (fetched 2026-09-13) | Wikipedia "Midbrain" (fetched 2026-09-13) |
| wikipedia-pons | Wikipedia — "Pons" | CC BY-SA 4.0 (article) | https://en.wikipedia.org/wiki/Pons | pons fact card — anatomical reference (fetched 2026-09-13) | Wikipedia "Pons" (fetched 2026-09-13) |
| wikipedia-medulla-oblongata | Wikipedia — "Medulla oblongata" | CC BY-SA 4.0 (article) | https://en.wikipedia.org/wiki/Medulla_oblongata | medulla-oblongata fact card — anatomical reference (fetched 2026-09-13) | Wikipedia "Medulla oblongata" (fetched 2026-09-13) |
| hoa-s20-29-preview | HOA S-20-29 screen-capture preview (MP4 + WebM + poster) | CC BY 4.0 (derived from hoa-heart-S-20-29) | R2 `hoa/preview/` (archived; no longer on the page) | archived derived capture | Self-recorded axial fly-through from the official Neuroglancer viewer. RETIRED from the hero: the hero is reserved for official HOA/UCL cinematic media only (see note below) |
| brunet2024-movie1-hero | Control-heart cinematic WebM (hero) | per Radiology supplement (Brunet et al. 2024) — verify before reuse | R2 `hoa/hero/control-heart-cinematic.webm` (+ `-poster.webp`), served via `/api/media/*` (same-origin) | hero above the S-20-29 explorer | Radiology Movie 1: Siemens Healthineers Cinematic Anatomy render of a CONTROL adult heart (HiP-CT, UCL-led ESRF beamtime 1290). NOT donor S-20-29 — caption states this; the explorer below is S-20-29 (DOI 10.15151/ESRF-DC-1773964017). On-page caption is the source of truth. |
| bodyparts3d | BodyParts3D (Taro reference model) | CC BY-SA 2.1 Japan | https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html | underlying segmented-MRI source data for skin/skeleton/muscle meshes | Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K. BodyParts3D: 3D structure database for anatomical concepts. Nucleic Acids Res. 2009 Jan;37(Database issue):D782-5. Attribution string required by license: "BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan" |
| z-anatomy | Z-Anatomy (retopologized BodyParts3D derivative) | CC BY-SA 4.0 (stacked on CC BY-SA 2.1 Japan for underlying data) | https://github.com/Z-Anatomy | body context — skin/muscle/skeleton layer meshes, TA-labeled | Kervyn G., Z-Anatomy project. Derivative of BodyParts3D (Mitsuhashi et al. 2009). Attribution string: "Models from the Z-Anatomy project [CC-BY-SA 4.0]" + BodyParts3D attribution above |

## Operator checklist (human)

- [x] Open S-20-29 on the portal — DOI 10.15151/ESRF-DC-1773964017, 19.89 µm, Neuroglancer URL in .env
- [x] Record HuBMAP HRA release version for GLBs — heart-male v1.3 + VH_Male v1.2 whole-body skin (see hubmap-hra-glb row)
- [x] Wire HuBMAP VH-male whole-body skin — `VH_Male/v1.2/VH_M_Skin.glb` (CC BY 4.0) → `incoming/VH_M_Skin.glb`, R2 `hubmap/glb/skin-v1.glb`, `skin` structure row added (reviewed: false), 2026-09-04 — **superseded 2026-09-05 by Path 1 identity peel (the old heart-transform/bbox-fit registration is retired — see next item)**
- [x] Path 1 VH body peel (2026-09-05, `docs/body-peel.md`): per-sex VH-M / VH-F skin + heart at IDENTITY (same individual per sex); `VH_F_Skin.glb` (22,959,832 B) → R2 `hubmap/glb/skin-female-v1.glb`; `VITE_SKIN_GLB_MALE` / `VITE_SKIN_GLB_FEMALE` in `.env`; route rename `/heart-3d` → `/body` ("Visible Human body", old URL redirects); Z-Anatomy moved to `/reference` ("Reference Atlas", disclosed different individual). Muscle / full skeleton per sex remain unsourced → `DATA_MISSING` in the peel.
- [x] Blood vasculature layer (2026-09-05): VH_Male/v1.2 `VH_M_Blood_Vasculature.glb` (7,436,204 B) → `incoming/VH_M_Blood_Vasculature.glb`; VH_Female/v1.2 `VH_F_Blood_Vasculature.glb` (7,262,232 B) → `incoming/VH_F_Blood_Vasculature.glb`. Same folders as the skins → same-individual/frame verified; identity nesting INSIDE same-sex skin verified via three loader (male + female); 104 (male) / 108 (female) per-vessel node names, NO whole root node `VH_[MF]_blood_vasculature`; central/trunk arterial-venous tree scope (bbox ≈ 0.24 × 0.87 × 0.19 m) — NOT limb-to-fingertip peripheral. Draco → R2 `hubmap/glb/vasculature-v1-draco.glb` (1,022,644 B) + `vasculature-female-v1-draco.glb` (988,028 B). `VITE_VESSEL_GLB_MALE` / `VITE_VESSEL_GLB_FEMALE` in `.env`; `blood-vasculature` structure row added (UBERON:0004537, layer `vessel`, reviewed: false, whole-layer — clicks show not-in-this-dataset until per-vessel mapping)
- [ ] Download binaries into local `incoming/` (gitignored), then sync selected files to R2
- [ ] Map mesh node names → Uberon using HuBMAP metadata, not model guesses

Z-Anatomy / BodyParts3D (all body systems, plus the Taro skin layer):

- [x] Pin exact Z-Anatomy release/commit — `ba9a9360d7ca5bf8d834ce57a92b83f0809a9432` (2026-09-03), cloned `https://github.com/Z-Anatomy/The-blend.git` into `incoming/z-anatomy-src`
- [x] Export `Skeletal system` → `incoming/skeleton.glb` and `Muscular system` → `incoming/muscle.glb` (Blender 5.2 headless via `packages/tools/export_layers.py`, from `Z-Anatomy/Startup.blend` in the pinned clone) and visually verify both
- [x] Export the **skin layer** for the Z-Anatomy ("Taro") body — BodyParts3D `FJ2810.obj`, FMA7163, the single whole-body skin in the part-of archive and the SAME individual as Z-Anatomy (a retopologised BodyParts3D derivative; Z-Anatomy itself contains no skin mesh) — → `incoming/z-anatomy-skin-v1.glb` via `packages/tools/export_bp3d_skin.py` (2026-09-12). Millimetre→metre scale, identity axes, plus ONE landmark-derived frame translation `(+0.000507, +0.092159, +0.073328) m` baked in (mean of what `Mandible`/`Nasal bone.r`/`Manubrium` imply measured in both sources, which agree within ~7 mm; an independent envelope-centring fit agrees within 5.5 mm). No rotation, no scale. Contains the Z-Anatomy skeleton+muscle on Y (+17.2 mm) and Z (+11.2 mm); the muscle surface is ~1.8 mm wider than the skin at the extreme X and that is left as-is rather than scaled away, because a scale is not supported by the landmark evidence. Draco variant −90.2 % (4,900,972 → 480,924 B), decoded-placement deviation ≤ 0.047 mm. NOTE: this is the Taro body's skin, distinct from the HuBMAP VH-male/VH-female skins used by the `/body` peel.
- [x] Skin layer: R2 sync, `VITE_*` env, `structures.json` row and `layers.ts` (layer 0 of the Taro body) — done 2026-09-12. Wired as `VITE_Z_ANATOMY_SKIN_GLB` → `z-anatomy/glb/skin-v2-draco.glb` (481,472 B, verified 206). **v1 was withdrawn**, not merely superseded: 94,132 of its 203,382 faces (46.28 %) were wound backwards, so with the viewer's backface culling the skin let you see straight through it to the bones and muscle behind. v2 is the same geometry with `normals_make_consistent(inside=False)` applied (mean normal now points outward, +0.2618), same bounds, same vertex data. `z-anatomy/glb/skin-v1-draco.glb` is unreferenced and still on R2, pending deletion.
- [x] Muscle layer, connective-tissue exclusion — `incoming/muscle-v3.glb` (2026-09-12) drops the fascia/aponeurosis/retinaculum sheets that the "Muscular system" collection carries alongside the muscle bellies. Excluded by EXPLICIT object name (62 objects; `packages/tools/export_layers.py --exclude`), never by geometry or proximity. `Tensor fasciae latae.l/.r` is deliberately KEPT: it is a muscle, and a blind `fascia` substring match would have deleted it. Effect measured against the same skin: the fascia group (42 objects, 1,186 vertices outside the skin, worst mean 5.90 mm, max 26.15 mm) disappears entirely, while the muscle and ligament groups measure IDENTICALLY before and after (184 objects / 5,702 verts / max 24.48 mm), i.e. no muscle geometry changed. 987,733 triangles, 607 mesh nodes.
- [ ] Known residual skin fit (measured 2026-09-12): the Taro skin and the Z-Anatomy contents are not a matched surface pair, and this is NOT a registration error. The skeleton envelope is right (skin sits 9.2 mm above the skull top and 14.0 mm below the lowest bone, enveloping the skeleton front and back). But per-vertex depth against the skin is bimodal in effect: muscle median vertex is 17.66 mm INSIDE the skin while 5.82 % of muscle vertices are OUTSIDE it (tail to +26.12 mm); skeleton 3.82 % outside (tail to +43.73 mm). Worst by name: hand/forearm muscles (`Extensor digitorum` 23.6 mm), orbit (`Inferior rectus` 22.9 mm, `Levator palpebrae superioris` 22.7 mm), finger phalanges (25.5 mm), skull (`Sphenoid` 43.7 mm), foot muscles (`Flexor hallucis longus` 13.9 mm). An occlusion render (flat-colour depth test, immune to the sign ambiguity that concave regions cause in signed-distance tests) puts muscle in front of the skin over ~12 % of the figure's pixels in the along-y view — shoulders, central back, glutes, hands/wrists, lower legs — matching what `/reference` shows with Skin+Muscle on. Because the error is local and opposite-signed across the body, inflating the skin to hide it would disfigure the fingers (≈10 mm added to finger diameter per 5 mm of offset). Accepted and disclosed; see the `/reference` attribution text.
- [x] Export the remaining body systems (nervous, cardiovascular, visceral, joints, lymphoid) and wire them as `/reference` layers — 2026-09-12. Exported from the pinned clone by `packages/tools/export_layers.py` (MESH-only, title glyph excluded, beveled CURVE tubes converted to mesh so the vessel/nerve tree actually ships), Draco-compressed, uploaded to R2 as `z-anatomy/glb/<system>-v1-draco.glb` (plus the uncompressed originals), and wired as one toggleable layer each: `viscera` (organ), `cardiovascular-system` (vessel), `nervous-system` (nerve), `joints` (joint), `lymphoid-system` (lymphatic). All are the same body as the skeleton/muscle, hence `sameFrame`. They start HIDDEN and mount on demand (~9.9 MB and ~1,940 extra meshes together, against 885 for the three base layers), with a single “All systems” control. Whole-layer rows only: no per-organ/per-nerve TA → Uberon mapping yet, so their meshes report not-in-this-dataset when clicked. Two honest gaps are carried into the rows: `Pharynx.j` is absent from the visceral export (cause unknown; the actual pharynx surfaces do ship) and the eye's ciliary body has no surface geometry in the nervous-system source.
- [ ] Map each exported mesh's TA-labeled node names → Uberon/FMA ids — deferred (whole-layer rows only; no per-bone/per-muscle mapping yet, per truth rule 10)
- [x] Add `skeleton` + `muscle` rows to `content/published/structures.json` with `reviewed: false`
- [x] Sync exported GLBs to remote R2 (`wrangler r2 object put --remote anatomy-public/z-anatomy/glb/skeleton.glb --file incoming/skeleton.glb`, same for `muscle.glb`, 2026-09-03) — served via Worker `/api/media/*`, verified 206
- [x] Add `VITE_SKELETON_GLB` / `VITE_MUSCLE_GLB` to `packages/app/.env` (same-origin Pages `/api/media/z-anatomy/glb/...` URLs)

The HOA volume iframe embeds the portal's official "Visualize in Neuroglancer" link for dataset
1773963465 (same state URL as the portal button); it lives in `packages/app/.env` as
`VITE_HOA_HEART_ZARR` and is embedded verbatim.

## License note — Z-Anatomy / BodyParts3D (ShareAlike)

Unlike hubmap-hra-glb (plain CC BY 4.0), this source is CC BY-SA. Any GLB we
derive/export/optimize from the Z-Anatomy .blend files is a derivative work and
must be distributed under a compatible ShareAlike license if we distribute it at
all (e.g. serving it from R2 to the public app counts as distribution). Plan to
publish the converted GLBs (post-optimization) in a public repo or alongside the
app's own source, not just privately on R2.

## Donor-mismatch note

bodyparts3d / z-anatomy is a DIFFERENT real reference individual ("Taro",
Japanese MRI dataset) than nlm-vhp-male (Visible Human Male, used for the heart
and body-context slices). Combining them in one scene is anatomically valid as
two "typical adult" reference models, but the UI must disclose this the same way
it already discloses S-20-29 vs the control-heart hero video: skin/skeleton
layers get their own source banner, not folded into the existing Visible Human
body-context caption.

## Hollow-taxonomy note + sex-toggle scope (decided 2026-09)

Z-Anatomy's "8: Visceral systems" carries REAL male genital meshes — verified in
the pinned blend's collection dump (`incoming/collection_tree.json`): Testis.l/r,
Epididymis.l/r, Ductus deferens.l/r, Seminal gland.l/r, Prostate, Ejaculatory
duct.l/r, Glans penis, Corpus cavernosum/spongiosum of penis, Penis, Male
internal/external genitalia, Male genital system. It has NO female genital meshes
in the same dump (no ovary, uterine tube, uterus, vagina, clitoris, labia, or
"Female genital system" object). The female side exists only as empty placeholder
collections in the .blend hierarchy — treat those as placeholders, never as data.

Sex-toggle scope (only the Organs layer is sex-variant today):

- The Sex toggle currently affects ONLY the Organs layer (HuBMAP heart male/female
  GLBs). Skeleton + muscle (Z-Anatomy) are a single fixed male reference body and
  are SEX-INVARIANT: they render under both Male and Female. No caption is needed
  on them for now; revisit once more sex-invariant layers exist and the gap becomes
  noticeable to users.
- Future wiring of Z-Anatomy genital/reproductive meshes ("8: Visceral systems"):
  render them ONLY when Sex = Male; HIDE entirely when Sex = Female. Never show
  male-specific anatomy under a Female selection.
- Do not source or fabricate female-equivalent geometry to "balance" the male set.
  If a real female-anatomy source is identified later, that is a SEPARATE sourcing
  decision (same process as any other new source), not a stopgap.

## P0 geometry compression (2026-09-05)

Derived, topology-preserving Draco copies of every layer GLB the app serves from
R2 (see `docs/ui-vision.md` P0 and `packages/tools/compress_layers.mjs`):

| original key | new Draco key | original size | Draco size |
|---|---|---|---|
| `hubmap/glb/skin-v1.glb` | `hubmap/glb/skin-v1-draco.glb` | 5,931,700 B | 297,436 B |
| `hubmap/glb/skin-female-v1.glb` | `hubmap/glb/skin-female-v1-draco.glb` | 22,959,832 B | 761,020 B |
| `z-anatomy/glb/skeleton-v2.glb` | `z-anatomy/glb/skeleton-v2-draco.glb` | 8,178,956 B | 1,598,232 B |
| `z-anatomy/glb/skin-v2.glb` (uncompressed, uploaded 2026-09-12) | `z-anatomy/glb/skin-v2-draco.glb` | 4,900,972 B | 481,472 B |
| `z-anatomy/glb/muscle-v3.glb` (uncompressed, uploaded 2026-09-12) | `z-anatomy/glb/muscle-v3-draco.glb` | 20,748,988 B | 3,698,376 B |
| `z-anatomy/glb/muscle-v2.glb` (superseded 2026-09-12 — fascia included) | `z-anatomy/glb/muscle-v2-draco.glb` | 22,490,244 B | 4,001,180 B |
| `z-anatomy/glb/visceral-v1.glb` | `z-anatomy/glb/visceral-v1-draco.glb` | 6,799,408 B | 866,196 B |
| `z-anatomy/glb/cardiovascular-v1.glb` | `z-anatomy/glb/cardiovascular-v1-draco.glb` | 78,796,604 B | 5,215,944 B |
| `z-anatomy/glb/nervous-v1.glb` | `z-anatomy/glb/nervous-v1-draco.glb` | 34,020,776 B | 2,871,116 B |
| `z-anatomy/glb/joints-v1.glb` | `z-anatomy/glb/joints-v1-draco.glb` | 2,804,488 B | 581,076 B |
| `z-anatomy/glb/lymphoid-v1.glb` | `z-anatomy/glb/lymphoid-v1-draco.glb` | 2,256,560 B | 376,304 B |
| `incoming/VH_M_Blood_Vasculature.glb` (local only, NOT mirrored to R2) | `hubmap/glb/vasculature-v1-draco.glb` | 7,436,204 B | 1,022,644 B |
| `incoming/VH_F_Blood_Vasculature.glb` (local only, NOT mirrored to R2) | `hubmap/glb/vasculature-female-v1-draco.glb` | 7,262,232 B | 988,028 B |

The five Z-Anatomy system rows (124.7 MB raw → 9.9 MB Draco) were accepted only after
`packages/tools/compare_glb_scene.mjs` proved each derivative keeps **every surface-bearing node
name** — the thing `mesh_names` resolution and per-mesh picking depend on. That check exists
because the compressor's own summary prints counts over UNIQUE MESH DATA BLOCKS, which `dedup()`
legitimately reduces (cardiovascular: 675 → 430 blocks) while the rendered body is unchanged.
Two effects are measured and accepted rather than assumed: geometry-less nodes are pruned
(7/2/4/5/14 placeholder names per system, none carrying a surface), and Draco drops
sub-quantization slivers — 0.53 % of triangles on nervous-v1, 0 elsewhere, which an image diff
put at 10 of 1,638,400 pixels differing by more than 8/255.

Pipeline per asset: `weld()` (bitwise-identical vertices only — lossless) →
`dedup()`/`prune()` → `draco()` (KHR_draco_mesh_compression, edgebreaker,
pos 14 / normal 10 bits). Explicitly avoids `simplify`/`join`/`flatten`/
`instance` so mesh topology, node names, and per-mesh identity are preserved
(truth rules). A `-wq` (weld + KHR_mesh_quantization) no-decoder fallback is
also produced locally for each asset if Draco decode ever needs a fallback.
`.env` points at the `-draco` keys; the original uncompressed keys remain on R2
as rollback. Draco decodes at runtime via drei's built-in DRACOLoader (gstatic
decoder wasm). These are DERIVATIVE files of their rows above — the ShareAlike
note applies to the skeleton/muscle pair (CC BY-SA), the skins stay CC BY 4.0;
publish the compressed GLBs alongside the app source, not only on R2.
