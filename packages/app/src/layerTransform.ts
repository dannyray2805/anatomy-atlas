/**
 * Pure transform math for per-layer manual registration (Task O). Lives in a .ts module
 * (no JSX / no three) so node:test can exercise it directly. These helpers only expose
 * what the human types in the AlignPanel — nothing here ever picks numbers automatically.
 */

export type LayerTransform = {
  /** X/Y/Z offset applied to the layer group. */
  position: [number, number, number];
  /** Rotation about +Y in DEGREES (converted to radians at render time). */
  rotationY: number;
  /** Uniform scale applied to the layer group. */
  scale: number;
};

export const DEFAULT_TRANSFORM: LayerTransform = {
  position: [0, 0, 0],
  rotationY: 0,
  scale: 1
};

/** Fresh identity transform (never the shared DEFAULT_TRANSFORM object). */
export function identityTransform(): LayerTransform {
  return { position: [0, 0, 0], rotationY: 0, scale: 1 };
}

/**
 * Transform to render for a layer: an AlignPanel override wins, then the layer's own
 * `transform`, then identity. A layer with no transform renders exactly as today.
 */
export function effectiveTransform(
  layer: { transform?: LayerTransform } | undefined,
  override?: LayerTransform
): LayerTransform {
  return override ?? layer?.transform ?? identityTransform();
}

/** R3F <group> props derived from a LayerTransform (rotationY degrees -> radians). */
export function groupTransformProps(t: LayerTransform): {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
} {
  return {
    position: [t.position[0], t.position[1], t.position[2]],
    rotation: [0, (t.rotationY * Math.PI) / 180, 0],
    scale: t.scale
  };
}

// --- Dev-only AlignPanel persistence (Task P) ------------------------------------------
// The FINAL transforms still live inline in layers.ts (committed). localStorage is just a
// scratch space so the human doesn't lose dialed-in values between reloads while authoring.

/** localStorage key for the temporary AlignPanel override scratch space. */
export const OVERRIDES_STORAGE_KEY = "anatomy-atlas.layer-overrides.v1";

export function serializeOverrides(overrides: Record<string, LayerTransform>): string {
  return JSON.stringify(overrides);
}

/** Parse persisted overrides defensively; returns {} on missing/invalid input. */
export function parseOverrides(raw: string | null): Record<string, LayerTransform> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
    const out: Record<string, LayerTransform> = {};
    for (const [id, t] of Object.entries(value as Record<string, unknown>)) {
      const cand = t as Partial<LayerTransform> | null;
      if (
        cand &&
        Array.isArray(cand.position) &&
        cand.position.length === 3 &&
        cand.position.every((n) => typeof n === "number") &&
        typeof cand.rotationY === "number" &&
        typeof cand.scale === "number"
      ) {
        out[id] = {
          position: [cand.position[0], cand.position[1], cand.position[2]],
          rotationY: cand.rotationY,
          scale: cand.scale
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * True when a layer's source shares the scene body's coordinate frame — in that case the
 * identity transform is CORRECT (there is no registration decision to make), not a guess.
 */
export function isSameFrame(layer: { sameFrame?: boolean } | undefined): boolean {
  return layer?.sameFrame === true;
}
