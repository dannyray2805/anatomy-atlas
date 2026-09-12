# Deploy runbook — GitHub Actions → Cloudflare

Covers what to do when the production smoke test goes red. Push to `main` triggers the pipeline
(`.github/workflows/deploy.yml`): **gate** (validate + test + build) → **deploy** (Pages, then R2
fact cards, then the Worker) → **smoke** (against production).

## Read this first

The smoke job runs **after** the deploy. By the time it turns red, the new build is already live in
production — so a red smoke means production is (or may be) broken *right now*.
**Do not treat it as "we'll fix it on the next push."** Fix it now.

Two consequences worth remembering:

- **Re-running the workflow does not help.** It redeploys the same commit, i.e. the same bad build.
  A re-run only helps if the failure was transient (e.g. a propagation race).
- **Nothing rolls back automatically.** There is no rollback step in the workflow. The rollback is
  a human action, chosen from the triage below.

## Triage — which layer broke?

The four smoke checks map to four different owners. Find the failing check first.

| Smoke check | Message when it fails | Most likely layer | Go to |
|---|---|---|---|
| (a) row count | `/api/structures count N != structures.json count M` | Worker bundle or Pages proxy | B |
| (b) fact cards | `/api/facts/<id> -> HTTP 404` | R2 object missing/misplaced | C |
| (c) chat gate | `chat in-card ... never grounded`, or `out-of-card gate broken` | Worker chat code or `DEEPSEEK_API_KEY` | B |
| (d) bundle config | `deployed bundle is missing N/M production env value(s)` | Pages build lost its `VITE_*` config | D |

Check (a) looks like the scariest one and is usually benign: a Worker version takes a few seconds
to reach every edge, so an edge still serving the previous version reports the OLD row count for a
deploy that is already correct (this happened on 2026-09-12 — deployed 06:15:54, first check
06:16:02, reported `10 != 15`). The check therefore retries for ~40 s before failing, and logs
`waiting for the Worker version to propagate` while it does. If it still fails after that, the
Worker genuinely did not ship: confirm the deploy job ran `wrangler deploy` and that
`content/published/structures.json` in the deployed commit has the rows you expect.

## A. App / UI regression → revert the Pages deployment

**The CLI cannot roll back Pages.** Verified on wrangler 4.127.1: `wrangler pages deployment` exposes
only `list`, `create`/`deploy`, `tail`, `delete`. There is no `rollback` subcommand, so this step is
dashboard-only.

1. Get the candidate targets:

   ```bash
   wrangler pages deployment list --project-name anatomy-atlas
   ```

2. Cloudflare dashboard → **Workers & Pages** → **anatomy-atlas** → **Deployments** → find the last
   **Production** deployment from before the bad one → **⋯** → **Rollback to this deployment**.

Tip: each deployment also gets its own alias URL. This repo's history has used the
`<short-id>.anatomy-atlas-5ca.pages.dev` form (e.g. `d9330739.anatomy-atlas-5ca.pages.dev`), which
lets you *check the previous build* in a browser before you roll back to it.

If you can't reach the dashboard, the fallback is: revert the offending commit on `main` and push —
CI rebuilds and deploys the reverted state.

## B. API regression → roll back the Worker (CLI, seconds)

Worker rollback *is* supported in the CLI:

```bash
wrangler deployments list                              # find the last good version id
wrangler rollback <version-id> -m "restore after bad deploy"
```

`DEEPSEEK_API_KEY` is stored as a Worker secret, not as part of a version, so a rollback does not
disturb it. If check (c) failed because the key is *missing* rather than the code being wrong, a
rollback won't fix it — re-set the secret with `wrangler secret put DEEPSEEK_API_KEY` (the value is
never typed into an agent session or a terminal log).

## C. Content regression → restore the fact card on R2

Fact cards are synced to R2 by CI. Restore the previous committed version from git:

```bash
git show <good-ref>:content/published/facts/<id>.md > /tmp/<id>.md
wrangler r2 object put --remote "anatomy-public/content/published/facts/<id>.md" --file /tmp/<id>.md
```

**`--remote` is mandatory.** Without it wrangler writes to the *local simulation* and exits 0, so the
upload silently appears to succeed while production still 404s. This has bitten this repo before.

## D. Config regression → the `VITE_*` guard

Check (d) exists because of a real incident (2026-09-12): CI built the Pages app with no `VITE_*`
config, so production served an empty shell — `DATA_MISSING` on `/`, blank `/body` and `/reference`
canvases — and **still passed** the old smoke, because checks (a)–(c) only ever talk to `/api/*`.

If (d) fails:

1. Confirm `packages/app/.env.production` is committed and unmodified (`git log -1 -- packages/app/.env.production`).
   It is the committed build config; `.env` is gitignored and never reaches CI.
2. Confirm nothing wrote an empty override: `.env.production.local` / `.env.local` are *not*
   committed, so their presence in CI would be the anomaly.
3. Re-run the workflow once the file is correct.

## After any rollback — verify, don't assume

```bash
curl -s https://anatomy-atlas-5ca.pages.dev/api/health      # {"ok":true,"bucket":true}
curl -s https://anatomy-atlas-5ca.pages.dev/api/structures | head -c 200
```

Then load `/`, `/body` and `/reference` in a **fresh** browser tab. Do not judge from a cached page
fetch — a stale cached `/` has already made a *fixed* production look broken in this repo.

Note: the optional `browser-smoke` job (Playwright, `/body` + inventory + console errors) is
**opt-in** via manual `workflow_dispatch` with `run_browser_smoke: true`. It does not run on push,
so it is not part of the red/green signal on a normal deploy.
