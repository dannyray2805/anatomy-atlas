import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import structures from "../../../content/published/structures.json";
import {
  VolumeViewer,
  type CameraPreset,
  type InventoryItem,
  type LayerAsset,
  type VolumeViewerHandle
} from "./components/VolumeViewer";
import { StructureDrawer } from "./components/StructureDrawer";
import { lookupStructure } from "./structureLookup";
import { guideStepOrder, type GuideStepKey } from "./guide";
import { useGuidedPeel } from "./useGuidedPeel";
import { SEX_LABELS, SEX_OPTIONS, type Sex } from "./sex";

// Display names for the Layers control, keyed by the schema's AnatomyLayer values. A pill is
// only interactive for a layer that has at least one real entry in layers.ts.
const LAYER_LABELS: Record<string, string> = {
  skin: "Skin",
  fascia: "Fascia",
  muscle: "Muscle",
  skeleton: "Skeleton",
  organ: "Organs (heart)",
  vessel: "Vessels",
  nerve: "Nerves",
  tissue: "Tissue"
};

type BodyPageProps = {
  /** Builds the layer list for the page's mode (may depend on sex). */
  build: (sex: Sex) => LayerAsset[];
  /** Primary disclosure/disclaimer lines (functions of sex so per-sex copy stays accurate). */
  banners: (sex: Sex) => ReactNode[];
  /** Quiet hint shown over the canvas while nothing is picked (context / how-to). */
  note: (sex: Sex) => ReactNode;
  /** Source/attribution bullets for the "Notes & licensing" panel. */
  attribution: (sex: Sex) => ReactNode;
  /** Whether the Male|Female toggle applies to this body (VH peel yes, Reference Atlas no). */
  showSex: boolean;
  /** Anatomical layers that are honestly ABSENT here -> quiet "not in this dataset" chips. */
  missingLayers?: string[];
};

/**
 * P1 immersive "lab" page (docs/ui-vision.md): the 3D body fills a full-height dark stage
 * with floating glass controls; disclosures collapse into one dismissible context line plus a
 * "Notes & licensing" panel; selection detail slides in from the right instead of a permanent
 * empty sidebar. Truth rules unchanged — every label resolves via structures.json, and
 * absent layers are surfaced as quiet not-in-this-dataset chips.
 *
 * Extraction note: this component is presentation. The guided-peel state machine lives in
 * useGuidedPeel.ts and its per-stop effects in guide.ts (both testable without React).
 */
