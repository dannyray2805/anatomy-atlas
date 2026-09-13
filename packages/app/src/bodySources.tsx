import type { ReactNode } from "react";
import { BODY_SOURCE_LABELS, BODY_SOURCE_WHO, type BodySource } from "./bodySource";
import type { LayerAsset } from "./components/VolumeViewer";
import { buildReference, buildVhBody } from "./layers";
import { SEX_LABELS, type Sex } from "./sex";

/**
 * The bodies the single pane can show. Each entry is ONE individual (or one published asset of
 * one individual) plus the copy that describes it honestly.
 *
 * There is deliberately no free-floating "Sex" control any more: a Male|Female toggle that
 * silently swaps which PERSON you are looking at is exactly the kind of thing that misleads.
 * The control names the bodies instead, and says whose body each one is.
 */
export type BodySourceConfig = {
  id: BodySource;
  /** Short pill label. */
  label: string;
  /** One-line honest identity, shown beside the control at all times. */
  who: string;
  build: () => LayerAsset[];
  /** Primary disclosure line(s) — the context bar and the Notes & licensing panel. */
  banners: ReactNode[];
  /** Quiet hint over the canvas while nothing is picked. */
  note: ReactNode;
  /** Source/licensing bullets for the Notes & licensing panel. */
  attribution: ReactNode;
  /** Layers this body genuinely does not contain -> quiet "not in this dataset" chips. */
  missingLayers?: string[];
  /** Display names for layers whose generic name would be wrong for this body. */
  layerLabels?: Record<string, string>;
  /**
   * True only where the guided outer->inner journey is backed by real mapped meshes. The guide
   * navigates to specific structure ids (right ventricle, left ventricle, aorta) that exist on
   * the VH donor hearts; the reference body's heart meshes are not mapped to structures, so a
   * journey there would be theatre — it is not offered.
   */
  guided: boolean;
};

function VhAttribution({ sex }: { sex: Sex }) {
  const mf = SEX_LABELS[sex].toLowerCase();
  return (
    <ul>
      <li>
        HuBMAP HRA <em>{mf}</em> VH skin + heart — CC BY 4.0 (ccf-3d-reference-object-library{" "}
        {sex === "male" ? "VH_Male" : "VH_Female"} v1.2; ref-organ heart v1.3). One individual per
        sex; skin and heart share that individual&apos;s frame, so they nest at identity.
      </li>
      <li>
        Blood vasculature — same {mf} VH individual, v1.2 (CC BY 4.0): a central/trunk
        arterial-venous tree. The ascending aorta is mapped to a structure (both sexes); most
        of the ~104/108 per-vessel node names are not yet, so most vessel clicks show
        &quot;not in this dataset&quot;.
      </li>
      <li>
        This individual&apos;s muscle + full skeleton are not published (not in this dataset).
        The Reference body holds Z-Anatomy “Taro” — a different male individual.
      </li>
      <li>
        HOA tissue volume (male donor S-20-29, DOI 10.15151/ESRF-DC-1773964017, CC BY 4.0) is a
        different individual again — reachable from a heart pick or from the deep dives above.
      </li>
      <li>Body-context slices: NLM Visible Human Project.</li>
    </ul>
  );
}

