# 01 — Structure schema

See `packages/schema/src/structure.ts`.

Rules:

- `reviewed === true` is required before a hotspot shows prose.
- If `layer === "tissue"` then `hoa_dataset_doi` and `voxel_size_um` are required.
- `part_of` must point at an existing `id` or be null.
- `sources` must be non-empty when `reviewed` is true.
- No placeholder measurements unless the number exists in `docs/sources.md` or a published fact card.