export function BodyPage({ build, banners, note, showSex, missingLayers, attribution }: BodyPageProps) {
  const [sex, setSex] = useState<Sex>("male");
  const [pickedName, setPickedName] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(1);
  // Explicit show/hide choice per anatomical layer (recorded only when the user toggles). A
  // layer with a real asset defaults to visible (`?? true`).
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({});
  // Disclosure line + Notes & licensing popover.
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDismissed, setNotesDismissed] = useState(false);

  // P2 interaction: hover label, camera presets + auto-orbit, search-to-fly.
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [presetReq, setPresetReq] = useState<{ preset: CameraPreset; n: number } | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const viewerRef = useRef<VolumeViewerHandle | null>(null);
  const presetN = useRef(0);
  const goPreset = (preset: CameraPreset) => setPresetReq({ preset, n: ++presetN.current });
  const hoverStructure = hover ? lookupStructure(structures, hover.name) : undefined;
  const pickAndFly = (item: InventoryItem) => {
    setPickedName(item.name);
    setSearch(item.label);
    viewerRef.current?.flyToName(item.name);
  };

  const structure = useMemo(() => lookupStructure(structures, pickedName), [pickedName]);
  // Rebuild the layer list when sex changes, mapping each LayerAsset's `visible` flag through
  // the per-layer visibility map (see layers.ts).
  const layers = useMemo(
    () =>
      build(sex).map((entry) => ({
        ...entry,
        visible: visibleLayers[entry.layer] ?? true
      })),
    [build, sex, visibleLayers]
  );
  // Unique anatomical layers that currently have at least one real asset. Only these render a
  // pill — never imply a hideable layer exists before real data does.
  const configuredLayers = useMemo(
    () => Array.from(new Set(layers.map((entry) => entry.layer))),
    [layers]
  );
  const toggleLayer = (layer: string) =>
    setVisibleLayers((prev) => ({ ...prev, [layer]: !(prev[layer] ?? true) }));
  const hasOpacity = configuredLayers.includes("organ");
  const primaryBanner = banners(sex)[0];

  // P3 — one-tap peel + guided peel journey (only where a true outer->inner peel exists:
  // the per-sex VH body with skin + organs).
  const hasSkin = configuredLayers.includes("skin");
  const hasOrgan = configuredLayers.includes("organ");
  const isBodyPeel = showSex && hasSkin && hasOrgan;
  const lvItem = inventory.find((i) => i.structureId === "heart-left-ventricle");
  const aortaItem = inventory.find((i) => i.structureId === "aorta-ascending");
  const rvItem = inventory.find((i) => i.structureId === "heart-right-ventricle");
  const skinVisible = visibleLayers.skin ?? true;
  // True once the current body's GLBs have finished loading (so peel/guide never race ahead of
  // asset loads — important on slow/throttled connections). Reset on sex change.
  const [sceneReady, setSceneReady] = useState(false);

  // Peel the outer layer (skin) off the stack, or restore it.
  const togglePeel = () => setVisibleLayers((prev) => ({ ...prev, skin: !(prev.skin ?? true) }));

  // Which journey stops exist is per-sex and data-driven (male: RV → LV → aorta; female:
  // RV → aorta — never padded to match; RV is dual-sex, LV is male-only). The pure ordering
  // lives in guide.ts (tested); the state machine lives in useGuidedPeel.ts.
  const guideStepKeys: GuideStepKey[] = isBodyPeel
    ? guideStepOrder({
        rightVentricle: !!rvItem,
        leftVentricle: !!lvItem,
        ascendingAorta: !!aortaItem
      })
    : [];

  const guide = useGuidedPeel({
    isBodyPeel,
    sex,
    steps: guideStepKeys,
    rightVentricle: rvItem,
    leftVentricle: lvItem,
    ascendingAorta: aortaItem,
    setVisibleLayers,
    setOpacity,
    clearPicked: () => setPickedName(null),
    goPreset,
    pickAndFly,
    flyToHeart: () => viewerRef.current?.flyToHeartMesh()
  });

  const captions: Record<GuideStepKey, { title: string; caption: ReactNode }> = {
    "whole-body": {
      title: "Whole body",
      caption: (
        <>
          {SEX_LABELS[sex]} VH individual — HuBMAP HRA skin + heart (CC BY 4.0), one
          individual per sex. This individual&apos;s muscle + full skeleton are not
          published.
        </>
      )
    },
    "peel-skin": {
      title: "Peel the skin",
      caption: (
        <>
          Hiding the skin reveals the organs inside the same individual&apos;s frame — here
          the heart in its thorax. Layer pills and the peel slider do this freely.
        </>
      )
    },
    "right-ventricle": {
      title: "Focus: right ventricle",
      caption: (
        <>
          The right ventricle (UBERON:0002080) receives blood from the right atrium and pumps
          it into the pulmonary artery toward the lungs; its HRA mesh is mapped on this{" "}
          {SEX_LABELS[sex].toLowerCase()} body — its published fields open in the drawer.
        </>
      )
    },
    "left-ventricle": {
      title: "Focus: left ventricle",
      caption: (
        <>
          The left ventricle (UBERON:0002084) is a part of the heart whose HRA mesh is
          mapped on this {SEX_LABELS[sex].toLowerCase()} body — its published fields open
          in the drawer.
        </>
      )
    },
    "ascending-aorta": {
      title: "Follow the aorta out",
      caption: (
        <>
          The ascending aorta (UBERON:0001496) is the portion of the aorta that begins at
          the base of the left ventricle and carries blood toward the arch; its HRA mesh is
          mapped on this {SEX_LABELS[sex].toLowerCase()} body — its published fields open in
          the drawer.
        </>
      )
    },
    "inside-heart": {
      title: "Inside: the heart",
      caption: (
        <>
          This {SEX_LABELS[sex].toLowerCase()} body&apos;s heart is a real HRA reference
          mesh inside the thorax. Only published mesh→structure mappings resolve on
          click — most heart parts currently show “not in this dataset”.
        </>
      )
    }
  };
  const guideSteps: { key: GuideStepKey; title: string; caption: ReactNode }[] =
    guideStepKeys.map((key) => ({ key, ...captions[key] }));

  // A different sex means a different GLB set: mark the scene as loading again so peel/guide
  // stay disabled until the new assets report in.
  useEffect(() => {
    setSceneReady(false);
  }, [sex]);

  return (
    <section className="lab">
      {!notesDismissed ? (
        <div className="lab-context glass">
          <p className="lab-context__text">{primaryBanner}</p>
          <div className="lab-context__actions">
            <button
              type="button"
              className="chip chip--quiet"
              aria-expanded={notesOpen}
              onClick={() => setNotesOpen((o) => !o)}
            >
              {notesOpen ? "Hide" : "Notes & licensing"}
            </button>
            <button
              type="button"
              className="lab-context__close"
              aria-label="Dismiss disclosure"
              title="Dismiss"
              onClick={() => setNotesDismissed(true)}
            >
              ×
            </button>
          </div>
        </div>
      ) : (
        <div className="lab-context-ghost">
          <button
            type="button"
            className="chip chip--quiet"
            onClick={() => {
              setNotesDismissed(false);
              setNotesOpen(true);
            }}
          >
            ⓘ Notes & licensing
          </button>
        </div>
      )}

      <div className="lab-stage">
        <div className="lab-canvas">
          <VolumeViewer
            ref={viewerRef}
            layers={layers}
            selectedName={pickedName}
            onPick={setPickedName}
            opacity={opacity}
            hoveredName={hover ? hover.name : null}
            onHover={(name, x, y) =>
              setHover(name && x != null && y != null ? { name, x, y } : null)
            }
            presetRequest={presetReq}
            autoOrbit={autoOrbit}
            onInventory={(items) => {
              setInventory(items);
              setSceneReady(true);
            }}
          />
        </div>

        {hover && (
          <div
            className={`hover-label${hoverStructure ? "" : " hover-label--unknown"}`}
            style={{ left: hover.x, top: hover.y }}
            role="status"
          >
            {hoverStructure ? hoverStructure.label : "Not in this dataset"}
          </div>
        )}

        {notesOpen && (
          <div className="lab-popover glass" role="dialog" aria-label="Notes and licensing">
            <h3>Notes &amp; licensing</h3>
            {banners(sex).map((b, i) => (
              <p className="lab-popover__line" key={i}>
                {b}
              </p>
            ))}
            <h4>Sources</h4>
            {attribution(sex)}
            <p className="lab-popover__fine">
              Not for diagnosis. This app renders only the cited datasets above — no anatomy is
              generated or guessed. Full register: <code>docs/sources.md</code>.
            </p>
            <button type="button" className="chip chip--quiet" onClick={() => setNotesOpen(false)}>
              Close
            </button>
          </div>
        )}

        {showSex && (
          <div className="glass glass--sex" role="group" aria-label="Sex">
            <span className="glass__label">Sex</span>
            {SEX_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className={`pill${s === sex ? " pill--active" : ""}`}
                aria-pressed={s === sex}
                onClick={() => setSex(s)}
              >
                {SEX_LABELS[s]}
              </button>
            ))}
          </div>
        )}

        {!guide.guideOpen && inventory.length > 0 && (
          <div className="glass glass--search" role="group" aria-label="Find a structure">
            <label className="glass__label" htmlFor="structure-search">
              Find
            </label>
            <input
              id="structure-search"
              list="structure-search-list"
              value={search}
              placeholder="structure…"
              onChange={(e) => {
                setSearch(e.target.value);
                const it = inventory.find(
                  (i) => i.label.toLowerCase() === e.target.value.trim().toLowerCase()
                );
                if (it) pickAndFly(it);
              }}
            />
            <datalist id="structure-search-list">
              {inventory.map((it) => (
                <option key={it.name} value={it.label} />
              ))}
            </datalist>
          </div>
        )}

        {!guide.guideOpen && (
          <div className="glass glass--layers" role="group" aria-label="Layers">
            <span className="glass__label">Layers</span>
            {configuredLayers.map((layer) => {
              const on = visibleLayers[layer] ?? true;
              return (
                <button
                  key={layer}
                  type="button"
                  className={`pill${on ? " pill--active" : ""}`}
                  aria-pressed={on}
                  onClick={() => toggleLayer(layer)}
                >
                  {on ? "◉ " : "○ "}
                  {LAYER_LABELS[layer] ?? layer}
                </button>
              );
            })}
            {hasOpacity && (
              <label
                className="opacity"
                title="Peel depth — lower opacity reveals what is under the outer layer"
              >
                <span>peel</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={opacity}
                  aria-label="Opacity / peel depth"
                  onChange={(e) => setOpacity(Number(e.target.value))}
                />
                <span className="opacity__val">{Math.round(opacity * 100)}%</span>
              </label>
            )}
            {(missingLayers ?? []).map((layer) => (
              <span
                className="chip chip--missing"
                key={layer}
                title="Not in this dataset — see Notes & licensing"
              >
                {LAYER_LABELS[layer] ?? layer} · not in this dataset
              </span>
            ))}
            {sceneReady && isBodyPeel && (
              <button
                type="button"
                className={`pill${!skinVisible ? " pill--active" : ""}`}
                onClick={togglePeel}
                title="Peel the outer layer off (press again to restore)"
              >
                {skinVisible ? "▸ Peel skin" : "⟲ Restore skin"}
              </button>
            )}
            {sceneReady && isBodyPeel && (
              <button type="button" className="chip chip--quiet" onClick={guide.start}>
                ▶ Guided peel
              </button>
            )}
          </div>
        )}

        {guide.guideOpen && isBodyPeel && guideSteps.length > 0 && (
          <div className="glass glass--guide" role="group" aria-label="Guided peel journey">
            <div className="guide-head">
              <span className="glass__label">
                Guided peel · {SEX_LABELS[sex]}
              </span>
              <button type="button" className="chip chip--quiet" onClick={guide.stop}>
                Exit guide
              </button>
            </div>
            <div className="guide-dots" role="tablist" aria-label="Journey steps">
              {guideSteps.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  role="tab"
                  aria-selected={i === guide.stepIndex}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                  className={`guide-dot${i === guide.stepIndex ? " guide-dot--active" : ""}`}
                  onClick={() => guide.setGuideStep(i)}
                />
              ))}
            </div>
            <h3 className="guide-title">{guideSteps[guide.stepIndex].title}</h3>
            <p className="guide-caption">{guideSteps[guide.stepIndex].caption}</p>
            <div className="guide-actions">
              <button
                type="button"
                className="pill"
                disabled={guide.stepIndex === 0}
                onClick={() => guide.setGuideStep((s) => Math.max(0, s - 1))}
              >
                ‹ Back
              </button>
              {guide.atLast ? (
                <button type="button" className="pill pill--active" onClick={guide.stop}>
                  Done
                </button>
              ) : (
                <button
                  type="button"
                  className="pill pill--active"
                  onClick={() => guide.setGuideStep((s) => Math.min(guideSteps.length - 1, s + 1))}
                >
                  Next ›
                </button>
              )}
            </div>
          </div>
        )}

        {!guide.guideOpen && (
          <div className="glass glass--camera" role="group" aria-label="Camera">
            <button type="button" className="pill pill--sm" onClick={() => goPreset("front")}>
              Front
            </button>
            <button
              type="button"
              className="pill pill--sm"
              onClick={() => goPreset("threequarter")}
            >
              ¾
            </button>
            <button type="button" className="pill pill--sm" onClick={() => goPreset("top")}>
              Top
            </button>
            <button
              type="button"
              className={`pill pill--sm${autoOrbit ? " pill--active" : ""}`}
              aria-pressed={autoOrbit}
              title="Slowly orbit the body while idle"
              onClick={() => setAutoOrbit((o) => !o)}
            >
              auto-orbit
            </button>
          </div>
        )}

        {!guide.guideOpen && pickedName === null && (
          <div className="lab-hint">
            <p>{note(sex)}</p>
          </div>
        )}

        {pickedName !== null && (
          <StructureDrawer
            pickedName={pickedName}
            structure={structure}
            sex={sex}
            onClose={() => setPickedName(null)}
          />
        )}
      </div>
    </section>
  );
}
