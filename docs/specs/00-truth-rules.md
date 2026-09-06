# 00 — Truth rules

1. You must not invent anatomical structures, measurements, vessel courses, innervation, variants, or physiology.
2. If a fact is not present in files attached by the user or in `content/published/`, say `DATA_MISSING` and stop.
3. Do not generate 3D organ meshes or “fix” geometry to look more complete.
4. Do not download or assume terabyte HOA datasets. Only use documented downsampled pyramids and one VOI.
5. Every UI label must bind to a `Structure.id` that exists in the schema/fixture.
6. Prefer Cloudflare Pages, R2, Workers, D1. Do not add AWS/GCP services unless asked.
7. Write small diffs. Touch only the files named in the task.
8. Add or update a test when you change schema or loaders.
9. Author structure rows and fact cards directly in `content/published/` with `reviewed: false` — that is the working source of truth (the app, graph validator, and worker serve from it), and placement is not the gate. Flipping a row/card to `reviewed: true` (and filling reviewer/date where the schema has them) is what waits for the user's explicit `REVIEW_ACCEPT`.
10. If you are unsure about anatomy, you are forbidden from guessing.

Footer required on every public view:

> Body context: NLM Visible Human. Organ geometry: HuBMAP HRA (CC BY 4.0). Tissue volume: Human Organ Atlas dataset [DOI], HiP-CT, [N] µm/voxel. Named structures: Uberon/FMA. Not for diagnosis.
