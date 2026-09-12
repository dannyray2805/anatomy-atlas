import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canAsk,
  canSend,
  chatRequestBody,
  interpretChatResponse
} from "./chat.ts";

describe("chat gating", () => {
  it("only offers the tutor when the structure has a published fact card", () => {
    assert.equal(canAsk({ facts_id: "heart-left-ventricle" }), true);
    assert.equal(canAsk({ facts_id: null }), false);
    assert.equal(canAsk({}), false);
    assert.equal(canAsk(undefined), false);
  });

  it("won't send an empty or whitespace-only question", () => {
    assert.equal(canSend("Where does it pump blood?"), true);
    assert.equal(canSend(""), false);
    assert.equal(canSend("   \n "), false);
  });

  it("trims the question into the request body", () => {
    assert.deepEqual(chatRequestBody("aorta-ascending", "  Where does it begin?  "), {
      structureId: "aorta-ascending",
      message: "Where does it begin?"
    });
  });
});

describe("chat response handling", () => {
  it("shows a grounded reply as an answer", () => {
    assert.deepEqual(
      interpretChatResponse(200, { reply: "It receives blood from the right atrium (uberon)." }),
      { kind: "answer", reply: "It receives blood from the right atrium (uberon)." }
    );
  });

  it("treats the exact NOT_IN_CARD refusal as not-in-card, never as an answer", () => {
    assert.deepEqual(interpretChatResponse(200, { reply: "NOT_IN_CARD" }), { kind: "not-in-card" });
  });

  it("treats an empty or missing reply as not-in-card", () => {
    assert.deepEqual(interpretChatResponse(200, { reply: "   " }), { kind: "not-in-card" });
    assert.deepEqual(interpretChatResponse(200, {}), { kind: "not-in-card" });
  });

  it("reports a missing card (404 DATA_MISSING) as no-card", () => {
    assert.deepEqual(interpretChatResponse(404, { error: "DATA_MISSING" }), { kind: "no-card" });
  });

  it("distinguishes an unconfigured tutor from an unreachable one", () => {
    assert.deepEqual(interpretChatResponse(500, { error: "server not configured" }), {
      kind: "unconfigured"
    });
    assert.deepEqual(interpretChatResponse(502, { error: "upstream failed" }), { kind: "error" });
  });

  it("never turns a non-JSON or unexpected response into an answer", () => {
    assert.deepEqual(interpretChatResponse(200, "not json"), { kind: "not-in-card" });
    assert.deepEqual(interpretChatResponse(503, null), { kind: "error" });
  });
});
