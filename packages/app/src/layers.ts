import type { LayerAsset } from "./components/VolumeViewer";
import type { Sex } from "./sex";

/**
 * Path 1 layer assembly (see docs/body-peel.md). TWO independent bodies, each internally
 * same-individual — no cross-individual registration any longer (Tasks O–R transforms retired):
 *
 *  - **VH body peel** (per sex): HuBMAP VH skin + organs. Male = VH_M_* together, Female =
 *    VH_F_* together; each sex's assets share that individual's frame, so IDENTITY is the
 *    correct registration (sameFrame). Muscle + full skeleton of that individual are NOT
 *    sourced → they don't exist in this body (Reference Atlas shows Z-Anatomy instead).
 *  - **Reference Atlas**: Z-Anatomy skeleton + muscle + the BodyParts3D whole-body skin
 *    ("Taro", a different male individual, also identity/sameFrame — the skin's frame
 *    translation is baked into the GLB), shown on its own route and never claimed as the
 *    peel's body.
 */
type UrlsPair = { male: string; female: string };

/** Pure core: the per-sex VH body peel (skin + organs + blood vasculature) at identity. */
export function buildVhBodyFromUrls(
  sex: Sex,
  heartUrls: UrlsPair,
  skinUrls: UrlsPair,
  vesselUrls: UrlsPair = { male: "", female: "" },
  extras: LayerAsset[] = []
): LayerAsset[] {
  const layers: LayerAsset[] = [];
  const skin = skinUrls[sex];
  if (skin) {
    layers.push({
      structureId: "skin",
      layer: "skin",
      url: skin,
      visible: true,
      // Same VH individual as the heart -> shares the body frame -> identity is correct.
      sameFrame: true
    });
  }
  const heart = heartUrls[sex];
  if (heart) {
    layers.push({
      structureId: "heart",
      layer: "organ",
      url: heart,
      visible: true,
      // Same VH individual as the skin -> identity is correct (no Z-Anatomy registration).
      sameFrame: true
    });
  }
  const vessel = vesselUrls[sex];
  if (vessel) {
    layers.push({
      structureId: "blood-vasculature",
      layer: "vessel",
      url: vessel,
      visible: true,
      // Same VH individual as the skin/heart (v1.2 Blood_Vasculature) -> identity is correct.
      sameFrame: true
    });
  }
  // The donor's published organs/spine/cord, already fully described by the caller.
  for (const extra of extras) layers.push(extra);
  return layers;
}

/**
 * The Z-Anatomy whole-body systems that complete the Reference Atlas. Each is a separate
 * collection exported from the same body (see packages/tools/export_layers.py and
 * docs/sources.md), so all of them share the body frame and render at identity.
 *
 * They are marked `defaultHidden` because together they are ~10 MB and ~1,940 extra meshes: the
 * first paint loads only skin + skeleton + muscle, and each system mounts when switched on. The
 * Layers panel exposes them individually and as one "all systems" control.
 */
export type ReferenceSystemUrls = {
  nervous?: string;
  cardiovascular?: string;
  visceral?: string;
  joints?: string;
  lymphoid?: string;
};

/** Pure core: the Z-Anatomy Reference Atlas (skin + skeleton + muscle + the whole-body systems). */
export function buildReferenceFromUrls(
  skeletonUrl: string,
  muscleUrl: string,
  skinUrl = "",
  systems: ReferenceSystemUrls = {}
): LayerAsset[] {
  const layers: LayerAsset[] = [];
  // Skin FIRST: it is the outermost layer (layer 0), matching the peel order on /body.
  if (skinUrl) {
    layers.push({
      structureId: "skin",
      layer: "skin",
      url: skinUrl,
      visible: true,
      // BodyParts3D skin for the same individual as the Z-Anatomy systems; the frame
      // translation is already baked into the GLB, so identity is the correct registration.
      sameFrame: true
    });
  }
  if (skeletonUrl) {
    layers.push({
      structureId: "skeleton",
      layer: "skeleton",
      url: skeletonUrl,
      visible: true,
      // Z-Anatomy body layer: shares the body frame -> identity is correct.
      sameFrame: true
    });
  }
  if (muscleUrl) {
    layers.push({
      structureId: "muscle",
      layer: "muscle",
      url: muscleUrl,
      visible: true,
      // Z-Anatomy body layer: same frame as the skeleton/body -> identity is correct.
      sameFrame: true
    });
  }
  // The systems, innermost-context last in the panel: organs, vessels, nerves, joints, lymph.
  const systemEntries: Array<[string, string, string | undefined]> = [
    ["viscera", "organ", systems.visceral],
    ["cardiovascular-system", "vessel", systems.cardiovascular],
    ["nervous-system", "nerve", systems.nervous],
    ["joints", "joint", systems.joints],
    ["lymphoid-system", "lymphatic", systems.lymphoid]
  ];
  for (const [structureId, layer, url] of systemEntries) {
    if (!url) continue;
    layers.push({
      structureId,
      layer,
      url,
      visible: false,
      // Z-Anatomy collection of the same body -> identity is correct.
      sameFrame: true,
      defaultHidden: true
    });
  }
  return layers;
}

/**
 * The extra organs, spine and spinal cord published for the HuBMAP Visible Human male reference
 * body — the same individual as his skin and vessels, so every entry is `sameFrame` (identity).
 *
 * [compressed asset file name, structureId, layer, defaultHidden]
 *
 * The organs are VISIBLE by default so peeling the skin reveals a full interior — that is the
 * point of them. The spine and the cord are opt-in (about 3.9 MB together) so the first paint
 * stays light; peeling to their rail stop mounts them.
 *
 * NOT here, deliberately: the Allen brain atlas and the NIH lymph node. Both are OTHER labs'
 * models registered into this body's frame, so wiring them changes what the body may claim.
 * See docs/sources.md.
 */
