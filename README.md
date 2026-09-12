# Anatomy Atlas

Personal educational explorer: whole-body context → named organs → authentic HiP-CT tissue volumes.

**Source of truth:** NLM Visible Human, HuBMAP HRA, Human Organ Atlas, Z-Anatomy (Reference Atlas). Not AI-generated anatomy.

Not for diagnosis.

## Reading order for an agent session

1. `AGENTS.md` — working rules. Author content directly in `content/published/` with `reviewed: false` (placement is not the gate); `reviewed: true` waits for your explicit `REVIEW_ACCEPT`.
2. `docs/specs/00-truth-rules.md` — the truth rules.
3. `docs/hoa-anatomy-cloudflare-playbook.md` — implementation blueprint.
4. `docs/sources.md` — the source/license register (human-maintained).

Run one isolated task per session. Never invent anatomy — output `DATA_MISSING` when a fact is not in the attached files or `content/published/`.

## Layout

```
content/published/     ← working source of truth: structures.json + facts/ (author directly, reviewed: false)
docs/                  ← specs (truth rules), body-peel, ui-vision, sources register
packages/schema        ← Structure + FactCard types
packages/graph         ← validate the published graph
packages/app           ← Pages UI (Vite + React + R3F): /body, /reference, HOA volume, Visible Human slices
packages/worker        ← facts + citation-gated chat (bundles content/published/structures.json)
packages/tools         ← local converters + compressors (Python/Node)
functions/             ← Pages Function proxy /api/* → Worker
incoming/              ← gitignored: GLBs, Zarr stores, throwaway scripts
```

## Env

`packages/app/.env` is gitignored. `packages/app/.env.example` lists every key with placeholders — copy it to `.env` and fill in real URLs before `pnpm dev`. No secrets ever go in the frontend; `DEEPSEEK_API_KEY` is a Worker-only secret.

## Cloudflare

Same account pattern as Numberra: Pages + R2 + Workers. See `wrangler.toml`.

Bindings/secret to create before deploy: R2 bucket `anatomy-public`, Worker secret `DEEPSEEK_API_KEY`. D1 is not bound — the structure graph is compile-time JSON that CI validates — so no database is required.

## Local

```bash
pnpm install
Copy-Item packages/app/.env.example packages/app/.env   # (cp on POSIX) then fill values
pnpm test
pnpm validate
pnpm build
```

Binaries belong in gitignored `incoming/`, then R2. Never commit GLBs or Zarr stores.
