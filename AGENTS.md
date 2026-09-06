# Agent rules

Read `docs/specs/00-truth-rules.md` and `docs/hoa-anatomy-cloudflare-playbook.md` before any task.

## Truth

- Datasets and identifiers are the source of truth. You write software and drafts only.
- Never invent anatomical structures, measurements, vessel courses, innervation, variants, or physiology.
- If a fact is not in attached files or `content/published/`, output `DATA_MISSING` and stop.
- Do not generate or “complete” 3D organ meshes.
- `content/published/` is the working source of truth: author structure rows and fact cards there directly with `reviewed: false` (the app, graph validator, and worker serve from it). Placement is not the gate — flipping a row/card to `reviewed: true` (and filling reviewer/date where the schema has them) is what waits for the user's explicit `REVIEW_ACCEPT`.
- Do not download or assume terabyte HOA datasets. Use documented downsampled pyramids and one VOI only.

## Stack

- App: Vite + React + TypeScript + React Three Fiber + drei
- Volume: embed Neuroglancer or Vizarr pointing at OME-Zarr on R2 / HOA
- API: Cloudflare Worker
- Data: R2 + D1
- Package manager: pnpm

## Cloudflare bind names (`wrangler.toml`)

- R2: `ANATOMY_BUCKET`
- D1: `anatomy_graph`
- Secret: `DEEPSEEK_API_KEY` (Worker only, never frontend)

App public config may include the Worker URL only. No API keys in Pages.

## Working style

- Small diffs. Touch only the files named in the task.
- Add or update a test when you change schema or loaders.
- Fresh session per playbook task (A, B, C, …). Do not chain the whole product in one context.
