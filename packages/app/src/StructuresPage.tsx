import { Link } from "react-router-dom";
import structuresJson from "../../../content/published/structures.json";
import type { Structure } from "../../schema/src/structure";
import { groupByLayer, indexEntries, indexSummary } from "./structureIndex";
import { PEEL_ORDER } from "./peel";
import type { BodySource } from "./bodySource";

/**
 * The index of everything this atlas documents.
 *
 * It is a LIST, not a viewer: the point is to make the atlas's actual content visible and each
 * entry linkable (the shareable-view work in bodySource.ts is what makes that possible), because a
 * reference resource whose contents you have to stumble across is not much of a reference.
 *
 * What it deliberately does NOT do is imply more than exists. It states how many rows have nothing
 * to click, marks entries with no fact card, and says on which body each structure can be opened.
 *
 * File naming note: this component is NOT `StructureIndex.tsx`, because that differs from the pure
 * module `structureIndex.ts` only in casing — which Windows cannot distinguish, so the import
 * resolved to the wrong file.
 */
const structures = structuresJson as unknown as Structure[];

/** Short body names for a dense list, expanded by the legend at the top of the page. */
const BODY_SHORT: Record<BodySource, string> = {
  reference: "Reference",
  "donor-male": "Donor M",
  "donor-female": "Donor F"
};

/** Reuses the pane's own display names so a layer is called the same thing everywhere. */
const LAYER_LABELS: Record<string, string> = {
  skin: "Skin",
  fascia: "Fascia",
  muscle: "Muscle",
  skeleton: "Skeleton",
  joint: "Joints",
  organ: "Organs and viscera",
  vessel: "Blood vessels",
  nerve: "Nerves",
  lymphatic: "Lymphatic",
  tissue: "Tissue"
};

export function StructuresPage() {
  const entries = indexEntries(structures);
  const summary = indexSummary(structures);
  const groups = groupByLayer(entries, PEEL_ORDER, (layer) => LAYER_LABELS[layer] ?? layer);
  const withoutMeshes = summary.totalRows - summary.documented;

  return (
    <div className="doc-page idx-page">
      <h1 className="idx-title">All structures</h1>
      <p className="idx-summary">
        {summary.documented} structures are documented and clickable, {summary.withCards} of them
        with a published fact card. Every entry opens on the body that actually carries it, and each
        is a link you can share. The graph holds {summary.totalRows} rows in total: the other{" "}
        {withoutMeshes} describe whole layers (skin, muscle, the reference skeleton …) and nothing
        resolves to them, so they are not listed here — listing them would promise a click that does
        not exist.
      </p>
      <p className="idx-legend">
        <strong>Reference</strong> — the Z-Anatomy male reference individual.{" "}
        <strong>Donor M</strong> / <strong>Donor F</strong> — the HuBMAP Visible Human male and
        female donors. A structure listed under more than one is a separate published copy in each
        of those individuals, not the same scan.
      </p>

      {groups.map((group) => (
        <section className="idx-group" key={group.layer}>
          <h2 className="idx-group__head">
            {group.label} <span className="idx-group__count">{group.entries.length}</span>
          </h2>
          <ul className="idx-list">
            {group.entries.map((e) => (
              <li className="idx-item" key={e.id}>
                <Link className="idx-item__link" to={e.href}>
                  {e.label}
                </Link>
                <span className="idx-item__meta">
                  {e.uberon ? <code>{e.uberon}</code> : <span className="idx-item__none">no id</span>}
                  <span className="idx-item__bodies">
                    {e.bodies.map((b) => BODY_SHORT[b]).join(" · ")}
                  </span>
                  {!e.hasCard && <span className="idx-item__flag">no fact card yet</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="idx-foot">
        Parts of the bodies are not mapped to structures yet. On the Visible Human donor bodies the
        per-vessel names are not mapped and only the ascending aorta is; on the reference body the
        hand-and-foot bones, 155 of its 315 nerve-layer names, 166 of its 416 vessel names and the
        named muscle parts Uberon does not model are not. Those meshes report “not mapped to a
        structure” when clicked, and they are absent from this list on purpose rather than listed as
        if they were browsable.{" "}
        <Link to="/">Back to the body →</Link>
      </p>
    </div>
  );
}
