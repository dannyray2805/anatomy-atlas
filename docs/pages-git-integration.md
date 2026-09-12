# Cloudflare Pages ↔ GitHub Git integration — options and exact config

**Question this answers:** can deployment be "GitHub-integrated into Cloudflare" more natively than
it is today?

**Short answer:** the deploy already *is* GitHub-driven (push → GitHub Actions → Cloudflare), and
switching the existing Pages project to Cloudflare's own Git integration is **not possible** — it
would require creating a **new** Pages project and migrating pinned URLs with it. Recommendation at
the end.

## Verified constraints (Cloudflare docs, checked 2026-09)

| Rule | Source |
|---|---|
| "If you choose Direct Upload, you cannot switch to Git integration later. You will have to create a new project with Git integration." | Direct Upload docs |
| Conversely, a Git-integrated project cannot switch to Direct Upload later. **But** you can disable automatic deployments and keep deploying with `wrangler`. | Git integration docs |
| A Git-integrated build compiles a `functions/` folder; dashboard drag-and-drop does **not** (Wrangler does). | Direct Upload docs → Troubleshoot → Functions |
| Direct Upload projects have no dashboard production-branch control (API `PATCH` only). | Direct Upload docs → Troubleshoot |
| Cloudflare also offers **Workers Builds** (Git → build/deploy a Worker). | Git integration docs → note |

So `anatomy-atlas` (created as a Direct Upload project) is **stuck on Direct Upload**. That is not a
defect — it is a one-way door that was walked through when the project was created.

## What Git integration would and would not do

Would do:

- Cloudflare builds and deploys the static site on push, with preview URLs per branch and PR.
- Build status checks back in GitHub.
- Compile `functions/` (the `/api/*` proxy) as part of its build.

Would **not** do (still needs GitHub Actions):

- **Sync `content/published/facts/*.md` to R2** — this is what opens each structure's chat gate.
- **`wrangler deploy` the Worker** (its bundled `structures.json` must ship with content changes).
- Run `pnpm validate` / the test suite as a required gate before anything deploys.

You cannot have "Git integration only". At best you'd run **two** pipelines writing to the same
project, and whichever runs last wins — with `wrangler pages deploy` in Actions still present, the
Actions build would overwrite Cloudflare's.

## Hidden migration cost (why this is not a small switch)

These are pinned to the current project's hostname `anatomy-atlas-5ca.pages.dev`:

- `packages/app/.env.production` — every media URL is same-origin through the Pages proxy
  (`/api/media/...`): skin, vessels, skeleton, muscle, hero WebM/MP4/poster.
- `.github/scripts/smoke.mjs` — `BASE_URL`.
- `AGENTS.md` and this repo's docs (production URL references).

A new Pages project gets a **new** `*.pages.dev` hostname unless a custom domain is attached and
moved, so all of the above must change in the same batch or production breaks.

## Option A — keep Direct Upload + GitHub Actions (recommended)

Nothing to change. This is a GitHub-integrated deployment: no human runs wrangler, the gate must pass
first, and the post-deploy smoke verifies production. It is also the only option that can do the R2
fact sync and the Worker deploy, so Actions must exist regardless.

## Option B — migrate to a Git-integrated project (only if preview URLs are worth it)

1. **Create** Workers & Pages → Create application → **Pages** → **Connect to Git** → authorize the
   Cloudflare GitHub App → pick `dannyray2805/anatomy-atlas`, production branch `main`.
2. **Build configuration** (pnpm monorepo — set the root, not a package subdirectory):

   | Setting | Value |
   |---|---|
   | Root directory | *(repo root — leave default)* |
   | Build command | `pnpm --filter ./packages/app build` |
   | Build output directory | `packages/app/dist` |
   | `NODE_VERSION` (env var) | `22` |

   pnpm itself is pinned by `packageManager` in the root `package.json` (`pnpm@10.12.1`), which
   Cloudflare honours. Client-side `VITE_*` config needs **no dashboard variables**: it is committed
   in `packages/app/.env.production`, and Vite loads it during the build. (Do **not** put
   `DEEPSEEK_API_KEY` here — it stays a Worker secret.)
3. `functions/` at the repo root is compiled by the Git build, so `/api/*` keeps working.
4. **Then choose how the site actually ships:**
   - *Git builds it:* delete the `Deploy Pages` step from `.github/workflows/deploy.yml` (keep the R2
     sync + Worker deploy steps). Now two systems own different layers.
   - *Actions builds it:* set Branch control → **disable automatic production branch deployments**
     (documented as supported for Git-integrated projects). This keeps one deploy path but forfeits
     the preview URLs, which was the only reason to migrate.
5. **Update pinned URLs** in `packages/app/.env.production`, `.github/scripts/smoke.mjs` `BASE_URL`,
   `AGENTS.md`, and `docs/` to the new hostname — or attach the custom domain to the new project
   first so the hostname is unchanged.
6. **Verify** with `docs/deploy-runbook.md` (the smoke checks are host-agnostic apart from `BASE_URL`).

## Option C — Workers Builds for the Worker only

Cloudflare can now build and deploy the Worker from Git (Workers Builds), which would remove the
`wrangler deploy` step from Actions. It still cannot do the R2 fact-card sync, so Actions remains
required for that — and it adds a second place where deploy configuration lives. Not recommended at
this size.
