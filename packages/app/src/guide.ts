import type { CameraPreset } from "./components/VolumeViewer";

/**
 * Guided-peel journeys — pure data + pure ordering, one table per body.
 *
 * A journey is an outer→inner peel (whole body → skin off) followed by real stops inside that
 * body. WHICH stops exist is derived per body from what actually resolves in its scene (see
 * `guideStops`), never asserted: a stop appears only where its structure is really there, and no
 * body is padded up to another body's step count.
 *
 * Two journeys exist, because the two bodies are different people with different published
 * anatomies and honestly different stories:
 *  - `DONOR_JOURNEY` — a Visible Human donor. Follows circulation through the heart: the right
 *    side is upstream of the left, so RV precedes LV, and the aorta leaves last.
 *  - `REFERENCE_JOURNEY` — the Reference body ("Taro"), the only body here with a complete
 *    interior. Follows the alimentary passage as that source actually carries it (oesophagus →
 *    stomach → liver → jejunum), then the urinary route out (kidney).
 *
 * Captions live on the stops, as plain strings, so a stop cannot be defined without the copy that
 * explains it and the whole journey stays testable without rendering React.
 */
export type GuideStepKey =
  | "whole-body"
  | "peel-skin"
  // Donor journey: the circulation story.
  | "right-ventricle"
  | "left-ventricle"
  | "ascending-aorta"
  | "inside-heart"
  // Reference journey: the alimentary + urinary passage.
  | "oesophagus"
  | "stomach"
  | "liver"
  | "jejunum"
  | "kidney";

export type GuideStop = {
  key: GuideStepKey;
  /** Panel heading for this stop. */
  title: string;
  /** What this stop shows, and why it is true of THIS body. */
  caption: string;
  /** Structure whose mesh this stop focuses — the stop is offered only if it resolves here. */
  structureId?: string;
  /**
   * Layer state to SET for this stop (replaces the recorded choice; omitted layers fall back to
   * their own default). Absent means "leave the peel as the previous stop left it".
   */
  visibleLayers?: Record<string, boolean>;
  /**
   * Peel to this layer on entry, using the rail's own rule. Not used by the donor journey, and
   * deliberately so: the aorta's mesh lives on the VESSEL layer, which sits INSIDE the heart's
   * layer in the peel order, so peeling to it would hide the heart it is describing.
   */
  peelToLayer?: string;
  /** Peel depth for this stop (defaults to 1 — the rail does the revealing, not the slider). */
  opacity?: number;
  /** Clear the current selection on entry (the two opening states do; structure stops do not). */
  clearPicked?: boolean;
  /** Camera preset on entry. */
  preset?: CameraPreset;
  /** When the stop's structure is not in this body, fly to its heart mesh instead. */
  flyToHeart?: boolean;
  /** Present regardless of mappings — the two opening states. */
  always?: boolean;
  /** Honest end-of-journey stop, used only when NOTHING in the journey resolves. */
  fallback?: boolean;
};

export type GuideJourney = {
  stops: GuideStop[];
  /**
   * Layers this journey's stops live on, held MOUNTED for the journey's whole length.
   *
   * This is a correctness requirement, not an optimisation. A stop list is derived from what is
   * actually in the scene, and the reference body mounts its systems lazily (viscera is hidden by
   * default), so a journey that only reached the viscera at its viscera stop would find its own
   * later stops missing and end early. The same class of bug was hit for real on the donor's aorta
   * stop, where hiding the vessel layer unmounted its meshes and collapsed the journey.
   *
   * On the reference body this changes nothing visible at step 0: the skin is opaque and the
   * organs are inside it. The donor needs nothing here — his organs and vessels are shown by
   * default.
   */
  mount: string[];
};

/** The Visible Human donor journey — circulation, in the order blood actually travels. */
export const DONOR_JOURNEY: GuideJourney = {
  mount: [],
  stops: [
    {
      key: "whole-body",
      title: "Whole body",
      caption:
        "One real Visible Human donor, whose skin, organs and vessel tree all belong to that same individual (HuBMAP HRA, CC BY 4.0). Muscle and a full articulated skeleton are not published for this person, so they are named as missing rather than filled in.",
      visibleLayers: {},
      clearPicked: true,
      preset: "front",
      always: true
    },
    {
      key: "peel-skin",
      title: "Peel the skin",
      caption:
        "Hiding the skin reveals what is inside the same individual's frame, with no alignment invented: these assets are published in that person's own coordinates. The peel rail and the depth slider do this freely at any time.",
      visibleLayers: { skin: false },
      clearPicked: true,
      preset: "front",
      always: true
    },
    {
      key: "right-ventricle",
      title: "Focus: right ventricle",
      caption:
        "The right ventricle (UBERON:0002080) receives deoxygenated blood from the right atrium and pumps it into the pulmonary artery toward the lungs. Its mesh is mapped on this body, so its published, sourced entry opens in the drawer.",
      structureId: "heart-right-ventricle",
      visibleLayers: { skin: false }
    },
    {
      key: "left-ventricle",
      title: "Focus: left ventricle",
      caption:
        "The left ventricle (UBERON:0002084) is a part of the heart, on the same individual as the right ventricle. Its mesh is mapped on this body, so its published entry opens in the drawer.",
      structureId: "heart-left-ventricle",
      visibleLayers: { skin: false }
    },
    {
      key: "ascending-aorta",
      title: "Follow the aorta out",
      caption:
        "The ascending aorta (UBERON:0001496) begins at the base of the left ventricle and carries blood toward the arch. It sits on the vessel layer rather than the organ layer, so this stop switches that layer on — and keeps the heart visible behind it.",
      structureId: "aorta-ascending",
      visibleLayers: { skin: false, vessel: true },
      flyToHeart: true
    },
    {
      key: "inside-heart",
      title: "Inside: the heart",
      caption:
        "This body's heart is a real HRA reference mesh inside the thorax. Only published mesh-to-structure mappings resolve on click, and most heart parts are not mapped to a structure yet — so nothing here is labelled that has not been checked.",
      visibleLayers: { skin: false, vessel: false },
      flyToHeart: true,
      fallback: true
    }
  ]
};

