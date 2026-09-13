#!/usr/bin/env node
/**
 * Sync the published fact cards to R2, uploading only what actually changed.
 *
 * Why this is not a `for f in ...; do wrangler r2 object put ...; done` loop any more: each
 * `wrangler r2 object put` costs ~10 s (measured: 11.6 s and 8.5 s for a 2.2 KB card) because the
 * cost is CLI startup, not the upload. Re-uploading all 42 cards on every push therefore spent
 * ~7 of a ~10 minute deploy re-sending files that had not changed, and a docs-only push paid it
 * in full. This keeps a manifest object in R2 (card id -> sha256) and uploads only differences,
 * eight at a time, so a normal push syncs nothing and a card-changing push takes seconds.
 *
 * The manifest lives ONLY in R2, never in the repo: it is deploy state, not content, and keeping
 * it out of `content/published/` means it can never be mistaken for a card (the graph validator
 * and the Worker both read that directory). If it is missing or unreadable the script uploads
 * everything, so losing it costs one slow deploy and cannot cause a card to be skipped.
 *
 * Cards that exist in R2 but no longer in the repo are REPORTED, never deleted: removing published
 * content is a human decision, and this script does not make it.
 */
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const BUCKET = "anatomy-public";
const FACTS_DIR = "content/published/facts";
const R2_PREFIX = "content/published/facts";
/** Deploy state, deliberately outside the served content path. */
const MANIFEST_KEY = ".sync/facts-manifest.json";
const CONCURRENCY = 8;
const WRANGLER_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * How to invoke wrangler. Overridable so the same script can be exercised locally, where wrangler
 * is not necessarily on PATH (`WRANGLER_CMD="npx wrangler" node .github/scripts/sync-facts.mjs`).
 * On Windows it must go through a shell: `npm install -g` leaves a `.cmd` shim that Node will not
 * spawn directly.
 */
const WRANGLER_CMD = process.env.WRANGLER_CMD || "wrangler";
const NEEDS_SHELL = process.platform === "win32";

const dryRun = process.argv.includes("--dry-run");

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Hash a card's TEXT with line endings normalised to LF.
 *
 * Git checks this repo out with CRLF on Windows and LF on the CI runner, so hashing raw bytes
 * would make the manifest machine-specific — and it did: a manifest written from a Windows
 * checkout made the next CI run see all 42 cards as changed. Markdown renders identically either
 * way, and a card whose only difference is its line endings is not a content change. Normalising
 * also keeps the manifest compatible with the one already in R2, which was written from an LF
 * checkout and therefore already holds these values.
 */
function cardHash(path) {
  return sha256(readFileSync(path, "utf8").replace(/\r\n/g, "\n"));
}

async function wrangler(args) {
  return run(WRANGLER_CMD, args, {
    maxBuffer: 32 * 1024 * 1024,
    timeout: WRANGLER_TIMEOUT_MS,
    shell: NEEDS_SHELL
  });
}

/** Run `tasks` with a bounded number in flight, preserving order of results. */
async function pooled(tasks, limit) {
  const results = [];
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  });
  await Promise.all(workers);
  return results;
}

async function readManifest() {
  const dir = mkdtempSync(join(tmpdir(), "facts-manifest-"));
  const file = join(dir, "manifest.json");
  try {
    await wrangler(["r2", "object", "get", `${BUCKET}/${MANIFEST_KEY}`, "--file", file, "--remote"]);
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (parsed && typeof parsed.cards === "object" && parsed.cards !== null) return parsed.cards;
    console.log("Manifest present but not in the expected shape — syncing everything.");
    return {};
  } catch {
    console.log("No readable manifest in R2 — first run, or it was removed. Syncing everything.");
    return {};
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const cards = readdirSync(FACTS_DIR)
  .filter((name) => name.endsWith(".md"))
  .sort()
  .map((name) => ({
    id: name.replace(/\.md$/, ""),
    path: `${FACTS_DIR}/${name}`,
    key: `${R2_PREFIX}/${name}`
  }));

if (cards.length === 0) {
  console.error(`No cards found in ${FACTS_DIR} — refusing to report a successful sync.`);
  process.exit(1);
}

const local = new Map(
  cards.map((card) => [card.id, cardHash(card.path)])
);

const previous = await readManifest();
const changed = cards.filter((card) => previous[card.id] !== local.get(card.id));
const vanished = Object.keys(previous).filter((id) => !local.has(id));

console.log(
  `${cards.length} card(s): ${changed.length} to upload, ${cards.length - changed.length} already current.`
);

if (vanished.length > 0) {
  console.warn(
    `In R2 but not in the repo (left alone, remove by hand if that is intended): ${vanished.join(", ")}`
  );
}

if (dryRun) {
  for (const card of changed) console.log(`  would upload ${card.key}`);
  console.log("Dry run — nothing uploaded.");
  process.exit(0);
}

if (changed.length > 0) {
  await pooled(
    changed.map((card) => async () => {
      await wrangler(["r2", "object", "put", "--remote", `${BUCKET}/${card.key}`, "--file", card.path]);
      console.log(`  uploaded ${card.key}`);
    }),
    CONCURRENCY
  );
}

// Written only after every upload succeeded: a manifest ahead of the objects would skip a card
// that never actually landed.
const manifest = {
  syncedAt: new Date().toISOString(),
  cards: Object.fromEntries(local)
};
const dir = mkdtempSync(join(tmpdir(), "facts-manifest-"));
const file = join(dir, "manifest.json");
writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await wrangler(["r2", "object", "put", "--remote", `${BUCKET}/${MANIFEST_KEY}`, "--file", file]);
rmSync(dir, { recursive: true, force: true });

console.log(`Synced ${changed.length} card(s); manifest updated at ${MANIFEST_KEY}.`);
