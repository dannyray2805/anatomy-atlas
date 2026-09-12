import { BodyPage } from "./BodyPage";
import { buildReference, buildVhBody } from "./layers";
import { SEX_LABELS, type Sex } from "./sex";

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
        This individual&apos;s muscle + full skeleton are not published (not in this dataset). The
        Reference Atlas holds Z-Anatomy “Taro” — a different male individual.
      </li>
      <li>
        HOA tissue volume (male donor S-20-29, DOI 10.15151/ESRF-DC-1773964017, CC BY 4.0) is a
        different individual — reachable from a heart pick.
      </li>
      <li>
        Body-context slices: NLM Visible Human Project.
      </li>
    </ul>
  );
}

function ReferenceAttribution() {
  return (
    <ul>
      <li>
        Z-Anatomy, derived from BodyParts3D — CC BY-SA 2.1 Japan / CC BY-SA 4.0.
      </li>
      <li>
        A single fixed male reference individual (“Taro”) — a different person from the VH peel
        body. Muscular/skeletal study only; not per-sex.
      </li>
    </ul>
  );
}

/**
 * /body — the true per-sex Visible Human (VH) body peel (Path 1, docs/body-peel.md). Each sex
 * is ONE HuBMAP VH individual: skin + heart at identity. That individual's muscle + full
 * skeleton are not published anywhere -> quiet not-in-this-dataset chips (Z-Anatomy is a
 * different person and lives on the Reference Atlas route).
 */
export function VhBodyPeelPage() {
  return (
    <BodyPage
      showSex
      build={buildVhBody}
      missingLayers={["skeleton", "muscle"]}
      banners={(sex) => [
        <>
          Visible Human body peel — HuBMAP HRA {SEX_LABELS[sex].toLowerCase()} skin + heart
          (CC BY 4.0), one individual per sex; not the male donor S-20-29 HOA volume.
        </>
      ]}
      attribution={(sex) => <VhAttribution sex={sex} />}
      note={(sex) => (
        <>
          Peel: hide the outer layer or lower its opacity to reveal what is inside, then click a
          structure to inspect it. Skin and heart share the HuBMAP{" "}
          {SEX_LABELS[sex].toLowerCase()} VH frame, so they nest at identity. HOA volume is the
          male donor S-20-29 scan.
        </>
      )}
    />
  );
}

/**
 * /reference — Z-Anatomy "Taro" skeletal + muscular systems (CC BY-SA), kept as a clearly
 * separated reference individual for muscular/skeletal study. NOT part of the VH peel body.
 */
export function ReferenceAtlasPage() {
  return (
    <BodyPage
      showSex={false}
      build={() => buildReference()}
      banners={() => [
        <>
          Reference Atlas — Z-Anatomy, derived from BodyParts3D (CC BY-SA 2.1 Japan / CC BY-SA
          4.0). A single fixed male reference individual (&quot;Taro&quot;) — a different person
          from the VH peel body, shown for muscular/skeletal study only.
        </>
      ]}
      attribution={() => <ReferenceAttribution />}
      note={() => (
        <>
          Click a structure to inspect it. These are whole-layer GLBs: per-bone/per-muscle names
          are not mapped to structures yet, so mesh clicks show “not in this dataset”. The VH
          body peel (skin + organs, per sex) is on the Visible Human body tab.
        </>
      )}
    />
  );
}