function ReferenceAttribution() {
  return (
    <ul>
      <li>Z-Anatomy, derived from BodyParts3D — CC BY-SA 2.1 Japan / CC BY-SA 4.0.</li>
      <li>
        Systems — all from that one body&apos;s Z-Anatomy collections, so they are the same
        individual as the skeleton and muscle and need no registration: muscle, skeleton,
        organs/viscera (liver, gallbladder, stomach, intestines, pancreas, kidneys, urinary
        bladder, lungs, trachea, thyroid and other glands, tongue and palate, and the male
        reproductive organs), heart and the full vessel tree, brain + spinal cord + nerve
        tubes, joint capsules/ligaments/menisci, and lymph nodes + thymus + spleen + tonsils.
        The muscle layer excludes the connective-tissue sheets (fascia, aponeurosis,
        retinaculum) the source groups with the muscles, because they are not muscle. A
        layer&apos;s source therefore does NOT imply every structure of that name is present:
        e.g. the eye&apos;s ciliary body has no surface geometry in this source.
      </li>
      <li>
        Skin — the BodyParts3D whole-body skin (FMA7163), the SAME individual as the Z-Anatomy
        systems (Z-Anatomy is a retopologised BodyParts3D derivative and contains no skin mesh).
        Placed by a landmark-derived translation, with its inconsistent face winding repaired
        (~46&nbsp;% of faces were wound backwards in the source). The two are independently
        derived surfaces and do not coincide: against the skin, the median muscle vertex is
        ~18&nbsp;mm inside it, but ~6&nbsp;% of muscle vertices lie outside (worst ~26&nbsp;mm —
        hand and forearm muscles, eye muscles) and ~4&nbsp;% of skeleton vertices lie outside
        (worst ~44&nbsp;mm — skull, fingertips). With the skin on, that shows as patches of
        muscle and bone across the shoulders, back, hips, hands and lower legs. The outer
        envelope is correct (skin sits above the skull and below the sole, and wraps front and
        back) — it is the local surface fit that fails, so it cannot be removed by re-scaling
        the skin without disfiguring the hands. Source property, not a registration error; no
        geometry is offset or rescaled to hide it. CC BY-SA 2.1 Japan — attribution:
        “BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution-Share
        Alike 2.1 Japan”.
      </li>
      <li>
        A single fixed male reference individual (“Taro”) — a different person from the Visible
        Human donors, and a male body: no female anatomy is shown here, while the viscera layer
        does include that individual&apos;s male reproductive organs. Not per-sex.
      </li>
    </ul>
  );
}

function donorConfig(sex: Sex): BodySourceConfig {
  const id: BodySource = sex === "male" ? "donor-male" : "donor-female";
  return {
    id,
    label: BODY_SOURCE_LABELS[id],
    who: BODY_SOURCE_WHO[id],
    build: () => buildVhBody(sex),
    // The donor's "organ" layer is that individual's heart reference mesh and nothing else.
    layerLabels: { organ: "Heart" },
    missingLayers: ["skeleton", "muscle"],
    guided: true,
    banners: [
      <>
        Visible Human {SEX_LABELS[sex].toLowerCase()} donor — HuBMAP HRA skin + heart (CC BY 4.0),
        one real individual. Muscle and full skeleton of this person are not published, and the
        HOA tissue volume is yet another individual (donor S-20-29).
      </>
    ],
    note: (
      <>
        Peel down the rail to reveal what is inside this one person — skin, heart and the vessel
        tree are all this individual&apos;s. Click any structure to inspect it. Most of this
        body&apos;s interior is not published, so it is shown as “not in this dataset”, never
        filled in.
      </>
    ),
    attribution: <VhAttribution sex={sex} />
  };
}

const REFERENCE: BodySourceConfig = {
  id: "reference",
  label: BODY_SOURCE_LABELS.reference,
  who: BODY_SOURCE_WHO.reference,
  build: () => buildReference(),
  layerLabels: { organ: "Viscera", vessel: "Heart + vessels" },
  guided: false,
  banners: [
    <>
      Reference body — Z-Anatomy, derived from BodyParts3D (CC BY-SA 2.1 Japan / CC BY-SA 4.0).
      One male reference individual (“Taro”), a different person from the Visible Human donors.
      This is the body here with a complete interior: skin, muscle, skeleton, viscera, heart and
      vessels, nerves, joints and lymphatics of that one individual.
    </>
  ],
  note: (
    <>
      Peel down the rail — each stop takes the layers outside it off, so the body opens up from
      skin to nerves. Layers inside the peel point stay as you left them; the heavy systems
      mount when you first reach them. Click any structure to inspect it. Organs, ducts, bronchi
      and the brainstem are mapped to structures; bone, muscle, vessel and peripheral-nerve
      names are not mapped yet and show “not in this dataset”.
    </>
  ),
  attribution: <ReferenceAttribution />
};

/** Every body the pane can show, in control order (the fullest body first). */
export const BODY_SOURCES: BodySourceConfig[] = [
  REFERENCE,
  donorConfig("male"),
  donorConfig("female")
];
