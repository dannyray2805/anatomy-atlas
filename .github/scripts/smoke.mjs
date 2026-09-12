// Production smoke test for the Anatomy Atlas deploy (runs in GitHub Actions, after deploy).
// It never modifies anything — it asserts against the LIVE Pages/Worker endpoints.
// A failure here means production may already be broken (deploy ran before smoke), so it must
// fail loudly: the workflow exits non-zero.
//
// Checks:
//   a. /api/structures row count matches content/published/structures.json (read at runtime — not hardcoded)
//   b. every structures.json row with a facts_id has a 200 /api/facts/<facts_id>
//   c. the chat citation gate on one facts_id row: an in-card question must be answered,
//      and an obviously out-of-card question must return exactly {"reply":"NOT_IN_CARD"}
//   d. the deployed app bundle really carries the production env config (packages/app/.env.production).
//      This guards the failure mode found on 2026-09-12: the CI build ran without any VITE_* config,
//      so production served an empty shell — DATA_MISSING on / and blank /body + /reference canvases —
//      while checks a-c still passed, because they only ever look at /api/*.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const BASE_URL = (process.env.BASE_URL || "https://anatomy-atlas-5ca.pages.dev").replace(/\/+$/, "");
const STRUCTURES_PATH = resolve("content/published/structures.json");
const ENV_PRODUCTION_PATH = resolve("packages/app/.env.production");

// Env keys that are declared/documented but not referenced anywhere in app source, so Vite tree-shakes
// them out of the bundle. Listing a key here means "absence is expected and fine".
const ENV_KEYS_NOT_IN_BUNDLE = new Set(["VITE_WORKER_URL"]);
const GET_RETRIES = 10; // deploys can take a few seconds to propagate to the alias
const GET_DELAY_MS = 4000;
const CHAT_RETRIES = 3;
const CHAT_DELAY_MS = 6000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRetry(url, { method = "GET", body, retries = GET_RETRIES, delayMs = GET_DELAY_MS } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          accept: "application/json",
          ...(body ? { "content-type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(60000),
      });
      if (res.status < 500) return res; // 2xx/4xx are definitive; 5xx + network errors are retried
      lastErr = new Error(`HTTP ${res.status} for ${url}`);
    } catch (e) {
      lastErr = e;
    }
    await sleep(delayMs);
  }
  throw lastErr || new Error(`fetch failed for ${url}`);
}

let failures = 0;
const fail = (msg) => {
  console.error("FAIL:", msg);
  failures++;
};

// --- source of truth: the committed structures.json (this exact commit was deployed) ---
const structures = JSON.parse(await readFile(STRUCTURES_PATH, "utf8"));
if (!Array.isArray(structures)) {
  console.error("FAIL: structures.json is not a top-level array");
  process.exit(1);
}
const withFacts = structures.filter((s) => s.facts_id);

// a) structures row count matches live
{
  const res = await fetchRetry(`${BASE_URL}/api/structures`);
  const live = await res.json();
  if (!Array.isArray(live)) {
    fail("/api/structures did not return an array");
  } else if (live.length !== structures.length) {
    fail(`/api/structures count ${live.length} != structures.json count ${structures.length}`);
  } else {
    console.log(`ok  /api/structures -> ${live.length} rows (matches structures.json)`);
  }
}

// b) every facts_id card is published (non-200 fails the run)
if (!withFacts.length) fail("no structures.json row has a facts_id to smoke");
for (const s of withFacts) {
  const res = await fetchRetry(`${BASE_URL}/api/facts/${s.facts_id}`);
  if (res.status !== 200) fail(`/api/facts/${s.facts_id} -> HTTP ${res.status}`);
  else console.log(`ok  /api/facts/${s.facts_id} -> 200`);
}

