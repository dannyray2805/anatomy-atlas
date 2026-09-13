import type { LayerAsset } from "./components/VolumeViewer";
import type { Sex } from "./sex";

/**
 * Path 1 layer assembly (see docs/body-peel.md). TWO independent bodies, each internally
 * same-individual — no cross-individual registration any longer (Tasks O–R transforms retired):
 *
 *  - **VH body peel** (per sex): HuBMAP VH skin + heart + organs. Male = VH_M_* together, Female =
 *    VH_F_* together; each sex's assets share that individual's frame, so IDENTITY is the
 *    correct registration (sameFrame). Muscle + a full skeleton of either individual are NOT
 *    sourced → they don't exist in these bodies (Reference Atlas shows Z-Anatomy instead).
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
 * NOT here: nothing is left out of the HuBMAP male reference body. The three assets that come
 * from OTHER contributors inside that same library (SBU large intestine, Allen brain, NIH lymph
 * node) ARE wired, because the sources are authentic and licensed; what each one actually is, and
 * who authored it, is stated on its structure row and in the page's notes.
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
  ["spinal-cord-male-draco", "spinal-cord", "nerve", true],
  // Contributed models in the same reference body, included deliberately: the Allen Institute
  // brain atlas and one NIH lymph-node model. Both are other labs' work registered into this
  // individual's frame — the structure rows and the page's notes state that explicitly.
  ["brain-male-draco", "brain", "nerve", true],
  ["lymph-node-male-draco", "lymph-node", "lymphatic", true]
];

/**
 * The extra organs, reproductive organs, spine and spinal cord published for the HuBMAP Visible
 * Human FEMALE reference body — the same individual as her skin, heart and vessels, so every
 * entry is `sameFrame` (identity). Same shape as MALE_DONOR_EXTRAS above.
 *
 * Her set differs from the male's in three ways the source itself defines, not by choice here:
 *  - she has uterus, cervix, ovaries, fallopian tubes and vagina instead of prostate and urethra;
 *    she also carries a lumbar vertebra 6 (a lumbarisation variant, recorded on the row note);
 *  - the lung asset has NO lobe meshes (only bronchopulmonary segments), unlike the male's;
 *  - VH_F_Placenta.glb is deliberately NOT wired. It is a pregnancy-specific organ, and putting
 *    it on a non-pregnant body would assert a state that is not there. VH_F_Ligaments_Uterus_Ovaries
 *    (no matching structure row yet) and VH_F_Sm_Intest_Measurements (measurement geometry, not
 *    anatomy) are likewise excluded.
 *
 * The three dedicated duct assets (Ducts_of_Liver / Ducts_of_Gallbladder / Ducts_of_Pancreas) are
 * also NOT wired, and this one is a rendering decision: together they carry exactly the same eight
 * duct meshes as VH_F_Biliary_Tree.glb (their triangle counts sum to that asset's 10,836 exactly),
 * so mounting both would draw the same surfaces twice, coincident, and z-fight. The single
 * combined asset is used instead.
 */
const FEMALE_DONOR_EXTRAS: Array<[string, string, string, boolean]> = [
  // Viscera (organ layer)
  ["liver-female-draco", "liver", "organ", false],
  ["lung-female-draco", "lung", "organ", false],
  ["kidney-l-female-draco", "kidney", "organ", false],
  ["kidney-r-female-draco", "kidney", "organ", false],
  ["gallbladder-female-draco", "gallbladder", "organ", false],
  ["biliary-tree-female-draco", "bile-duct", "organ", false],
  ["pancreas-female-draco", "pancreas", "organ", false],
  ["spleen-female-draco", "spleen", "organ", false],
  ["thymus-female-draco", "thymus", "organ", false],
  ["small-intestine-female-draco", "jejunum", "organ", false],
  ["large-intestine-female-draco", "large-intestine", "organ", false],
  ["urinary-bladder-female-draco", "urinary-bladder", "organ", false],
  ["ureter-l-female-draco", "ureter", "organ", false],
  ["ureter-r-female-draco", "ureter", "organ", false],
  // Female reproductive organs (organ layer)
  ["uterus-female-draco", "uterus", "organ", false],
  ["ovary-l-female-draco", "ovary", "organ", false],
  ["ovary-r-female-draco", "ovary", "organ", false],
  ["fallopian-tube-l-female-draco", "fallopian-tube", "organ", false],
  ["fallopian-tube-r-female-draco", "fallopian-tube", "organ", false],
  ["vagina-female-draco", "vagina", "organ", false],
  // Spine + pelvis (skeleton layer — a PARTIAL skeleton, not a full one)
  ["vertebrae-female-draco", "vertebral-column", "skeleton", true],
  ["pelvis-female-draco", "bony-pelvis", "skeleton", true],
  // Spinal cord (nerve layer — the cord only; no peripheral nerves are published)
  ["spinal-cord-female-draco", "spinal-cord", "nerve", true],
  // Contributed models in the same reference body (Allen brain atlas, one NIH lymph node).
  ["brain-female-draco", "brain", "nerve", true],
  ["lymph-node-female-draco", "lymph-node", "lymphatic", true]
];

/** One table per sex, so a donor body can only ever mount that individual's own assets. */
const DONOR_EXTRAS_BY_SEX: Record<Sex, Array<[string, string, string, boolean]>> = {
  male: MALE_DONOR_EXTRAS,
  female: FEMALE_DONOR_EXTRAS
};

/**
 * Pure core: build the donor's extra layers from an asset base URL (…/api/media/hubmap/glb).
 * Returns [] when there is no base, and otherwise that sex's own table — never a partial or
 * invented list. The visible/`defaultHidden` split is described on the tables above.
 */
export function donorExtrasFromBase(sex: Sex, base: string): LayerAsset[] {
  const root = base.trim().replace(/\/+$/, "");
  if (!root) return [];
  return DONOR_EXTRAS_BY_SEX[sex].map(([file, structureId, layer, defaultHidden]) => ({
    structureId,
    layer,
    url: `${root}/${file}.glb`,
    visible: !defaultHidden,
    // Same Visible Human individual as that sex's skin/heart/vessels -> identity is correct.
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
// Base URL for the donors' compressed organ/spine/cord assets (…/api/media/hubmap/glb). One key
// rather than forty-five: the file names live in the per-sex tables above, so the lists cannot
// drift out of step with the env.
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
 *  For a donor body this also mounts that individual's published organs, spine, pelvis and cord
 *  (male and female each have their own set — see DONOR_EXTRAS_BY_SEX). */
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

