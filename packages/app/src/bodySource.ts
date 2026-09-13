import type { Sex } from "./sex";

/**
 * Which individual's body the single pane is showing.
 *
 * This is a SOURCE choice, not a cosmetic Male|Female toggle: the three options are different
 * people (or different published assets of one person), and the pane must never imply they are
 * the same body. The naming is deliberately explicit for that reason.
 *
 *  - `reference` — Z-Anatomy “Taro” (a retopologised BodyParts3D derivative). The ONLY source
 *    with a complete interior (skin → muscle → skeleton → organs → vessels → nerves → joints →
 *    lymphatics), so it is the default: a peel with something inside it. It is a different
 *    individual from the Visible Human donors, and it is male — no female anatomy is published
 *    for it anywhere, so none is shown and none is invented.
 *  - `donor-male` / `donor-female` — the HuBMAP Visible Human. One real scanned individual per
 *    sex. Each publishes that person's skin, organs, blood vasculature, spine + pelvis and spinal
 *    cord (plus a contributed brain atlas, large intestine and one lymph node), all from the same
 *    individual so they nest at identity. What is NOT published for either of them is whole-body
 *    muscle and a full articulated skeleton — surfaced as “not in this dataset”, never filled in.
 *
 * Pure module: no `import.meta.env` at runtime, so node:test can import it (sex.ts cannot be
 * imported for value — it reads the environment at module load — hence the type-only import).
 */
export type BodySource = "reference" | "donor-male" | "donor-female";

/** Default body: the only source that actually has an interior to explore. */
export const DEFAULT_BODY_SOURCE: BodySource = "reference";

/** Display order in the body-source control (fullest body first). */
export const BODY_SOURCE_ORDER: readonly BodySource[] = [
  "reference",
  "donor-male",
  "donor-female"
];

/** Short control labels. */
export const BODY_SOURCE_LABELS: Record<BodySource, string> = {
  reference: "Reference body",
  "donor-male": "Donor male",
  "donor-female": "Donor female"
};

/** One-line honest identity for each source, shown beside the control. */
export const BODY_SOURCE_WHO: Record<BodySource, string> = {
  reference: "Z-Anatomy “Taro” — one male reference individual",
  "donor-male":
    "Visible Human male donor — skin, organs, brain, vessels, spine and cord",
  "donor-female":
    "Visible Human female donor — skin, organs, brain, vessels, spine and cord"
};

/** True for the per-sex Visible Human bodies (which are not the reference individual). */
export function isDonorSource(source: BodySource): boolean {
  return source !== "reference";
}

/**
 * The sex of the individual a source actually is — `null` for the reference body, which is a
 * single male individual and not a sex-selectable body. Callers must not present `null` as
 * “unknown sex”; it means the question does not apply to that source.
 */
export function sourceSex(source: BodySource): Sex | null {
  if (source === "donor-male") return "male";
  if (source === "donor-female") return "female";
  return null;
}

/**
 * Parse a `?body=` deep-link value. Defensive by design: unknown, empty, mis-cased or missing
 * values fall back to the default rather than throwing or rendering a broken pane.
 */
export function bodySourceFromQuery(value: string | null | undefined): BodySource {
  if (value && (BODY_SOURCE_ORDER as readonly string[]).includes(value)) {
    return value as BodySource;
  }
  return DEFAULT_BODY_SOURCE;
}

/**
 * The pane's shareable view state: which body, and which structure is open.
 *
 * WHY THIS EXISTS: the body control and the structure drawer are reachable only by clicking, so
 * before this the address bar never changed — you could not send anyone "the female donor's
 * uterus", or even "the donor body", and a reload dropped you back at the default. A reference
 * resource that cannot be linked to is much harder to cite, and citation is the point of this one
 * (see docs/review-log.md). `?structure=` makes a structure citable.
 *
 * A structure is identified by its register id (e.g. `liver`), never by a mesh node name: node
 * names are per-asset and per-donor (`VH_F_body_of_uterus`), so a link built from one would only
 * work on one body of one person.
 */
export type ShareState = {
  source: BodySource;
  /** A structure id, or null when nothing is open. */
  structure: string | null;
};

/**
 * Parse the view from a query string. Defensive like `bodySourceFromQuery`: these values arrive
 * from links people typed, truncated or hand-edited, so anything unrecognised falls back rather
 * than throwing.
 */
export function shareStateFromQuery(search: string): ShareState {
  const params = new URLSearchParams(search);
  const structure = params.get("structure");
  return {
    source: bodySourceFromQuery(params.get("body")),
    structure: structure && structure.trim() ? structure.trim() : null
  };
}

/**
 * Build the query string for a view. The default body is omitted, so a link to the default view
 * stays the bare URL, and the parameter order is fixed — that is what lets the caller compare this
 * against the current URL and skip a redundant history write on every render.
 */
export function buildShareQuery(state: ShareState): string {
  const params = new URLSearchParams();
  if (state.source !== DEFAULT_BODY_SOURCE) params.set("body", state.source);
  if (state.structure) params.set("structure", state.structure);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Resolve a source id against the configured list, falling back to the first configured one. */
export function resolveSource<T extends { id: BodySource }>(
  configs: readonly T[],
  id: BodySource
): T | undefined {
  return configs.find((config) => config.id === id) ?? configs[0];
}
