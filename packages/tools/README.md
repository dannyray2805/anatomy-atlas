# Local converters

Run on your machine or a short-lived VM. Not on Cloudflare.

Planned scripts (agent may add, must not invent anatomy):

- Visible Human PNG/WebP downsample → R2
- Inspect HOA downsampled pyramids via `hoa-tools` / Fiji
- Emit `metadata.json` with pixel size from NLM or HOA docs only

## Layer inspection and mapping audits

Three tools that read a layer GLB the way the app does and check what the published graph
claims about it. All run from the repository root.

### `dump_layer_meshes.mjs` — the mesh names the app really sees

```text
node packages/tools/dump_layer_meshes.mjs <layer.glb> <out.tsv>
```

Groups every `Mesh` in a GLB by the object it came from, using three's own `GLTFLoader`.
**Every `mesh_names` entry in `content/published/structures.json` must come from here**, not from
the file's node names: the loader replaces whitespace with `_` and removes `[ ] . : /`, and it
names a multi-primitive object after the MESH DATA, so `Femur.l` and `Femur.r` both arrive as
`Femur` plus `Femur_1`. Writing a mapping from the file's own names is how rows end up dead on
arrival — the mesh renders, the click resolves to nothing, and nothing reports it.

The dumps for the shipped assets live in `incoming/` (gitignored). Regenerate any of them from
the assets, which are on R2 and in the upstream libraries named in `docs/sources.md`.

### `audit_mesh_reachability.mjs` — is any published mesh name unreachable?

```text
node packages/tools/audit_mesh_reachability.mjs
```

For every row, takes the assets its sources declare, finds the matching loader dump, and checks
each published mesh name against it. Exits non-zero when a name cannot be produced.

Two details it has to get right, both learned the hard way. It compares with the app's own
`normalizeMeshName`, so `Pons.l`, `Kidneyl` and `Middle_lobar_bronchusr` all pass — the app folds
both sides. And the multi-primitive rule runs in the *other* direction from the obvious one: the
scene reports the child as `<mesh data name>_1` and the app strips that suffix off the SCENE name,
so a registered name is reachable when the dump holds it or any `_N` child of it.

### `audit_source_coverage.mjs` — could a declared source have provided this mesh?

```text
node packages/tools/audit_source_coverage.mjs
```

Uses the library prefix (`VH_M_`, `VH_F_`, `Allen_`, …) and the SEX that prefix encodes to ask
whether a row has a source that could have supplied each mesh name it claims. It caught
`heart-left-atrium` listing both donors' meshes with no visible-human source at all, and
`heart-left-ventricle` listing a woman's mesh while declaring only a male table.

### `analyse_layer_names.mjs` — the vocabulary, before designing any mapping

```text
node packages/tools/analyse_layer_names.mjs <owners.tsv>
```

Prints how many meshes and labels a layer has, which nodes a published row ALREADY claims (so a
mesh is not mapped twice, which the graph validator rejects), the last-word histogram of the names,
and the full label list. Measure first: doing this before the skeleton, muscle and vessel passes is
what showed that Uberon matched only 25 of 123 bone and 76 of 305 muscle labels exactly.

## `compress_layers.mjs` — uniform Draco/weld compression of layer GLBs (P0, 2026-09-05)

Produces two derived variants of each R2-served layer GLB (male/female VH skin,
Z-Anatomy skeleton/muscle -v2): `-wq.glb` (weld + KHR_mesh_quantization —
decoded natively by three.js, no decoder) and `-dr.glb` (weld + dedup/prune +
KHR_draco_mesh_compression — smallest; needs a DRACOLoader, which drei wires
automatically). Name-preserving and topology-preserving: it never simplifies,
joins, flattens, or instances (that would change mesh identity / names). Outputs
land in `incoming/opt/`. See `docs/sources.md` → "P0 geometry compression".

Usage (from the repo root; @gltf-transform deps are devDependencies of this package). Run
it with plain `node` from the repo root — `pnpm --filter @atlas/tools exec` runs with the
package dir as cwd, so the script's `incoming/...` paths and its own path both break:

```text
node packages/tools/compress_layers.mjs
```

Source-of-truth GLBs are never overwritten; the original uncompressed R2 keys
stay as rollback, and new `-draco` keys are what `packages/app/.env` points at.

**Its printed numbers are NOT a safety check.** They are counted over unique mesh data blocks,
which `dedup()` deliberately collapses, so a large drop there can be exactly right (the
Z-Anatomy systems share mesh data: `cardiovascular-v1` reports 675 → 430 blocks with the body
unchanged). Verify a derivative with `compare_glb_scene.mjs` instead — see below.