const MALE_DONOR_EXTRAS: Array<[string, string, string, boolean]> = [
  // Viscera (organ layer)
  ["liver-male-draco", "liver", "organ", false],
  ["lung-male-draco", "lung", "organ", false],
  ["kidney-l-male-draco", "kidney", "organ", false],
  ["kidney-r-male-draco", "kidney", "organ", false],
  ["gallbladder-male-draco", "gallbladder", "organ", false],
  ["biliary-tree-male-draco", "bile-duct", "organ", false],
  ["pancreas-male-draco", "pancreas", "organ", false],
  ["spleen-male-draco", "spleen", "organ", false],
  ["thymus-male-draco", "thymus", "organ", false],
  ["small-intestine-male-draco", "jejunum", "organ", false],
  ["large-intestine-male-draco", "large-intestine", "organ", false],
  ["urinary-bladder-male-draco", "urinary-bladder", "organ", false],
  ["ureter-l-male-draco", "ureter", "organ", false],
  ["ureter-r-male-draco", "ureter", "organ", false],
  ["urethra-male-draco", "urethra", "organ", false],
  ["prostate-male-draco", "prostate", "organ", false],
  // Spine + pelvis (skeleton layer — a PARTIAL skeleton, not a full one)
  ["vertebrae-male-draco", "vertebral-column", "skeleton", true],
  ["pelvis-male-draco", "bony-pelvis", "skeleton", true],
  // Spinal cord (nerve layer — the cord only; no peripheral nerves are published)
  ["spinal-cord-male-draco", "spinal-cord", "nerve", true]
];

/**
 * Pure core: build the donor's extra layers from an asset base URL (…/api/media/hubmap/glb).
 * Returns [] when there is no base, when the body is female (her organ set is a separate,
 * not-yet-wired batch) — never a partial or invented list.
 */
export function donorExtrasFromBase(sex: Sex, base: string): LayerAsset[] {
  const root = base.trim().replace(/\/+$/, "");
  if (!root || sex !== "male") return [];
  return MALE_DONOR_EXTRAS.map(([file, structureId, layer, defaultHidden]) => ({
    structureId,
    layer,
    url: `${root}/${file}.glb`,
    visible: !defaultHidden,
    // Same Visible Human male as the skin/heart/vessels -> identity is the correct registration.
    sameFrame: true,
    defaultHidden
  }));
}

// Vite injects import.meta.env; under node:test it is undefined, so read it defensively
// to keep this module importable (the pure cores above are what the tests exercise).
const ENV = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

const HEART_MALE = (ENV.VITE_HEART_GLB_MALE ?? "").trim();
const HEART_FEMALE = (ENV.VITE_HEART_GLB_FEMALE ?? "").trim();
const SKIN_MALE = (ENV.VITE_SKIN_GLB_MALE ?? "").trim();
const SKIN_FEMALE = (ENV.VITE_SKIN_GLB_FEMALE ?? "").trim();
const VESSEL_MALE = (ENV.VITE_VESSEL_GLB_MALE ?? "").trim();
const VESSEL_FEMALE = (ENV.VITE_VESSEL_GLB_FEMALE ?? "").trim();
// Base URL for the donor's compressed organ/spine/cord assets (…/api/media/hubmap/glb). One key
// rather than twenty: the file names live in MALE_DONOR_EXTRAS above, so the list cannot drift
// out of step with the env.
const DONOR_GLB_BASE = (ENV.VITE_DONOR_GLB_BASE ?? "").trim();
const SKELETON_GLB = (ENV.VITE_SKELETON_GLB ?? "").trim();
const MUSCLE_GLB = (ENV.VITE_MUSCLE_GLB ?? "").trim();
const Z_ANATOMY_SKIN_GLB = (ENV.VITE_Z_ANATOMY_SKIN_GLB ?? "").trim();
const NERVOUS_GLB = (ENV.VITE_NERVOUS_GLB ?? "").trim();
const CARDIOVASCULAR_GLB = (ENV.VITE_CARDIOVASCULAR_GLB ?? "").trim();
const VISCERAL_GLB = (ENV.VITE_VISCERAL_GLB ?? "").trim();
const JOINTS_GLB = (ENV.VITE_JOINTS_GLB ?? "").trim();
const LYMPHOID_GLB = (ENV.VITE_LYMPHOID_GLB ?? "").trim();

/** VH body peel for a sex: per-sex HuBMAP VH skin + heart + blood vasculature at identity (CC BY 4.0).
 *  For the male body this also mounts his published organs, spine, pelvis and spinal cord. */
export function buildVhBody(sex: Sex): LayerAsset[] {
  return buildVhBodyFromUrls(
    sex,
    { male: HEART_MALE, female: HEART_FEMALE },
    { male: SKIN_MALE, female: SKIN_FEMALE },
    { male: VESSEL_MALE, female: VESSEL_FEMALE },
    donorExtrasFromBase(sex, DONOR_GLB_BASE)
  );
}

/**
 * Z-Anatomy Reference Atlas: the whole body — skin + skeleton + muscle + viscera +
 * cardiovascular + nervous + joints + lymphoid (CC BY-SA, derived from BodyParts3D — "Taro";
 * the skin is BodyParts3D's own whole-body skin, the same individual).
 */
export function buildReference(): LayerAsset[] {
  return buildReferenceFromUrls(SKELETON_GLB, MUSCLE_GLB, Z_ANATOMY_SKIN_GLB, {
    nervous: NERVOUS_GLB,
    cardiovascular: CARDIOVASCULAR_GLB,
    visceral: VISCERAL_GLB,
    joints: JOINTS_GLB,
    lymphoid: LYMPHOID_GLB
  });
}

