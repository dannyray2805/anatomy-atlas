# Local converters

Run on your machine or a short-lived VM. Not on Cloudflare.

Planned scripts (agent may add, must not invent anatomy):

- Visible Human PNG/WebP downsample → R2
- Inspect HOA downsampled pyramids via `hoa-tools` / Fiji
- Emit `metadata.json` with pixel size from NLM or HOA docs only

## `compress_layers.mjs` — uniform Draco/weld compression of layer GLBs (P0, 2026-09-05)

Produces two derived variants of each R2-served layer GLB (male/female VH skin,
Z-Anatomy skeleton/muscle -v2): `-wq.glb` (weld + KHR_mesh_quantization —
decoded natively by three.js, no decoder) and `-dr.glb` (weld + dedup/prune +
KHR_draco_mesh_compression — smallest; needs a DRACOLoader, which drei wires
automatically). Name-preserving and topology-preserving: it never simplifies,
joins, flattens, or instances (that would change mesh identity / names). Outputs
land in `incoming/opt/`. See `docs/sources.md` → "P0 geometry compression".

Usage (from repo root; @gltf-transform deps are devDependencies of this package):

```text
pnpm --filter @atlas/tools exec node packages/tools/compress_layers.mjs
```

Source-of-truth GLBs are never overwritten; the original uncompressed R2 keys
stay as rollback, and new `-draco` keys are what `packages/app/.env` points at.

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

- Source collections: `"1: Skeletal system"` and `"4: Muscular system"` (exact names,
  human-verified). Do not export other collections (vessels/nerve/organ/skin) here.
- Inspect every `.glb` visually in Blender/a viewer before it is considered for
  `content/published/structures.json` or R2.
- `<SOURCE.blend>` is the exact `.blend` to open (confirmed by the operator before use).
