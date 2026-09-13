/**
 * Illustrative anatomy colours.
 *
 * WHY THIS EXISTS: the source GLBs are not coloured like anatomy. The HuBMAP Visible Human skin
 * ships as one flat blue material (`#3566d5`), and the Z-Anatomy/BodyParts3D layers are flat or
 * near-flat too. That reads as a 3D asset, not as a body.
 *
 * WHAT THIS IS NOT: these values are NOT measured from the scans, and they are not a property of
 * either donor. They are conventional anatomy-illustration colouring applied at render time —
 * presentation only. Nothing here asserts anything about the person scanned, and the UI discloses
 * this wherever the colours appear (see COLOR_DISCLOSURE). The geometry, names and structures are
 * untouched; only the surface colour shown on screen changes.
 *
 * Two levels, most specific first:
 *  1. `STRUCTURE_COLORS` — per mapped structure id (a liver reads as liver-brown).
 *  2. `LAYER_COLORS`     — per anatomical layer (every muscle in the muscle layer is red).
 */
import type { LayerAsset } from "./components/VolumeViewer";

/** Conventional illustration colours, by anatomical layer (see anatomy layer values in schema). */
export const LAYER_COLORS: Record<string, number> = {
  skin: 0xe0a887, // human skin tone
  fascia: 0xe4d8c4, // pale connective tissue
  muscle: 0xb03a2e, // skeletal muscle red
  skeleton: 0xe8e2d0, // bone ivory
  joint: 0xd6cdb6, // capsule / ligament / meniscus
  organ: 0xa8452f, // generic viscera fallback (per-organ overrides below)
  vessel: 0xa33b3b, // blood vessel
  nerve: 0xf0e3a8, // pale nerve yellow
  lymphatic: 0x9ccc9c, // pale lymph green
  tissue: 0xc9a0a0
};

/**
 * Per-structure overrides for the structures already mapped in structures.json — so a liver, a
 * kidney and a spleen do not all render as the same generic tone. Keyed by Structure.id.
 */
export const STRUCTURE_COLORS: Record<string, number> = {
  // Hollow / tubular
  trachea: 0xdcd3c8,
  bronchus: 0xd8cfc4,
  oesophagus: 0xd6a08a,
  jejunum: 0xd9968c,
  "bile-duct": 0x6f8f3f,
  "pancreatic-duct": 0xe0c39a,
  ureter: 0xdfc48a,
  urethra: 0xdfc48a,
  // Solid organs
  liver: 0x7b3f2e,
  kidney: 0x8f3b2f,
  lung: 0xdfa9a2,
  stomach: 0xd98c7a,
  spleen: 0x6f3a52,
  pancreas: 0xe0c39a,
  gallbladder: 0x6f8f3f,
  "urinary-bladder": 0xe0c48a,
  "thyroid-gland": 0xb06a4a,
  "adrenal-gland": 0xc99a4a,
  thymus: 0xc9a68a,
  // Nervous system
  midbrain: 0xe8d3c8,
  pons: 0xe8d3c8,
  "medulla-oblongata": 0xe8d3c8,
  // Heart + great vessels (myocardium vs lumen)
  heart: 0x8e2b28,
  "heart-left-ventricle": 0x9b2f2b,
  "heart-right-ventricle": 0x9b2f2b,
  "heart-right-atrium": 0x8d2a26,
  "aorta-ascending": 0xb04040,
  "blood-vasculature": 0xa33b3b
};

/** The layer colour as a hex number, or undefined for a layer we have no colour for. */
export function layerColorHex(layer: string): number | undefined {
  return LAYER_COLORS[layer];
}

/** The per-structure override as a hex number, or undefined to fall back to the layer colour. */
export function structureColorHex(structureId: string | undefined): number | undefined {
  return structureId ? STRUCTURE_COLORS[structureId] : undefined;
}

/**
 * Resolve what a mesh should be coloured: mapped structure override, else its layer colour, else
 * `undefined` — meaning "leave the asset's own material colour alone".
 */
export function anatomyColor(
  layer: string,
  structureId: string | undefined
): number | undefined {
  return structureColorHex(structureId) ?? layerColorHex(layer);
}

/**
 * The honest caveat, shown with the sources. Kept here beside the values so the colours and the
 * sentence explaining them cannot drift apart.
 */
export const COLOR_DISCLOSURE =
  "Surface colours are illustrative — conventional anatomy-illustration tones chosen so the body " +
  "reads as anatomy. They are NOT measured from the scans, and they are not the skin or tissue " +
  "colour of either donor; only geometry, names and structures come from the cited sources.";

/** Every layer key this module can colour (used by tests to stay in step with the app's layers). */
export function colorableLayers(): string[] {
  return Object.keys(LAYER_COLORS);
}

/** Type-narrowing helper: a LayerAsset's layer key. */
export type ColorableLayer = LayerAsset["layer"];