/** The Reference body journey — the alimentary passage, then the urinary route out. */
export const REFERENCE_JOURNEY: GuideJourney = {
  mount: ["organ"],
  stops: [
    {
      key: "whole-body",
      title: "Whole body",
      caption:
        "One fixed male reference individual (Z-Anatomy, derived from BodyParts3D — CC BY-SA 2.1 Japan). A different person from the Visible Human donors, and the only body here with a complete interior: his own skin, muscle, skeleton, organs, vessels, nerves, joints and lymphatics.",
      visibleLayers: {},
      clearPicked: true,
      preset: "front",
      always: true
    },
    {
      key: "peel-skin",
      title: "Peel the skin",
      caption:
        "The skin is BodyParts3D's own whole-body skin of this same individual, so it needs no hand alignment. It and the systems beneath it are separately derived surfaces, though, and do not coincide exactly: some muscle and bone sits at or just outside skin level. That is a property of the sources rather than a registration error, and no geometry was rescaled to hide it.",
      visibleLayers: { skin: false },
      clearPicked: true,
      preset: "front",
      always: true
    },
    {
      key: "oesophagus",
      title: "Down the oesophagus",
      caption:
        "The oesophagus (UBERON:0001043) is the tube that carries what you swallow from the pharynx to the stomach — the source spells it “esophagus”. It travels behind the trachea and the heart and passes through the diaphragm, and its mesh on this body is mapped, so its entry opens here.",
      structureId: "oesophagus",
      peelToLayer: "organ"
    },
    {
      key: "stomach",
      title: "Into the stomach",
      caption:
        "The stomach (UBERON:0000945) is where food is held and chemically broken down. The duodenum, which follows it, is a separate mesh in this source and is not mapped to a structure — so a click on it reports that rather than guessing.",
      structureId: "stomach"
    },
    {
      key: "liver",
      title: "The liver",
      caption:
        "The liver (UBERON:0002107) is the largest organ mapped on this body — nine meshes: the whole organ plus its named lobes, segments, ligaments and the impressions left by neighbouring organs. The bile duct that leaves it (UBERON:0002394) is mapped too, in the same visceral layer.",
      structureId: "liver"
    },
    {
      key: "jejunum",
      title: "On through the jejunum",
      caption:
        "The jejunum (UBERON:0002115) is the portion of the small intestine mapped on this body, where absorption continues. The pancreatic duct that drains into the gut is mapped as well — a click on either opens its own sourced entry.",
      structureId: "jejunum"
    },
    {
      key: "kidney",
      title: "Out through the kidney",
      caption:
        "The kidney (UBERON:0002113) filters the blood and produces urine. Its ureter (UBERON:0000056) carries that to the urinary bladder (UBERON:0001255), and the urethra (UBERON:0000057) carries it out — all four are mapped on this body, so the whole route can be followed by clicking in the scene.",
      structureId: "kidney"
    }
  ]
};

/**
 * The stops this body can actually show, in order.
 *
 * `always` stops are kept whatever resolves. A structure stop is kept only when its structure
 * resolves in this body's scene. If a journey defines structure stops and NONE of them resolve,
 * its `fallback` stop is appended rather than leaving a two-step journey that goes nowhere — never
 * a fabricated stop, always one that is honest about what is missing.
 */
export function guideStops(
  journey: GuideJourney,
  resolves: (structureId: string) => boolean
): GuideStop[] {
  const kept = journey.stops.filter(
    (stop) => stop.always || (stop.structureId != null && resolves(stop.structureId))
  );
  if (!journey.stops.some((stop) => stop.structureId != null)) return kept;
  if (kept.some((stop) => stop.structureId != null)) return kept;
  const fallback = journey.stops.find((stop) => stop.fallback);
  return fallback ? [...kept, fallback] : kept;
}

/**
 * Force the journey's own layers on, leaving every other recorded choice alone. Applied on every
 * stop entry, so the layers a journey depends on cannot unmount underneath it.
 */
export function mountLayers(
  prev: Record<string, boolean>,
  mount: string[]
): Record<string, boolean> {
  if (mount.length === 0) return prev;
  const next = { ...prev };
  for (const layer of mount) next[layer] = true;
  return next;
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