// c) chat citation gate on one facts_id row
{
  const pick = withFacts[0];
  const post = (message) =>
    fetchRetry(`${BASE_URL}/api/chat`, {
      method: "POST",
      body: { structureId: pick.id, message },
      retries: CHAT_RETRIES,
      delayMs: CHAT_DELAY_MS,
    });

  // in-card: must be grounded. NOTE — ask a natural card-grounded question and retry a few
  // times rather than failing on the first NOT_IN_CARD: the worker's strict citation post-filter
  // refuses ANY uncited reply (e.g. a terse "UBERON:0002084" with no source token), and LLM
  // output is probabilistic. We only fail if the worker NEVER grounds across attempts — that is
  // the real regression signal (a worker that no longer grounds in-card questions at all).
  const label = pick.label || pick.id;
  const inQuestion = `Tell me about the ${label} using only its published fact card.`;
  let grounded = false;
  let lastIn = "";
  for (let attempt = 0; attempt < 3 && !grounded; attempt++) {
    const inRes = await post(inQuestion);
    lastIn = await inRes.text();
    try {
      const j = JSON.parse(lastIn);
      if (inRes.status === 200 && j.reply && j.reply !== "NOT_IN_CARD") grounded = true;
    } catch {
      /* keep lastIn for the failure message below */
    }
    if (!grounded) await sleep(3000);
  }
  if (!grounded) {
    fail(`chat in-card for ${pick.id} never grounded across 3 attempts (last: ${lastIn.slice(0, 140)})`);
  } else {
    console.log(`ok  chat in-card (${pick.id}) -> grounded, cited reply`);
  }

  // out-of-card: citation gate must return EXACTLY NOT_IN_CARD (this is the regression check
  // that has been done by hand on every deploy so far)
  const outRes = await post("What is the normal clinical value (numeric) for this structure in millimetres of mercury?");
  const outText = (await outRes.text()).trim();
  let outJson = null;
  try {
    outJson = JSON.parse(outText);
  } catch {
    outJson = null;
  }
  const isExact = !!outJson && outJson.reply === "NOT_IN_CARD" && Object.keys(outJson).length === 1;
  if (!isExact) fail(`chat out-of-card gate broken: expected {"reply":"NOT_IN_CARD"}, got ${outText}`);
  else console.log("ok  chat out-of-card -> NOT_IN_CARD (citation gate intact)");
}

// d) the deployed bundle carries the committed production config (catches an env-less CI build).
{
  // Minimal .env parser: `KEY=value`, optional double quotes (a quoted value may contain `#`,
  // which is exactly why the Neuroglancer URL is quoted — see .env.production).
  const parseEnv = (text) => {
    const out = {};
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!m) continue;
      let value = m[2].trim();
      if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else value = value.split("#")[0].trim(); // unquoted: an inline `#` starts a comment
      if (value) out[m[1]] = value;
    }
    return out;
  };

  const expected = Object.entries(parseEnv(await readFile(ENV_PRODUCTION_PATH, "utf8"))).filter(
    ([key]) => !ENV_KEYS_NOT_IN_BUNDLE.has(key),
  );

  if (!expected.length) {
    fail("packages/app/.env.production defines no non-empty config to verify");
  } else {
    // The SPA shell lists its built entry chunk(s); concatenate them and look for the values.
    const html = await (await fetchRetry(`${BASE_URL}/`)).text();
    const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);

    if (!srcs.length) {
      fail(`could not find any <script src> in ${BASE_URL}/ — cannot verify the built config`);
    } else {
      const bundle = (
        await Promise.all(
          srcs.map((s) => fetchRetry(new URL(s, `${BASE_URL}/`).toString()).then((r) => r.text())),
        )
      ).join("\n");

      const missing = expected.filter(([, value]) => !bundle.includes(value)).map(([key]) => key);
      if (missing.length) {
        fail(
          `deployed bundle is missing ${missing.length}/${expected.length} production env value(s): ` +
            `${missing.join(", ")} — the build ran without packages/app/.env.production, so the app ships ` +
            "with empty DATA_MISSING data layers",
        );
      } else {
        console.log(`ok  app bundle carries all ${expected.length} production env values (config baked in)`);
      }
    }
  }
}

if (failures) {
  console.error(`SMOKE FAILED with ${failures} failure(s)`);
  process.exit(1);
}
console.log("SMOKE PASSED — production API + chat citation gate verified.");
