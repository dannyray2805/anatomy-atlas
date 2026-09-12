// Chat wiring for the citation-bounded tutor (Worker POST /api/chat).
//
// This module is deliberately PURE and .ts (not .tsx) so node:test can import it — the repo's
// node --experimental-strip-types runner cannot parse JSX. The truth rules live in the Worker
// (card-only system prompt + groundReply post-filter); nothing here repairs, extends or
// "helpfully completes" an answer. It only labels what the Worker returned.

/** Same-origin: the Pages Function `functions/api/[[path]].js` proxies this to the Worker. */
export const CHAT_ENDPOINT = "/api/chat";

export type ChatOutcome =
  | { kind: "answer"; reply: string }
  /** The Worker's citation gate refused: the card does not answer this. */
  | { kind: "not-in-card" }
  /** No published card for this structure, so the Worker refuses before calling the model. */
  | { kind: "no-card" }
  /** Worker reachable but DEEPSEEK_API_KEY is not set. */
  | { kind: "unconfigured" }
  | { kind: "error" };

/**
 * The tutor is only offered for structures that have a published fact card: the Worker returns
 * DATA_MISSING for anything else (it never calls the model without a card), so offering the box
 * would only ever produce a refusal.
 */
export function canAsk(structure: { facts_id?: string | null } | undefined): boolean {
  return Boolean(structure?.facts_id);
}

export function canSend(question: string): boolean {
  return question.trim().length > 0;
}

export function chatRequestBody(structureId: string, question: string) {
  return { structureId, message: question.trim() };
}

/**
 * Map an /api/chat response to a display state. Keyed off the response body where it is more
 * precise than the status code (the Worker uses 500 for "server not configured" and 502 for
 * "upstream failed"): an unreachable tutor must not be shown as an anatomy answer.
 */
export function interpretChatResponse(status: number, body: unknown): ChatOutcome {
  const obj = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  if (status === 200) {
    const reply = typeof obj.reply === "string" ? obj.reply.trim() : "";
    if (reply.length === 0 || reply === "NOT_IN_CARD") return { kind: "not-in-card" };
    return { kind: "answer", reply };
  }

  if (status === 404) return { kind: "no-card" };
  if (obj.error === "server not configured") return { kind: "unconfigured" };
  return { kind: "error" };
}
