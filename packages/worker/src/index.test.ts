import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import worker from "./index.ts";
import type { Env } from "./index.ts";

type CardMap = Record<string, string>;

function makeR2(cards: CardMap) {
  const encode = (key: string) => new TextEncoder().encode(cards[key]);
  return {
    async head(key: string) {
      return cards[key] == null ? null : { size: encode(key).byteLength };
    },
    // Mirrors the real R2 contract: `size` is the FULL object size, while `range` describes the
    // slice actually returned (which is what the handler must report in Content-Range).
    async get(key: string, options?: { range?: { offset: number; length?: number } }) {
      const body = cards[key];
      if (body == null) return null;
      const bytes = encode(key);
      const { offset, length } = options?.range ?? {};
      const slice = offset == null ? bytes : bytes.slice(offset, length == null ? undefined : offset + length);
      return {
        size: bytes.byteLength,
        range: offset == null ? undefined : { offset, length: slice.byteLength },
        text: async () => new TextDecoder().decode(slice),
        arrayBuffer: async () => slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength),
        body: new Response(slice).body
      };
    }
  };
}

function makeEnv(cards: CardMap, deepseekKey = "test-key"): Env {
  return {
    ANATOMY_BUCKET: makeR2(cards) as unknown as Env["ANATOMY_BUCKET"],
    DEEPSEEK_API_KEY: deepseekKey
  };
}

const call = (path: string, init?: RequestInit, env?: Env) =>
  worker.fetch(new Request(`http://atlas.test${path}`, init), env ?? makeEnv({}));

// fetch spy so tests can assert whether DeepSeek was (or was not) called.
let fetchCalls: { url: string; init: RequestInit }[] = [];
let fetchReply = "spy reply";
const originalFetch = globalThis.fetch;

