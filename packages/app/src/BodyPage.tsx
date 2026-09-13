import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import structuresJson from "../../../content/published/structures.json";
import type { Structure } from "../../schema/src/structure";
import {
  VolumeViewer,
  type CameraPreset,
  type InventoryItem,
  type VolumeViewerHandle
} from "./components/VolumeViewer";
import { StructureDrawer } from "./components/StructureDrawer";
import { COLOR_DISCLOSURE } from "./anatomyColors";
import { allSystemsShown, applyVisibility, setSystemsVisibility, systemLayers } from "./layerVisibility";
import { isPeeled, peelStops, peelTo, restorePeel, type PeelStopState } from "./peel";
import {
  buildShareQuery,
  resolveSource,
  shareStateFromQuery,
  type BodySource
} from "./bodySource";
import { BODY_SOURCES, type BodySourceConfig } from "./bodySources";
import { lookupStructure } from "./structureLookup";
import { indexSummary } from "./structureIndex";
import { guideStops } from "./guide";
import { useGuidedPeel } from "./useGuidedPeel";

/**
 * The published graph, typed as Structure[]. `pnpm validate` checks structures.json against
 * StructureSchema, so this assertion is backed by that gate — importing the JSON directly widens
 * `layer` to `string` and loses the anatomy-layer union.
 */
const structures = structuresJson as unknown as Structure[];

// Display names for the peel rail, keyed by the schema's AnatomyLayer values. A body may
// override any of these (the donor's "organ" layer is only that person's heart).
const LAYER_LABELS: Record<string, string> = {
  skin: "Skin",
  fascia: "Fascia",
  muscle: "Muscle",
  skeleton: "Skeleton",
  joint: "Joints",
  organ: "Organs (heart)",
  vessel: "Vessels",
  nerve: "Nerves",
  lymphatic: "Lymphatic",
  tissue: "Tissue"
};

function peelTitle(state: PeelStopState, label: string): string {
  if (state === "peeled") return `${label} is peeled away — click to cover it back up`;
  if (state === "current") return `${label} — the outermost layer on screen`;
  return `Peel to ${label} — takes the layers outside it off`;
}

/**
 * The single pane: one body, one canvas, and everything else reached by clicking into it
 * (docs/ui-vision.md §9). There is no route per body — the Body control swaps which individual
 * is shown, and each option is labelled with whose body it is, because these are different
 * people and must never read as one composite.
 *
 * Disclosure and licensing live in a quiet footer BELOW the pane (docs/ui-vision.md §11) rather
 * than in a bar across the top: still on every view, still selectable and screen-read, but out of
 * the way of the thing the page exists to show.
 *
 * Extraction note: this component is presentation. The guided-peel state machine lives in
 * useGuidedPeel.ts, the stop order in guide.ts, the peel rules in peel.ts and the illustrative
 * colours in anatomyColors.ts (all testable without React).
 */
