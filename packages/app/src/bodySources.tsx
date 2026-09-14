import type { ReactNode } from "react";
import { BODY_SOURCE_LABELS, BODY_SOURCE_WHO, type BodySource } from "./bodySource";
import type { LayerAsset } from "./components/VolumeViewer";
import { DONOR_JOURNEY, REFERENCE_JOURNEY, type GuideJourney } from "./guide";
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
   * The guided journey this body offers, or undefined where it offers none. Each body has its OWN
   * journey because they are different people with different published anatomies: the donor's
   * follows circulation through the heart, the reference body's follows the alimentary passage.
   * The stops are filtered at render time to what actually resolves in this body's scene, so a
   * journey can never walk into a structure the body does not have.
   */
  journey?: GuideJourney;
};

function VhAttribution({ sex }: { sex: Sex }) {
  const mf = SEX_LABELS[sex].toLowerCase();
  const isMale = sex === "male";
  return (
    <ul>
      <li>
        HuBMAP HRA <em>{mf}</em> Visible Human — one real individual per sex (CC BY 4.0;
        ccf-3d-reference-object-library {sex === "male" ? "VH_Male" : "VH_Female"} v1.2, ref-organ
        heart v1.3). Skin, heart and blood vasculature are published for both sexes, and skin and
        heart share that individual&apos;s frame, so they nest at identity.
      </li>
      {isMale ? (
        <li>
          This body&apos;s organ set is published inside the same HuBMAP reference body and is
          registered into his frame, so nothing is aligned by hand: liver, lungs, kidneys,
          gallbladder and biliary tree, pancreas, spleen, thymus, small and large intestine,
          urinary bladder, ureters, urethra and prostate — plus the spine (all 24 vertebrae), the
          bony pelvis and the spinal cord. Every one was checked to sit inside his skin envelope at
          identity before it was wired.
        </li>
      ) : (
        <li>
          Her organ set is published inside the same HuBMAP reference body and is registered into
          her frame, so nothing is aligned by hand: liver, lungs, kidneys, gallbladder and biliary
          tree, pancreas, spleen, thymus, small and large intestine, urinary bladder, ureters,
          uterus, cervix, ovaries, fallopian tubes and vagina — plus the spine (including a sixth
          lumbar vertebra, a lumbarisation variant the source records), the bony pelvis and the
          spinal cord. Every one was checked to sit inside her skin envelope at identity before it
          was wired.
        </li>
      )}
      {!isMale && (
        <li>
          Two items from her source are deliberately not shown rather than shown by default: the
          placenta, because it is a pregnancy-specific organ and placing it on a non-pregnant body
          would assert a state that is not there, and the ligament set between the uterus and the
          ovaries, which has no matching structure row yet. Her source also carries a measurement
          model (not anatomy), which is likewise left out.
        </li>
      )}
      <li>
        Heart — this individual&apos;s own heart asset publishes the organ as separate meshes, not as
        one piece: four chambers, four valves, the interventricular septum and five named papillary
        muscles. The chambers, the valves and the septum each map to their own structure; the
        papillary muscles are deliberately unmapped, because Uberon models them as a group and
        filing five named muscles under one broad term would map a part to its whole.
      </li>
      <li>
        Not published for this individual, and therefore shown as “not in this dataset”: whole-body
        muscle, and a full articulated skeleton — only the spine, pelvis and spinal cord exist.
        (The Reference body shows a different individual&apos;s complete musculature and skeleton.)
      </li>
      <li>
        Blood vasculature (v1.2) is a central/trunk arterial-venous tree, and this individual&apos;s
        own vessels are now their own structures: {isMale ? "92 of the 104" : "95 of the 108"} vessel
        meshes this body publishes are mapped, each id verified at OLS4, and a click on one opens it.
        Both sexes are mapped where the source publishes both. The rest are vessels Uberon does not
        name — the coronary artery&apos;s named diagonal, descending and marginal branches and its
        smaller cardiac veins, the liver&apos;s segmental arteries, and the portal vein&apos;s two
        branches — and those clicks still report “not mapped to a structure”.
      </li>
      <li>
        Contributor note: three models in this body come from other labs, published inside the same
        HuBMAP CCF reference library and registered into this body&apos;s frame — the large
        intestine (Stony Brook University), the brain (the Allen Institute brain atlas: 283 named
        regions, each resolving to the brain as a whole) and one lymph node (NIH; its meshes are
        authored &quot;Yao&quot;). None of the three is HuBMAP-authored, and the brain is an atlas
        rather than that donor&apos;s scanned brain. Each structure row says so.
      </li>      <li>
        HOA tissue volume (male donor S-20-29, DOI 10.15151/ESRF-DC-1773964017, CC BY 4.0) is a
        different individual again — reachable from a heart pick or from the deep dives below.
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
        Skeleton — the bones of the skull, the vertebral column (atlas and axis through L5,
        sacrum and coccyx), the ribs, the sternum, the shoulder girdle and arms, and the pelvis
        and legs are each their own structure, sourced to this one body&apos;s Skeletal system
        collection. What is NOT mapped yet is stated rather than hidden: the bones of the hand
        and foot, the three ear ossicles and the teeth, and the laryngeal, nasal and costal
        cartilages, which are cartilage rather than bone. Those meshes render and click, and the
        drawer says they are not mapped to a structure.
      </li>
      <li>
        Muscle — 132 of this body&apos;s muscles are mapped to their own structures, each id
        verified by exact label against OLS4. The rest are not mapped, and the reason is the
        ontology rather than the asset: Uberon does not model a number of them at all as the source
        names them (extensor indicis, corrugator supercilii) or models them only as part of a named
        group (a named head or belly, such as the clavicular head of pectoralis major). Those
        meshes render and click, and the drawer says they are not mapped to a structure.
      </li>
      <li>
        Vessels — 229 of the 416 vessels this layer names are their own structures, each id accepted
        only where the asset&apos;s name is exactly Uberon&apos;s label or one of its exact synonyms.
        The remaining 166 are unmapped and the reason is the ontology: the segmental vessels of the
        lung, small named branches, and vessels Uberon does not model. A part is never mapped to its
        whole — the M1/M3 segments of the middle cerebral artery, the abdominal and thoracic parts
        of the inferior vena cava, and the divisions of the internal iliac artery all stay unmapped,
        as does a whole vena cava or aorta, which this layer carries only as its parts. Two names
        were refused even though Uberon&apos;s synonymy would have accepted them: &quot;Aortic
        arch&quot; is a synonym of the EMBRYONIC pharyngeal arch artery (UBERON:0004363), so it maps
        to the adult arch of the aorta (UBERON:0001508) instead, and &quot;Medial plantar veins&quot;
        resolves to a digital vein of the toes, a different vessel. The valve leaflets this layer
        names are parts of valves whose own rows come from the donors' heart assets, so the layer
        claims none of the heart's parts.
      </li>
      <li>
        Nerves and sense organs — 160 of the 315 names in this layer are their own structures, each id
        accepted only where the asset&apos;s name is exactly Uberon&apos;s label or one of its exact
        synonyms. That covers the cranial nerves, the named nerves of the limbs and trunk, the
        brainstem and its nuclei, the cerebellum, parts of the brain surface, the spinal cord, and the
        eye (cornea, iris, retina, sclera, vitreous body and the eyeball&apos;s segments). The rest are
        not mapped, and the reason is the ontology or the naming: Uberon has no term at all for several
        named nerves (iliohypogastric, genitofemoral, lateral femoral cutaneous), and for others it
        names the structure with a qualifier its synonym list does not shorten to the asset&apos;s word
        (the source says &quot;Culmen&quot;, Uberon says &quot;cerebellum vermis culmen&quot;; the source
        says &quot;Lens&quot;, Uberon says &quot;lens of camera-type eye&quot;). A few are the source&apos;s
        own abbreviations of an atlas parcellation (Lat Fis-ant-Horizont), which cannot be resolved
        without guessing. Those meshes render and click, and the drawer says they are not mapped.
      </li>
      <li>
        Joints — 22 of the layer&apos;s 234 names are their own structures, each id accepted on an
        exact Uberon label, an exact synonym, or (once) on Uberon&apos;s joint-qualified form of the
        same name. That covers the cruciate and talofibular ligaments, the hip and shoulder capsules,
        the temporomandibular joint&apos;s capsule and disc, the labra, the anterior and posterior
        longitudinal ligaments, and the pubic and sacrococcygeal symphyses. The other 212 are not
        mapped and the reason is the ontology: Uberon has no term at all for the acromioclavicular
        ligament, the fibular collateral ligament, the menisci or the knee&apos;s articular capsule,
        and it names others with a joint qualifier that is not unique enough to accept. Those meshes
        render and click, and the drawer says they are not mapped.
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
  const isMaleDonor = sex === "male";
  return {
    id,
    label: BODY_SOURCE_LABELS[id],
    who: BODY_SOURCE_WHO[id],
    build: () => buildVhBody(sex),
    // The donor's "organ" layer is now every organ published for that body, not only the heart;
    // the skeleton is a PARTIAL one (spine + pelvis) and the nerve layer is the cord alone, so
    // both are named for exactly what they contain.
    layerLabels: { organ: "Organs", skeleton: "Spine + pelvis", nerve: "Brain + cord", lymphatic: "Lymph node" },
    missingLayers: ["muscle"],
    journey: DONOR_JOURNEY,
    banners: [
      <>
        Visible Human {SEX_LABELS[sex].toLowerCase()} donor — HuBMAP HRA (CC BY 4.0).{" "}
        {isMaleDonor
          ? "His published anatomy, plus three models contributed by other labs and registered into his frame (large intestine, brain atlas, one lymph node — named in the notes below)."
          : "Her published anatomy, including the reproductive organs (uterus, cervix, ovaries, fallopian tubes, vagina), plus the same three contributed models registered into her frame (large intestine, brain atlas, one lymph node — named in the notes below)."}{" "}
        Anything not published is labelled “not in this dataset”; muscle and a full skeleton are not
        published for this individual. The HOA tissue volume is yet another individual (donor
        S-20-29).
      </>
    ],
    note: (
      <>
        Peel down the rail to open this one person up: skin, then organs, then the spine and
        spinal cord, with the vessel tree throughout. Click any structure to inspect it. Whatever
        is not published for this individual is labelled as such and never filled in.
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
  layerLabels: { organ: "Viscera", vessel: "Heart + vessels", nerve: "Nerves + eyes" },
  journey: REFERENCE_JOURNEY,
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
      mount when you first reach them. Click any structure to inspect it. Organs, ducts, bronchi,
      the brainstem, the bones of the skull, spine, ribs, sternum and limbs, 132 of this
      body&apos;s muscles, 229 named vessels of the heart-and-vessels layer, 160 of the nerve
      layer&apos;s names — the cranial and named peripheral nerves, the brain&apos;s parts and the
      eye — and 22 of the joint layer&apos;s ligaments, capsules and symphyses are each mapped to a
      structure; the hand-and-foot bones, and the vessel, nerve, joint and muscle names Uberon does
      not model, are not mapped yet, so they report “not mapped to a structure”.
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