## `compare_glb_scene.mjs` — prove a compressed GLB is scene-equivalent to its source

```text
node packages/tools/compare_glb_scene.mjs <source.glb> <derived.glb> [<source2> <derived2> ...]
```

Walks the NODE hierarchy and counts triangles per node (instanced) rather than per mesh data
block, and separates surface-bearing nodes from geometry-less ones. The contract it enforces:

- **must match** — the set of surface-bearing node names and how many there are. This is what
  `mesh_names` resolution and per-mesh picking depend on, and what the viewer draws.
- **may differ** — unique mesh data blocks (`dedup()` doing its job) and geometry-less nodes,
  which `prune()` drops (the Blender sources carry `.j` placeholders and vertex-only stubs).
- **reported** — instanced triangles, because Draco drops sub-quantization (zero-area) slivers:
  measured 0.53 % on `nervous-v1`, 0 % on cardiovascular/muscle/lymphoid, and an image diff of
  the two renders showed 10 of 1,638,400 pixels differing by more than 8/255.

Exit code is non-zero if any must-match field differs, so it can gate a batch. Use it before
uploading any new derivative; node names are the one thing compression may never quietly lose.

## `export_layers.py` — headless named-collection → GLB export (Blender)

Exports named collections from a `.blend` to glTF Binary (`.glb`), exactly as named,
without renaming/merging/substituting anything and without simplifying, retopologizing,
or decimating geometry. Requires Blender with the glTF 2.0 exporter (bundled and enabled
by default in 3.x–5.x).

Usage (run from the repo root; `blender` must be on PATH — otherwise pass the full path,
e.g. `"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"`):

```text
blender --background --python packages/tools/export_layers.py -- \
    <input.blend> <collection> <out.glb> [<collection> <out.glb> ...]
```

Every pair after the input file is `collection_name` + `output.glb` path. The script
fails loudly (non-zero exit) if any named collection is not found — it never skips or
substitutes one.

Current run (collections verified by eye in Blender; outputs land in `incoming/`, which
is gitignored — never commit `.glb` or `.blend`):

```text
blender --background --python packages/tools/export_layers.py -- \
    incoming/z-anatomy-src/<SOURCE.blend> \
    "1: Skeletal system" incoming/skeleton.glb \
    "4: Muscular system" incoming/muscle.glb
```

Notes:

- Every body-system collection is exported as named. Each system has exactly ONE flat `.g`
  title-glyph mesh that must be dropped with `--exclude` (query the inventory for MESH rows
  with polygons whose name ends `.g`); `5: Cardiovascular system` has no title mesh, and in
  that collection the `.g` names are FONT labels rather than meshes.
- Inspect every `.glb` visually in Blender/a viewer before it is considered for
  `content/published/structures.json` or R2.
- `<SOURCE.blend>` is the exact `.blend` to open (confirmed by the operator before use).

## `export_bp3d_skin.py` — BodyParts3D whole-body skin → GLB, placed in the body frame

Exports the BodyParts3D whole-body skin (`partof_BP3D_4.0_obj_99.zip` entry `FJ2810.obj`,
Representation ID BP10155, FMA7163 — the single whole-body skin in that archive) and places
it in the Z-Anatomy body frame, so it layers with `skeleton-v2` / `muscle-v3` as a same-frame
asset. Z-Anatomy contains no skin mesh of its own, so this file is the skin for that body; the
same individual, since Z-Anatomy is a retopologised BodyParts3D derivative.

Write to `z-anatomy-skin-v2.glb`. **Never regenerate v1**: it is the same geometry with the
source's inconsistent face winding (~46 % of faces backwards), withdrawn because three.js
backface-culls it into a see-through skin. v2 applies `repair_winding()`.

```text
blender --background --python packages/tools/export_bp3d_skin.py -- \
    incoming/bodyparts3d/skin.obj incoming/z-anatomy-skin-v2.glb
```

The placement is a millimetre→metre scale, identity axes, and ONE translation
`(+0.000507, +0.092159, +0.073328) m`, baked into the mesh data so the exported node transform
is identity. The translation is the mean of what three named landmarks imply (`Mandible`
FMA52748, `Nasal bone.r` FMA53647, `Manubrium` FMA7486 — each measured in BOTH sources, agreeing
with each other within ~7 mm) and an independent envelope-centring fit agrees with it within
5.5 mm. No rotation and no scale are applied. The script self-checks the import against the
file's own declared bounds and aborts rather than exporting a misplaced body.

Two traps it documents because they look plausible and are wrong: Blender's OBJ-import
default lays this Z-up file on its side, and `forward_axis="NEGATIVE_Y"` — the intuitive
"file is Z-up" choice — silently rotates the body 180° about Z.