beforeEach(() => {
  fetchCalls = [];
  fetchReply = "spy reply";
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify({ choices: [{ message: { content: fetchReply } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("worker facts API", () => {
  it("GET /api/structures returns the published graph with edge cache", async () => {
    const res = await call("/api/structures");
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Cache-Control"), "public, max-age=3600");
    const body = (await res.json()) as { id: string }[];
    assert.ok(body.some((s) => s.id === "heart"));
  });

  it("GET /api/structures/:id returns one structure", async () => {
    const res = await call("/api/structures/heart");
    assert.equal(res.status, 200);
    const body = (await res.json()) as { id: string; label: string };
    assert.equal(body.id, "heart");
    assert.equal(body.label, "Heart");
  });

  it("GET /api/structures/:id unknown returns DATA_MISSING", async () => {
    const res = await call("/api/structures/nope");
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "DATA_MISSING" });
  });

  it("GET /api/facts/:id returns DATA_MISSING when no card is published", async () => {
    const res = await call("/api/facts/heart-left-ventricle");
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "DATA_MISSING" });
  });

  it("GET /api/facts/:id returns the card when published", async () => {
    const env = makeEnv({
      "content/published/facts/heart-left-ventricle.md": "## Function\nsourced sentence"
    });
    const res = await call("/api/facts/heart-left-ventricle", undefined, env);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      id: "heart-left-ventricle",
      markdown: "## Function\nsourced sentence"
    });
  });

  it("POST /api/chat without a published card returns DATA_MISSING and never calls DeepSeek", async () => {
    const res = await call("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "what is this?", structureId: "heart-left-ventricle" })
    });
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "DATA_MISSING" });
    assert.equal(fetchCalls.length, 0);
  });

  it("POST /api/chat for an unknown id returns DATA_MISSING and never calls DeepSeek (Task H)", async () => {
    const res = await call("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "what is this?", structureId: "not-a-real-structure" })
    });
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "DATA_MISSING" });
    assert.equal(fetchCalls.length, 0);
  });

  it("POST /api/chat assembles a citation-bounded system prompt and passes a grounded reply", async () => {
    const card =
      "## Identity\n- The structure is labelled \"heart left ventricle\" (asctb-heart).\n- DOI `10.15151/ESRF-DC-1773964017`, 19.89 µm/voxel (hoa-heart-S-20-29).";
    const env = makeEnv({ "content/published/facts/heart-left-ventricle.md": card });
    fetchReply = "The structure is labelled heart left ventricle (asctb-heart).";
    const res = await call(
      "/api/chat",
      {
        method: "POST",
        body: JSON.stringify({ message: "tell me about it", structureId: "heart-left-ventricle" })
      },
      env
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as { reply: string };
    assert.equal(body.reply, fetchReply);
    assert.equal(fetchCalls.length, 1);
    const sent = JSON.parse(String(fetchCalls[0].init.body)) as {
      model: string;
      temperature: number;
      messages: { role: string; content: string }[];
    };
    assert.equal(sent.model, "deepseek-v4-flash");
    assert.equal(sent.temperature, 0.2);
    assert.equal(sent.messages[0].role, "system");
    const system = sent.messages[0].content;
    assert.ok(system.includes("ONLY the published fact card"));
    assert.ok(system.includes("NOT_IN_CARD"));
    assert.ok(system.includes("---BEGIN FACT CARD---"));
    assert.ok(system.includes("---END FACT CARD---"));
    assert.ok(system.includes(card));
    assert.ok(sent.messages[1].content.includes("heart-left-ventricle"));
  });

  it("POST /api/chat replaces an empty model reply with NOT_IN_CARD", async () => {
    const card = "## Identity\nsourced sentence (asctb-heart).";
    const env = makeEnv({ "content/published/facts/heart-left-ventricle.md": card });
    fetchReply = "";
    const res = await call(
      "/api/chat",
      { method: "POST", body: JSON.stringify({ message: "m", structureId: "heart-left-ventricle" }) },
      env
    );
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { reply: "NOT_IN_CARD" });
  });

  it("POST /api/chat replaces an uncited reply with NOT_IN_CARD", async () => {
    const card = "## Identity\nsourced sentence (asctb-heart).";
    const env = makeEnv({ "content/published/facts/heart-left-ventricle.md": card });
    fetchReply =
      "The left ventricle has the thickest myocardium and pumps oxygenated blood through the aorta.";
    const res = await call(
      "/api/chat",
      { method: "POST", body: JSON.stringify({ message: "m", structureId: "heart-left-ventricle" }) },
      env
    );
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { reply: "NOT_IN_CARD" });
  });

  it("POST /api/chat passes through the exact NOT_IN_CARD refusal", async () => {
    const card = "## Identity\nsourced sentence (asctb-heart).";
    const env = makeEnv({ "content/published/facts/heart-left-ventricle.md": card });
    fetchReply = "NOT_IN_CARD";
    const res = await call(
      "/api/chat",
      { method: "POST", body: JSON.stringify({ message: "m", structureId: "heart-left-ventricle" }) },
      env
    );
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { reply: "NOT_IN_CARD" });
  });

  it("GET /api/media/:key returns a stored preview with video/webm + CORS", async () => {
    const env = makeEnv({ "hoa/preview/s20-29-heart.webm": "fake-webm-bytes" });
    const res = await call("/api/media/hoa/preview/s20-29-heart.webm", undefined, env);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Content-Type"), "video/webm");
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), "*");
    assert.ok((res.headers.get("Cache-Control") ?? "").includes("31536000"));
  });

  it("GET /api/media/:key honors a Range request with 206", async () => {
    const env = makeEnv({ "hoa/preview/s20-29-heart.webm": "0123456789" });
    const res = await call(
      "/api/media/hoa/preview/s20-29-heart.webm",
      { headers: { Range: "bytes=0-3" } },
      env
    );
    assert.equal(res.status, 206);
    assert.equal(res.headers.get("Content-Range"), "bytes 0-3/10");
    assert.equal(await res.text(), "0123");
  });

  it("GET /api/media/:key streams the full object with an explicit Content-Length", async () => {
    const env = makeEnv({ "hoa/preview/s20-29-heart.webm": "0123456789" });
    const res = await call("/api/media/hoa/preview/s20-29-heart.webm", undefined, env);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Content-Length"), "10");
    assert.equal(res.headers.get("Accept-Ranges"), "bytes");
    assert.equal(await res.text(), "0123456789");
  });

  it("GET /api/media/:key supports an open-ended range (bytes=5-)", async () => {
    const env = makeEnv({ "hoa/preview/s20-29-heart.webm": "0123456789" });
    const res = await call(
      "/api/media/hoa/preview/s20-29-heart.webm",
      { headers: { Range: "bytes=5-" } },
      env
    );
    assert.equal(res.status, 206);
    assert.equal(res.headers.get("Content-Range"), "bytes 5-9/10");
    assert.equal(res.headers.get("Content-Length"), "5");
    assert.equal(await res.text(), "56789");
  });

  it("GET /api/media/:key supports a suffix range (bytes=-3)", async () => {
    const env = makeEnv({ "hoa/preview/s20-29-heart.webm": "0123456789" });
    const res = await call(
      "/api/media/hoa/preview/s20-29-heart.webm",
      { headers: { Range: "bytes=-3" } },
      env
    );
    assert.equal(res.status, 206);
    assert.equal(res.headers.get("Content-Range"), "bytes 7-9/10");
    assert.equal(await res.text(), "789");
  });

  it("GET /api/media/:key returns 416 for an unsatisfiable range", async () => {
    const env = makeEnv({ "hoa/preview/s20-29-heart.webm": "0123456789" });
    const res = await call(
      "/api/media/hoa/preview/s20-29-heart.webm",
      { headers: { Range: "bytes=20-30" } },
      env
    );
    assert.equal(res.status, 416);
    assert.equal(res.headers.get("Content-Range"), "bytes */10");
  });

  it("GET /api/media/:key ignores a malformed Range header and serves 200", async () => {
    const env = makeEnv({ "hoa/preview/s20-29-heart.webm": "0123456789" });
    const res = await call(
      "/api/media/hoa/preview/s20-29-heart.webm",
      { headers: { Range: "items=0-3" } },
      env
    );
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "0123456789");
  });

  it("GET /api/media/:key unknown returns DATA_MISSING", async () => {
    const res = await call("/api/media/hoa/preview/nope.webm");
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "DATA_MISSING" });
  });

  it("POST /api/chat rejects missing fields", async () => {
    const res = await call("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "hi" })
    });
    assert.equal(res.status, 400);
  });
});
