import type { LayerAsset } from "./components/VolumeViewer";

/**
 * The onion peel, as one canonical outermost → innermost order over the anatomical layers.
 *
 * Why a single order instead of independent layer toggles: “peel to here” is only meaningful if
 * every layer knows what is outside it. The order is anatomical (skin is outside muscle, muscle
 * outside skeleton, organs inside the skeleton, vessels and nerves running through and between),
 * and it is the ONLY place peel ordering is defined — the rail, the peel action and the restore
 * action all read it, so they cannot disagree.
 *
 * Layers we do not order (e.g. a future layer this file has not been taught) rank innermost, so
 * an unknown layer is never peeled away as if it were an outer shell.
 */
export const PEEL_ORDER = [
  "skin",
  "fascia",
  "muscle",
  "skeleton",
  "joint",
  "organ",
  "lymphatic",
  "vessel",
  "nerve"
] as const;

export type PeelLayer = (typeof PEEL_ORDER)[number];

const RANK = new Map<string, number>(PEEL_ORDER.map((layer, index) => [layer, index]));

/** Rank in the peel order; unordered layers sit innermost (never treated as an outer shell). */
export function peelRank(layer: string): number {
  return RANK.get(layer) ?? PEEL_ORDER.length;
}

/**
 * The peel stops this body actually has, outermost first. Only layers with a real asset are
 * listed — the rail must never offer to peel to something this body does not contain.
 */
export function peelRail(layers: LayerAsset[]): string[] {
  const present = new Set(layers.filter((layer) => layer.url.length > 0).map((l) => l.layer));
  return PEEL_ORDER.filter((layer) => present.has(layer));
}

/**
 * Peel TO a stop: hide every layer outside it, show the stop itself, and leave the layers
 * inside it exactly as the user left them.
 *
 * Leaving the inner layers untouched is deliberate — a peel must not silently switch on
 * something deeper in the body (the heavy systems stay off until asked for, and a user who
 * turned nerves on keeps them on when they peel back out to the skeleton).
 *
 * Pure: returns a new choice map, never mutates.
 */
export function peelTo(
  layers: LayerAsset[],
  target: string,
  choices: Record<string, boolean>
): Record<string, boolean> {
  const rank = peelRank(target);
  const next = { ...choices };
  for (const layer of layers) {
    if (!layer.url.length) continue;
    const layerRank = peelRank(layer.layer);
    if (layerRank < rank) next[layer.layer] = false;
    else if (layerRank === rank) next[layer.layer] = true;
  }
  return next;
}

/**
 * True when an ordinary (non opt-in) layer has been deliberately peeled away.
 *
 * This asks "did the user hide it", not "what is the default" — so it reads the choice map
 * directly and never re-implements layerVisibility's default rule. Opt-in systems are excluded
 * on purpose: a system that has simply never been switched on is not a peeled body.
 */
export function isPeeled(layers: LayerAsset[], choices: Record<string, boolean>): boolean {
  return layers.some(
    (layer) => layer.url.length > 0 && !layer.defaultHidden && choices[layer.layer] === false
  );
}

/**
 * Restore the body to its opening state by DROPPING the explicit choices, so every layer falls
 * back to its own default (ordinary layers on, opt-in heavy systems off). Deleting rather than
 * re-deriving the defaults keeps the single source of truth in layerVisibility.isLayerVisible.
 */
export function restorePeel(
  layers: LayerAsset[],
  choices: Record<string, boolean>
): Record<string, boolean> {
  const next = { ...choices };
  for (const layer of layers) {
    if (layer.url.length > 0) delete next[layer.layer];
  }
  return next;
}

/**
 * What ONE stop on the rail is doing:
 *  - `peeled`  — outside the current peel point, i.e. already taken off (click to cover back up)
 *  - `current` — the outermost layer still visible: where the peel currently ends
 *  - `inside`  — still deeper than the peel point (click to peel further in)
 */
export type PeelStopState = "peeled" | "current" | "inside";
export type PeelStop = { layer: string; state: PeelStopState };

/**
 * The rail as the user should see it.
 *
 * Reads each layer's RESOLVED `visible` flag, so the caller must pass the list through
 * `layerVisibility.applyVisibility` first — this module never re-implements the default-visibility
 * rule, and the two can never disagree about what is on screen.
 */
export function peelStops(layers: LayerAsset[]): PeelStop[] {
  const rail = peelRail(layers);
  const shown = new Set(
    layers.filter((layer) => layer.url.length > 0 && layer.visible).map((layer) => layer.layer)
  );
  const outermost = rail.findIndex((layer) => shown.has(layer));
  return rail.map((layer, index) => ({
    layer,
    state:
      outermost < 0 ? "inside" : index < outermost ? "peeled" : index === outermost ? "current" : "inside"
  }));
}
