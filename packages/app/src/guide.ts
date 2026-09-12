/**
 * P3 guided-peel journey — pure, per-sex step ordering.
 *
 * The guide is an outer→inner peel (whole body → skin off → real mapped structures), then it
 * follows real circulation. Which real "stops" exist is per-sex, driven by what actually
 * resolves in that body's scene (derived from inventory, never hardcoded):
 *   - male: right-ventricle + left-ventricle + ascending-aorta all mapped -> RV → LV → aorta
 *     (circulation order: the right side / pulmonary path is upstream of the left / aorta);
 *   - female: no LV mapping, but right-ventricle AND ascending-aorta ARE mapped
 *     (VH_F_right_ventricle, VH_F_ascending_aorta) -> RV → aorta.
 * We never pad a sex up to another sex's step count: a stop only exists where the structure
 * genuinely resolves for that sex (RV is dual-sex; LV is male-only today).
 * `inside-heart` is kept only as a defensive fallback when no mapped structure resolves.
 */
export type GuideStepKey =
  | "whole-body"
  | "peel-skin"
  | "right-ventricle"
  | "left-ventricle"
  | "ascending-aorta"
  | "inside-heart";

export type GuideStructurePresence = {
  /** heart-right-ventricle resolves in this body's scene (male AND female). */
  rightVentricle: boolean;
  /** heart-left-ventricle resolves in this body's scene (male only today). */
  leftVentricle: boolean;
  /** aorta-ascending resolves in this body's scene (male AND female). */
  ascendingAorta: boolean;
};

export function guideStepOrder(p: GuideStructurePresence): GuideStepKey[] {
  const steps: GuideStepKey[] = ["whole-body", "peel-skin"];
  // Circulation order: the right side (RV → pulmonary) is upstream of the left side (LV → aorta),
  // so when both ventricles resolve, right-ventricle precedes left-ventricle.
  if (p.rightVentricle) steps.push("right-ventricle");
  if (p.leftVentricle) steps.push("left-ventricle");
  if (p.ascendingAorta) steps.push("ascending-aorta");
  // Defensive only: if nothing is mapped, fall back to the honest heart fly (no fake card).
  if (!p.rightVentricle && !p.leftVentricle && !p.ascendingAorta) steps.push("inside-heart");
  return steps;
}

export type GuideExitReset = {
  visibleLayers: Record<string, boolean>;
  opacity: number;
  pickedName: string | null;
};

/** Fresh object describing the state a guide exit must restore (all layers on, full opacity, no pick). */
export function guideExitReset(): GuideExitReset {
  return { visibleLayers: {}, opacity: 1, pickedName: null };
}

/**
 * What ENTERING a stop does to the lab state. Pure data (no React, no JSX) so it is testable and so
 * the state machine in useGuidedPeel only has to apply it.
 */
export type GuideEntryPlan = {
  /** Layer visibility to FORCE for this stop (omitted layers keep the user's current choice). */
  visibleLayers?: Record<string, boolean>;
  opacity?: number;
  clearPicked?: boolean;
  preset?: "front" | "threequarter" | "top";
  /** Structure whose mesh to fly to, when it resolves in this body. */
  flyToStructureId?: string;
  /** Fly to the heart mesh instead (fallback when the mapped structure is not in the scene). */
  flyToHeart?: boolean;
};

export type GuidePresenceIds = {
  rightVentricleId?: string;
  leftVentricleId?: string;
  ascendingAortaId?: string;
};

/**
 * Per-stop effects. Two hard-won details are encoded here:
 *  - `peel-skin` and the ventricle stops keep the VESSEL layer mounted. Hiding it would feed back
 *    into the scene-derived inventory and drop the later "follow the aorta out" stop, collapsing
 *    the journey's own step list (this bug was hit for real, not theorised).
 *  - the aorta stop force-enables the vessel layer, because that is where its mesh lives.
 */
export function guideEntryPlan(key: GuideStepKey, presence: GuidePresenceIds): GuideEntryPlan {
  switch (key) {
    case "whole-body":
      return { visibleLayers: {}, opacity: 1, clearPicked: true, preset: "front" };
    case "peel-skin":
      return { visibleLayers: { skin: false }, opacity: 1, clearPicked: true, preset: "front" };
    case "right-ventricle":
      return { visibleLayers: { skin: false }, opacity: 1, flyToStructureId: presence.rightVentricleId };
    case "left-ventricle":
      return { visibleLayers: { skin: false }, opacity: 1, flyToStructureId: presence.leftVentricleId };
    case "ascending-aorta":
      return {
        visibleLayers: { skin: false, vessel: true },
        opacity: 1,
        flyToStructureId: presence.ascendingAortaId,
        flyToHeart: !presence.ascendingAortaId
      };
    case "inside-heart":
      return { visibleLayers: { skin: false, vessel: false }, opacity: 1, flyToHeart: true };
  }
}
