import type { Structure } from "../../schema/src/structure";
import type { BodySource } from "./bodySource";

/**
 * The browsable index of everything this atlas actually documents.
 *
 * WHY: docs/review-log.md records that every published claim is sourced — but the structures were
 * reachable only by clicking around a 3D body or typing into a find box, which most visitors will
 * not do. For a reference resource the list of what it covers IS the product, so it needs to be
 * readable as a list, and each entry needs to be a link (see the shareable view in bodySource.ts).
 *
 * Honesty rules this module exists to enforce:
 *  - only structures with `mesh_names` are listed. A row with none is a whole-layer descriptor that
 *    nothing resolves to, so listing it would promise a click that does not exist.
 *  - each entry says WHICH body carries it, derived from the assets the meshes come from, so the
 *    link opens a body that really has it rather than a default that may not.
 */

/** Preferred body order when an entry exists on more than one (most complete body first). */
export const BODY_PREFERENCE: readonly BodySource[] = ["reference", "donor-male", "donor-female"];

/**
 * Which Visible Human asset a mesh name comes from.
 *
 * The prefix is a reliable signal because the three library folders name their assets `VH_M_*`,
 * `VH_F_*`, `SBU_M_*`, `SBU_F_*`, `NIH_M_*`, `NIH_F_*`. Verified against the real mesh-name dumps:
 * `incoming/check_body_prefix_rule.mjs` reports 0 mismatches across every structure whose meshes
 * are covered by the dumps, and 0 names that this rule would file as reference-only when they are
 * in fact on a donor (which would link a visitor to a body that does not carry the structure).
 */
const MALE_ASSET = /^(VH_M_|SBU_M_|NIH_M_)/;
const FEMALE_ASSET = /^(VH_F_|SBU_F_|NIH_F_)/;
/**
 * Two contributed models publish the SAME mesh names for both sexes: the Allen brain atlas (282 of
 * its 283 region names are byte-identical in the male and female files) and the NIH lymph node (all
 * 7 `Yao_` meshes are). So these name a mesh on BOTH donors, not on one.
 */
const BOTH_DONORS = /^(Allen_|Yao_)/;

/** Every body whose published assets carry at least one of these meshes, in preference order. */
export function bodiesForMeshNames(meshNames: readonly string[]): BodySource[] {
  const found = new Set<BodySource>();
  for (const name of meshNames) {
    if (BOTH_DONORS.test(name)) {
      found.add("donor-male");
      found.add("donor-female");
    } else if (MALE_ASSET.test(name)) {
      found.add("donor-male");
    } else if (FEMALE_ASSET.test(name)) {
      found.add("donor-female");
    } else {
      // Unprefixed names are the Z-Anatomy Reference Atlas body's own.
      found.add("reference");
    }
  }
  return BODY_PREFERENCE.filter((b) => found.has(b));
}

/**
 * Should a shared link mount the optional heavy systems to show the structure it names?
 *
 * A row carries its ANATOMICAL layer, which is not always the layer whose asset holds its meshes:
 * the heart chambers are classified `organ`, but the Reference body carries them in its "Heart +
 * vessels" system, which mounts lazily. So a link can open an entry and show nothing of it. The
 * missing check is bounded to the one case where mounting the systems can actually help:
 *  - the scene does not already hold the structure (nothing to do if it does), and
 *  - this body carries the structure at all — the same rule the index links on, so a link to a
 *    structure this body does not have (a femur on the female donor) never spends the download.
 */
export function linkNeedsSystems(
  meshNames: readonly string[],
  body: BodySource,
  structureId: string,
  mountedStructureIds: readonly string[]
): boolean {
  if (mountedStructureIds.includes(structureId)) return false;
  return bodiesForMeshNames(meshNames).includes(body);
}

export type IndexEntry = {
  id: string;
  label: string;
  uberon: string | null;
  layer: string;
  /** True when a published fact card exists, i.e. the entry can answer a question. */
  hasCard: boolean;
  /** Every body that carries it. */
  bodies: BodySource[];
  /** The body the link opens — the most complete one that has it. */
  body: BodySource;
  /** A relative URL that opens this structure on that body. */
  href: string;
};

/**
 * The link for one entry. The default body is omitted so reference-body links stay short, matching
 * `buildShareQuery` in bodySource.ts; `structureIndex.test.ts` round-trips these through
 * `shareStateFromQuery` so the two cannot drift apart.
 */
function hrefFor(body: BodySource, id: string): string {
  const structure = `structure=${encodeURIComponent(id)}`;
  return body === "reference" ? `/?${structure}` : `/?body=${body}&${structure}`;
}

/** Every documented structure, alphabetically. Rows with no meshes are omitted (see header). */
export function indexEntries(structures: readonly Structure[]): IndexEntry[] {
  return structures
    .filter((s) => (s.mesh_names ?? []).length > 0)
    .map((s) => {
      const bodies = bodiesForMeshNames(s.mesh_names ?? []);
      // A structure with meshes always has at least one body; the fallback keeps the type total
      // without inventing a body it is not on.
      const body = bodies[0] ?? "reference";
      return {
        id: s.id,
        label: s.label,
        uberon: s.uberon ?? null,
        layer: s.layer,
        hasCard: !!s.facts_id,
        bodies,
        body,
        href: hrefFor(body, s.id)
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export type IndexGroup = { layer: string; label: string; entries: IndexEntry[] };

/**
 * Group entries for display, in the caller's layer order (the peel order, so the index reads
 * outside-in like the body does). Layers the caller does not rank are appended alphabetically
 * rather than dropped — an unranked layer is a gap in the order, not a reason to hide structures.
 */
export function groupByLayer(
  entries: readonly IndexEntry[],
  layerOrder: readonly string[],
  labelFor: (layer: string) => string
): IndexGroup[] {
  const byLayer = new Map<string, IndexEntry[]>();
  for (const entry of entries) {
    if (!byLayer.has(entry.layer)) byLayer.set(entry.layer, []);
    byLayer.get(entry.layer)!.push(entry);
  }
  const ranked = layerOrder.filter((l) => byLayer.has(l));
  const unranked = [...byLayer.keys()].filter((l) => !layerOrder.includes(l)).sort();
  return [...ranked, ...unranked].map((layer) => ({
    layer,
    label: labelFor(layer),
    entries: byLayer.get(layer)!
  }));
}

/** Counts for the summary line, so the page can state its own coverage rather than imply it. */
export function indexSummary(structures: readonly Structure[]) {
  const documented = structures.filter((s) => (s.mesh_names ?? []).length > 0);
  return {
    documented: documented.length,
    withCards: documented.filter((s) => !!s.facts_id).length,
    totalRows: structures.length
  };
}
