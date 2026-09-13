import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { Structure } from "../../../schema/src/structure";
import type { Sex } from "../sex";
import { canAsk, canSend, chatRequestBody, CHAT_ENDPOINT, interpretChatResponse } from "../chat";
import type { ChatOutcome } from "../chat";

type StructureDrawerProps = {
  pickedName: string;
  structure: Structure | undefined;
  sex: Sex;
  onClose: () => void;
};

/**
 * Citation-bounded tutor (Worker POST /api/chat). There is deliberately no free-form chat box: a
 * question is always scoped to the structure whose card is open, and the Worker refuses — never
 * invents — anything the published card does not answer.
 */
function AskAboutStructure({ structureId }: { structureId: string }) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ChatOutcome | null>(null);

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !canSend(question)) return;
    setBusy(true);
    setOutcome(null);
    try {
      const res = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chatRequestBody(structureId, question))
      });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      setOutcome(interpretChatResponse(res.status, body));
    } catch {
      setOutcome({ kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  const fieldId = `ask-${structureId}`;

  return (
    <div className="drawer-ask">
      <form onSubmit={ask}>
        <label className="drawer-kicker" htmlFor={fieldId}>
          Ask about this structure
        </label>
        <input
          id={fieldId}
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="e.g. Where does it send blood?"
          disabled={busy}
          autoComplete="off"
        />
        <button type="submit" disabled={busy || !canSend(question)}>
          {busy ? "Asking…" : "Ask"}
        </button>
      </form>
      {outcome?.kind === "answer" && (
        <>
          <p className="drawer-answer">{outcome.reply}</p>
          <p className="note">
            Quoted from this structure's published fact card. Nothing is added from general
            knowledge.
          </p>
        </>
      )}
      {outcome?.kind === "not-in-card" && (
        <p className="note">Not in this structure's published fact card — no answer is invented.</p>
      )}
      {outcome?.kind === "no-card" && (
        <p className="note">No published fact card for this structure yet, so the tutor declines.</p>
      )}
      {outcome?.kind === "unconfigured" && (
        <p className="note">The tutor isn't configured on the server.</p>
      )}
      {outcome?.kind === "error" && <p className="note">The tutor is unavailable right now.</p>}
    </div>
  );
}

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
      <div className="drawer-dives">
        <p className="drawer-kicker">Deep dives</p>
        {(structure.id === "heart" || structure.part_of === "heart") && (
          <div className="sidebar-action">
            <button type="button" className="volume-jump" onClick={() => navigate("/volume")}>
              Heart tissue volume (S-20-29, HiP-CT) →
            </button>
            <p className="note">
              Leaving the reference mesh → the HOA donor volume. S-20-29 is a male donor — yet
              another individual.
            </p>
          </div>
        )}
        <div className="sidebar-action">
          <button type="button" className="volume-jump" onClick={() => navigate("/slices")}>
            Visible Human cross-sections →
          </button>
          <p className="note">
            NLM Visible Human cryosection slices (0.33&nbsp;mm/pixel) — body-context images, not a
            labelled structure map.
          </p>
        </div>
      </div>
      {canAsk(structure) && <AskAboutStructure structureId={structure.id} />}
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