export function BodyPage() {
  // Read the shareable view ONCE, from the URL, so a link opens exactly what it describes.
  const [initialView] = useState(() => shareStateFromQuery(window.location.search));
  const [source, setSource] = useState<BodySource>(initialView.source);
  const [pickedName, setPickedName] = useState<string | null>(initialView.structure);
  const [opacity, setOpacity] = useState(1);
  // Explicit show/hide choice per anatomical layer, recorded only when the user peels. Absent
  // keys fall back to the layer's own default (see layerVisibility.ts).
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({});

  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [presetReq, setPresetReq] = useState<{ preset: CameraPreset; n: number } | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [sceneReady, setSceneReady] = useState(false);
  const viewerRef = useRef<VolumeViewerHandle | null>(null);
  const presetN = useRef(0);
  const goPreset = (preset: CameraPreset) => setPresetReq({ preset, n: ++presetN.current });

  const config: BodySourceConfig = resolveSource(BODY_SOURCES, source) ?? BODY_SOURCES[0];

  const hoverStructure = hover ? lookupStructure(structures, hover.name) : undefined;
  const pickAndFly = (item: InventoryItem) => {
    setPickedName(item.name);
    setSearch(item.label);
    viewerRef.current?.flyToName(item.name);
  };

  const structure = useMemo(() => lookupStructure(structures, pickedName), [pickedName]);
  const layers = useMemo(
    () => applyVisibility(config.build(), visibleLayers),
    [config, visibleLayers]
  );
  const configuredLayers = useMemo(
    () => Array.from(new Set(layers.map((entry) => entry.layer))),
    [layers]
  );
  const labelFor = (layer: string) => config.layerLabels?.[layer] ?? LAYER_LABELS[layer] ?? layer;

  // The peel rail: only stops this body actually has, outermost first.
  const stops = useMemo(() => peelStops(layers), [layers]);
  const peeled = isPeeled(layers, visibleLayers);
  const onPeel = (layer: string) => setVisibleLayers((prev) => peelTo(layers, layer, prev));
  const onRestore = () => setVisibleLayers((prev) => restorePeel(layers, prev));

  const systems = useMemo(() => systemLayers(layers).filter((l) => l.url.length > 0), [layers]);
  const systemsOn = allSystemsShown(layers, visibleLayers);

  const hasOpacity = configuredLayers.includes("organ");
  const primaryBanner = config.banners[0];
  // Stated from the graph rather than written as a literal, so the footer cannot drift from what
  // the index actually lists.
  const documentedCount = indexSummary(structures).documented;

  // The guided journey belongs to the BODY: each one walks its own real, mapped stops (the donor
  // follows circulation; the reference body follows the alimentary passage, then out through the
  // kidney). A stop is offered only where its structure actually resolves in this body's scene, so
  // a walk can never point at something the body does not have.
  const journeyStops = config.journey
    ? guideStops(config.journey, (structureId) =>
        inventory.some((item) => item.structureId === structureId)
      )
    : [];
  const canPeelSkin = configuredLayers.includes("skin");
  const skinVisible = visibleLayers.skin ?? true;
  const togglePeel = () => setVisibleLayers((prev) => ({ ...prev, skin: !(prev.skin ?? true) }));

  const guide = useGuidedPeel({
    enabled: journeyStops.length > 0,
    journeyId: config.id,
    stops: journeyStops,
    mount: config.journey?.mount ?? [],
    inventory,
    setVisibleLayers,
    // The journey peels with the rail's own rule, so the rail then shows exactly what the journey
    // did and the same ⟲ Restore undoes it.
    peelToLayer: onPeel,
    setOpacity,
    // Clearing the selection must also clear the search box: leaving a structure name in it
    // while nothing is selected claims a pick that is no longer on screen.
    clearPicked: () => {
      setPickedName(null);
      setSearch("");
    },
    goPreset,
    pickAndFly,
    flyToHeart: () => viewerRef.current?.flyToHeartMesh()
  });

  // Stop titles and captions come from the body's own journey (guide.ts), so the copy that
  // explains a stop cannot drift from the stop itself.

  // A different body is a different set of GLBs and a different person: reset the peel, the
  // selection and the readiness gate so nothing from the previous individual leaks across.
  //
  // Skipped on the first render: this effect also fires on mount, where it would wipe the
  // structure a shared link had just opened.
  const prevSource = useRef<BodySource | null>(null);
  useEffect(() => {
    if (prevSource.current === null || prevSource.current === source) {
      prevSource.current = source;
      return;
    }
    prevSource.current = source;
    setVisibleLayers({});
    setPickedName(null);
    setInventory([]);
    setSearch("");
    setHover(null);
    setOpacity(1);
    setSceneReady(false);
  }, [source]);

  // Keep the address bar in step with the view, so whatever is on screen can be linked to. Only a
  // RESOLVED structure id is written — a raw mesh node name would be per-asset and per-donor, i.e.
  // a link that only works while looking at one body of one person. replaceState rather than
  // pushState: the URL describes the current view, it is not a navigation history to walk back.
  const structureId = structure?.id ?? null;
  useEffect(() => {
    const next = `${window.location.pathname}${buildShareQuery({ source, structure: structureId })}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (next !== current) window.history.replaceState(null, "", next);
  }, [source, structureId]);

  // The pane owns the document title on "/" (App's route table deliberately skips it), so a tab or
  // a shared preview names what is actually open instead of a generic product name.
  useEffect(() => {
    document.title = structure
      ? `${structure.label} — Anatomy Atlas`
      : "Anatomy Atlas — one body, peeled and clickable";
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      structure
        ? `${structure.label}${structure.uberon ? ` (${structure.uberon})` : ""} on the ${config.label.toLowerCase()} — its sourced entry, on a body you can peel layer by layer and click.`
        : `${config.who} — peel the body layer by layer and click any structure for an entry that cites its source.`
    );
  }, [structure, config]);

  // A shared link names a structure that may sit behind layers this body shows by default (the
  // reference body's viscera are behind skin, muscle and skeleton). Merely switching its layer on
  // would leave it hidden, so the link PEELS to that layer instead — the same rule the rail
  // applies, so the rail then shows exactly what happened and the structure is really on screen.
  const linkedStructure = useMemo(
    () => (initialView.structure ? structures.find((s) => s.id === initialView.structure) : undefined),
    [initialView.structure]
  );
  const linkPeeled = useRef(false);
  useEffect(() => {
    if (linkPeeled.current || !linkedStructure?.layer) return;
    linkPeeled.current = true;
    setVisibleLayers((prev) => peelTo(layers, linkedStructure.layer, prev));
  }, [linkedStructure, layers]);

  // Once the scene reports what it actually mounted, swap the linked structure id for the concrete
  // mesh name that resolves to it. That is exactly what a click produces, so the part highlights
  // and the camera flies to it; both names resolve to the same row, so the drawer does not flicker
  // and the URL is unchanged by the swap.
  const followedLink = useRef(false);
  useEffect(() => {
    if (followedLink.current || !linkedStructure || !sceneReady) return;
    const hit = inventory.find((i) => i.structureId === linkedStructure.id);
    if (!hit) return;
    followedLink.current = true;
    setPickedName(hit.name);
    setSearch(hit.label);
    viewerRef.current?.flyToName(hit.name);
  }, [linkedStructure, sceneReady, inventory]);

  return (
    <div className="lab-page">
      <section className="lab">
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
              {hoverStructure ? hoverStructure.label : "Not mapped to a structure"}
            </div>
          )}

          {BODY_SOURCES.length > 1 && (
            <div className="glass glass--source" role="group" aria-label="Body">
              <span className="glass__label">Body</span>
              {BODY_SOURCES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`pill${s.id === config.id ? " pill--active" : ""}`}
                  aria-pressed={s.id === config.id}
                  onClick={() => setSource(s.id)}
                >
                  {s.label}
                </button>
              ))}
              <span className="glass__who">{config.who}</span>
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
                {Array.from(new Set(inventory.map((it) => it.label)))
                  .sort()
                  .map((label) => (
                    <option key={label} value={label} />
                  ))}
              </datalist>
            </div>
          )}

          {!guide.guideOpen && stops.length > 0 && (
            <div className="glass glass--peel" role="group" aria-label="Peel">
              <div className="peel-head">
                <span className="glass__label">Peel</span>
                <span className="peel-who">{config.who}</span>
              </div>
              <div className="peel-rail">
                {stops.map((stop, i) => (
                  <Fragment key={stop.layer}>
                    {i > 0 && (
                      <span className="peel-sep" aria-hidden="true">
                        ›
                      </span>
                    )}
                    <button
                      type="button"
                      className={`pill peel-stop peel-stop--${stop.state}`}
                      aria-pressed={stop.state === "current"}
                      title={peelTitle(stop.state, labelFor(stop.layer))}
                      onClick={() => onPeel(stop.layer)}
                    >
                      {labelFor(stop.layer)}
                    </button>
                  </Fragment>
                ))}
              </div>
              <div className="peel-actions">
                {hasOpacity && (
                  <label
                    className="opacity"
                    title="Peel depth — lower opacity reveals what is under the outer layer"
                  >
                    <span>depth</span>
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
                {peeled && (
                  <button
                    type="button"
                    className="pill"
                    onClick={onRestore}
                    title="Put every layer of this body back the way it opened"
                  >
                    ⟲ Restore
                  </button>
                )}
                {systems.length > 1 && (
                  <button
                    type="button"
                    className={`pill${systemsOn ? " pill--active" : ""}`}
                    aria-pressed={systemsOn}
                    onClick={() =>
                      setVisibleLayers((prev) => setSystemsVisibility(layers, prev, !systemsOn))
                    }
                    title="Show every remaining body system (organs, vessels, nerves, joints, lymphatics)"
                  >
                    {systemsOn ? "⟲ Hide systems" : "▸ All systems"}
                  </button>
                )}
                {sceneReady && canPeelSkin && (
                  <button
                    type="button"
                    className={`pill${!skinVisible ? " pill--active" : ""}`}
                    onClick={togglePeel}
                    title="Peel the outer layer off (press again to restore)"
                  >
                    {skinVisible ? "▸ Peel skin" : "⟲ Restore skin"}
                  </button>
                )}
                {sceneReady && journeyStops.length > 0 && (
                  <button type="button" className="chip chip--quiet" onClick={guide.start}>
                    ▶ Guided peel
                  </button>
                )}
                {(config.missingLayers ?? []).map((layer) => (
                  <span
                    className="chip chip--missing"
                    key={layer}
                    title="Not in this dataset — see Notes & licensing"
                  >
                    {labelFor(layer)} · not in this dataset
                  </span>
                ))}
              </div>
            </div>
          )}

          {guide.guideOpen && journeyStops.length > 0 && (
            <div className="glass glass--guide" role="group" aria-label="Guided peel journey">
              <div className="guide-head">
                <span className="glass__label">Guided peel · {config.label}</span>
                <button type="button" className="chip chip--quiet" onClick={guide.stop}>
                  Exit guide
                </button>
              </div>
              <div className="guide-dots" role="tablist" aria-label="Journey steps">
                {journeyStops.map((s, i) => (
                  <button
                    key={s.key}
                    type="button"
                    role="tab"
                    aria-selected={i === guide.stepIndex}
                    aria-label={`Step ${i + 1}: ${s.title}`}
                    className={`guide-dot${i === guide.stepIndex ? " guide-dot--active" : ""}`}
                    onClick={() => guide.setGuideStep(i)}
                  />
                ))}
              </div>
              <h3 className="guide-title">{journeyStops[guide.stepIndex].title}</h3>
              <p className="guide-caption">{journeyStops[guide.stepIndex].caption}</p>
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
                    onClick={() =>
                      guide.setGuideStep((s) => Math.min(journeyStops.length - 1, s + 1))
                    }
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
              <p>{config.note}</p>
            </div>
          )}

          {pickedName !== null && (
            <StructureDrawer
              pickedName={pickedName}
              structure={structure}
              onClose={() => setPickedName(null)}
            />
          )}
        </div>
      </section>

      {/*
        Disclosure + licensing: a slim fixed strip along the bottom edge of the viewport. It takes
        NO page height — opening it slides a panel UP over the pane instead of pushing the layout
        down. Kept as a native <details> so it needs no JavaScript state, stays keyboard-operable,
        and cannot be lost to a script failure. The one-line disclosure is always visible (truth
        rule 10), and the full sources are one click away.
      */}
      <footer className="lab-notes">
        <details className="lab-notes__details">
          <summary className="lab-notes__bar">
            <span className="lab-notes__line">{primaryBanner}</span>
            <span className="lab-notes__toggle">
              Notes &amp; licensing
              <span className="lab-notes__chev" aria-hidden="true">
                ▾
              </span>
            </span>
          </summary>
          <div className="lab-notes__panel">
            {config.banners.slice(1).map((b, i) => (
              <p key={i}>{b}</p>
            ))}
            <h4>Sources</h4>
            {config.attribution}
            <h4>Colour</h4>
            <p>{COLOR_DISCLOSURE}</p>
            <h4>Deep dives</h4>
            <p>
              <Link to="/structures">All {documentedCount} documented structures →</Link>{" "}
              <Link to="/volume">Heart tissue volume (donor S-20-29) →</Link>{" "}
              <Link to="/slices">Visible Human cross-sections →</Link>
            </p>
            <p className="lab-notes__fine">
              Not for diagnosis. This app renders only the cited datasets above — no anatomy is
              generated or guessed. Full register: <code>docs/sources.md</code>.
            </p>
          </div>
        </details>
      </footer>
    </div>
  );
}
