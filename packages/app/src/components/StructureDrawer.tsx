import { useNavigate } from "react-router-dom";
import type { Structure } from "../../../schema/src/structure";
import type { Sex } from "../sex";

type StructureDrawerProps = {
  pickedName: string;
  structure: Structure | undefined;
  sex: Sex;
  onClose: () => void;
};

/**
 * Right-hand detail drawer shown only while a structure is picked (P1, docs/ui-vision.md).
 * There is no permanent empty panel — when nothing is picked the canvas shows a quiet hint
 * instead. Resolution (structureLookup) is unchanged and name-based; anything not in the
 * published graph renders as a quiet "Not in this dataset" note, never a guessed label.
 */
export function StructureDrawer({ pickedName, structure, sex, onClose }: StructureDrawerProps) {
  const navigate = useNavigate();

  const content = !structure ? (
    <>
      <p className="drawer-kicker">Not in this dataset</p>
      <p>
        Picked mesh <code>{pickedName}</code> is not in the published graph. No label is
        guessed.
      </p>
      {sex === "female" && pickedName.startsWith("VH_F_") && (
        <p className="note">
          Female HRA reference node (<code>VH_F_</code>). Female mesh → structure mappings
          are not published yet, so this shows as not in this dataset.
        </p>
      )}
    </>
  ) : (
    <>
      <p className="drawer-kicker">{structure.layer}</p>
      <h2>{structure.label}</h2>
      <dl className="struct-dl">
        <dt>id</dt>
        <dd>
          <code>{structure.id}</code>
        </dd>
        <dt>uberon</dt>
        <dd>{structure.uberon ?? "—"}</dd>
        <dt>fma</dt>
        <dd>{structure.fma ?? "—"}</dd>
        <dt>part_of</dt>
        <dd>{structure.part_of ?? "—"}</dd>
        <dt>reviewed</dt>
        <dd>{structure.reviewed ? "yes" : "no"}</dd>
        <dt>facts_id</dt>
        <dd>{structure.facts_id ?? "—"}</dd>
        <dt>voxel_size_um</dt>
        <dd>{structure.voxel_size_um ?? "—"}</dd>
        <dt>hoa_dataset_doi</dt>
        <dd>{structure.hoa_dataset_doi ?? "—"}</dd>
        <dt>sources</dt>
        <dd>
          {structure.sources.length === 0 ? (
            "—"
          ) : (
            <ul>
              {structure.sources.map((s, i) => (
                <li key={i}>
                  <code>{s.source_id}</code> — {s.note}
                </li>
              ))}
            </ul>
          )}
        </dd>
      </dl>
      {(structure.id === "heart" || structure.part_of === "heart") && (
        <div className="sidebar-action">
          <button type="button" className="volume-jump" onClick={() => navigate("/")}>
            Open S-20-29 HOA volume →
          </button>
          <p className="note">
            Leaving HRA reference mesh → HOA donor volume. S-20-29 is a male donor — a
            different person from either reference mesh.
          </p>
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={structure ? structure.label : pickedName}
      >
        <button type="button" className="drawer-close" onClick={onClose} aria-label="Close details">
          ×
        </button>
        {content}
      </aside>
    </>
  );
}
