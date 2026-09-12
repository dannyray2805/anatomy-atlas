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
  vesselUrls: UrlsPair = { male: "", female: "" }
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
  return layers;
}

/** Pure core: the Z-Anatomy Reference Atlas (skin + skeleton + muscle) at identity. */
export function buildReferenceFromUrls(
  skeletonUrl: string,
  muscleUrl: string,
  skinUrl = ""
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
  return layers;
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
const SKELETON_GLB = (ENV.VITE_SKELETON_GLB ?? "").trim();
const MUSCLE_GLB = (ENV.VITE_MUSCLE_GLB ?? "").trim();
const Z_ANATOMY_SKIN_GLB = (ENV.VITE_Z_ANATOMY_SKIN_GLB ?? "").trim();

/** VH body peel for a sex: per-sex HuBMAP VH skin + heart + blood vasculature at identity (CC BY 4.0). */
export function buildVhBody(sex: Sex): LayerAsset[] {
  return buildVhBodyFromUrls(
    sex,
    { male: HEART_MALE, female: HEART_FEMALE },
    { male: SKIN_MALE, female: SKIN_FEMALE },
    { male: VESSEL_MALE, female: VESSEL_FEMALE }
  );
}

/**
 * Z-Anatomy Reference Atlas: skin + skeleton + muscle (CC BY-SA, derived from BodyParts3D —
 * "Taro"; the skin is BodyParts3D's own whole-body skin, the same individual).
 */
export function buildReference(): LayerAsset[] {
  return buildReferenceFromUrls(SKELETON_GLB, MUSCLE_GLB, Z_ANATOMY_SKIN_GLB);
}

