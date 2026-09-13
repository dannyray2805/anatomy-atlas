# Agent rules

Read `docs/specs/00-truth-rules.md`, `docs/hoa-anatomy-cloudflare-playbook.md` and `docs/review-log.md` before any task.

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
- Data: R2 (D1 is intentionally unbound — see `wrangler.toml`)
- Package manager: pnpm

## Cloudflare bind names (`wrangler.toml`)

- R2: `ANATOMY_BUCKET`
- Secret: `DEEPSEEK_API_KEY` (Worker only, never frontend)

D1 (`anatomy_graph`) is deliberately **not** bound: the structure graph is compile-time JSON that CI
validates, so a database binding would have no consumer. Re-add it only alongside a real one.

App public config may include the Worker URL only. No API keys in Pages.

## Working style

- Small diffs. Touch only the files named in the task.
- Add or update a test when you change schema or loaders.
- Fresh session per playbook task (A, B, C, …). Do not chain the whole product in one context.

## Deploys (GitHub Actions)

`.github/workflows/deploy.yml` automates the deploy batch and runs on **every push to `main`** (plus manual `workflow_dispatch`).

- **Gate job** (`pnpm validate` + app tests + app build) must pass before anything deploys.
- **Deploy job** ships whatever was committed, exactly as committed: `wrangler pages deploy` (Pages `anatomy-atlas`), syncs the `content/published/facts/*.md` cards to R2 via `.github/scripts/sync-facts.mjs` — which uploads **only the cards whose bytes changed**, in parallel, against a manifest at `.sync/facts-manifest.json` in R2 (a missing manifest means it uploads everything, so it can fail slow but never skip a card) — then `wrangler deploy` (Worker, so its bundled `structures.json` is current). CI never flips a `reviewed` flag and never edits structures.json or card content.
- **Smoke job** hits production and fails the run if: `/api/structures` row count ≠ `content/published/structures.json` count, any `/api/facts/<facts_id>` returns non-200, the chat out-of-card question does not return exactly `{"reply":"NOT_IN_CARD"}`, or the deployed bundle does not carry every non-empty `VITE_*` value from `packages/app/.env.production`.
- **A red smoke job means the deploy already happened and production may already be broken** — treat it as needing immediate manual attention, not "we'll fix it on the next push." Follow `docs/deploy-runbook.md`: triage the failing check, then roll back the right layer (Pages revert is dashboard-only; Worker rollback is `wrangler rollback`).
- Secrets are referenced only via `${{ secrets.* }}`. Required names (added by a human in GitHub → Settings → Secrets and variables → Actions — never typed into a chat/terminal): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. `DEEPSEEK_API_KEY` remains a Cloudflare Worker secret (unchanged).
