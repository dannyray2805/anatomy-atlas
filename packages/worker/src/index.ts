import structures from "../../../content/published/structures.json" with { type: "json" };
import type { Structure } from "../../schema/src/structure";

export interface Env {
  ANATOMY_BUCKET: R2Bucket;
  anatomy_graph: D1Database;
  DEEPSEEK_API_KEY?: string;
}

const DATA_MISSING = { error: "DATA_MISSING" } as const;
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-v4-flash";
const CHAT_TEMPERATURE = 0.2;
const CACHE_HEADERS = { "Cache-Control": "public, max-age=3600" };

function json(data: unknown, status = 200, cacheable = false): Response {
  return Response.json(data, {
    status,
    headers: cacheable ? CACHE_HEADERS : undefined,
  });
}

function findStructure(id: string): Structure | undefined {
  return structures.find((s) => s.id === id);
}

// Fact cards live on R2 at content/published/facts/<id>.md (playbook layout).
// Until reviewed cards are published this returns null -> DATA_MISSING, which also
// gates /api/chat so DeepSeek is never called for an unpublished structure.
async function getFactCard(env: Env, id: string): Promise<string | null> {
  try {
    const obj = await env.ANATOMY_BUCKET.get(`content/published/facts/${id}.md`);
    return (await obj?.text()) ?? null;
  } catch {
    return null;
  }
}

async function chatWithDeepSeek(env: Env, system: string, userMessage: string): Promise<string> {
  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      temperature: CHAT_TEMPERATURE,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`);
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return body.choices?.[0]?.message?.content ?? "";
}

// Citation-bounded tutor prompt. The ONLY knowledge source is the published fact
// card; the model must never supplement from general knowledge.
function buildSystemPrompt(card: string): string {
  return [
    "You are a citation-bounded tutor for an educational anatomy atlas.",
    "Use ONLY the published fact card below.",
    "If the card does not contain the answer, reply exactly:",
    "NOT_IN_CARD",
    "Do not add anatomy, physiology, measurements, vessel courses, cell types, or variants from general knowledge.",
    'Do not complete or "helpfully explain" beyond the card.',
    "You may rephrase card sentences; you may not introduce new facts.",
    "Quote Uberon IDs and citation keys that appear in the card.",
    "",
    "---BEGIN FACT CARD---",
    card,
    "---END FACT CARD---",
  ].join("\n");
}

// Citation keys as they appear in a card: frontmatter `- "key"` list entries and
// in-body parenthetical citations `(key)`. Deliberately does not match backtick
// ids like `heart-left-ventricle` or quoted labels with spaces.
function citationKeysIn(card: string): string[] {
  const keys = new Set<string>();
  const keyRe = /[a-z][a-z0-9]*(?:-[a-z0-9]+)+/;
  for (const m of card.matchAll(/"([a-z][a-z0-9]*(?:-[a-z0-9]+)+)"/g)) keys.add(m[1]);
  for (const m of card.matchAll(/\(([a-z][a-z0-9]*(?:-[a-z0-9]+)+)\)/g)) keys.add(m[1]);
  if (keys.size === 0) {
    // Fallback: card uses no extractable keys, so require any hyphenated token.
    for (const m of card.matchAll(keyRe)) keys.add(m[0]);
  }
  return [...keys];
}

// Post-filter: drop anything not grounded in the card. Empty output, or output
// with no citation key from the card (and not the exact refusal) becomes
// NOT_IN_CARD. Never retry.
function groundReply(reply: string, card: string): string {
  const r = reply.trim();
  if (r === "NOT_IN_CARD") return "NOT_IN_CARD";
  if (r.length === 0) return "NOT_IN_CARD";
  const keys = citationKeysIn(card);
  if (keys.length > 0 && !keys.some((k) => r.includes(k))) return "NOT_IN_CARD";
  return reply;
}

// Serve derived media (preview WebM/poster) from R2. Key layout: hoa/preview/...
// (docs/sources.md records the preview as a derived asset of DOI 10.15151/ESRF-DC-1773964017).
// Public, cacheable, CORS-open (media is played cross-origin from the Pages app) and
// supports byte ranges so <video> can seek.
async function handleMedia(env: Env, key: string, request: Request): Promise<Response> {
  const obj = await env.ANATOMY_BUCKET.get(key);
  if (!obj) return json(DATA_MISSING, 404);
  const data = new Uint8Array(await obj.arrayBuffer());
  const contentType = key.endsWith(".webm")
    ? "video/webm"
    : key.endsWith(".webp")
      ? "image/webp"
      : "application/octet-stream";
  const base = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    Vary: "Origin"
  } as Record<string, string>;

  const range = request.headers.get("Range");
  if (range && /^bytes=(\d*)-(\d*)$/.test(range)) {
    const [, sRaw, eRaw] = /^bytes=(\d*)-(\d*)$/.exec(range)!;
    const start = sRaw === "" ? 0 : Number(sRaw);
    const end = eRaw === "" ? data.byteLength - 1 : Math.min(Number(eRaw), data.byteLength - 1);
    if (start <= end && start < data.byteLength) {
      const slice = data.slice(start, end + 1);
      return new Response(slice, {
        status: 206,
        headers: {
          ...base,
          "Content-Length": String(slice.byteLength),
          "Content-Range": `bytes ${start}-${end}/${data.byteLength}`
        }
      });
    }
  }
  return new Response(data, { status: 200, headers: { ...base, "Content-Length": String(data.byteLength) } });
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  let body: { message?: string; structureId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const { message, structureId } = body;
  if (!message || !structureId) {
    return json({ error: "message and structureId required" }, 400);
  }

  // Gate: never call DeepSeek without a published fact card for the structure.
  const card = await getFactCard(env, structureId);
  if (!card) {
    return json(DATA_MISSING, 404);
  }
  if (!env.DEEPSEEK_API_KEY) {
    return json({ error: "server not configured" }, 500);
  }

  try {
    const reply = await chatWithDeepSeek(
      env,
      buildSystemPrompt(card),
      `[Structure: ${structureId}]\n${message}`
    );
    return json({ reply: groundReply(reply, card) });
  } catch {
    return json({ error: "upstream failed" }, 502);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true, bucket: Boolean(env.ANATOMY_BUCKET) });
    }

    if (url.pathname === "/api/structures" && request.method === "GET") {
      return json(structures, 200, true);
    }

    const structureMatch = url.pathname.match(/^\/api\/structures\/([^/]+)$/);
    if (structureMatch && request.method === "GET") {
      const s = findStructure(decodeURIComponent(structureMatch[1]));
      if (!s) return json(DATA_MISSING, 404);
      return json(s, 200, true);
    }

    const factMatch = url.pathname.match(/^\/api\/facts\/([^/]+)$/);
    if (factMatch && request.method === "GET") {
      const id = decodeURIComponent(factMatch[1]);
      const markdown = await getFactCard(env, id);
      if (!markdown) return json(DATA_MISSING, 404);
      return json({ id, markdown }, 200, true);
    }

    const mediaMatch = url.pathname.match(/^\/api\/media\/(.+)$/);
    if (mediaMatch && request.method === "GET") {
      return handleMedia(env, decodeURIComponent(mediaMatch[1]), request);
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      return handleChat(request, env);
    }

    return new Response("Not found", { status: 404 });
  }
};
