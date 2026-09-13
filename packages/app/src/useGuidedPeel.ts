import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { guideExitReset, mountLayers, type GuideStop } from "./guide";
import type { CameraPreset, InventoryItem } from "./components/VolumeViewer";

export type GuidedPeelPorts = {
  /** False when this body offers no journey at all (no stops to walk). */
  enabled: boolean;
  /** Changing body leaves the journey — the stops, layers and copy belong to that body. */
  journeyId: string;
  /** Stops for this body, already filtered to what resolves here, in order. */
  stops: GuideStop[];
  /** Layers the journey holds mounted for its whole length (see GuideJourney.mount). */
  mount: string[];
  /** What the scene actually mounted — how a stop's structure is found to fly to. */
  inventory: InventoryItem[];
  setVisibleLayers: Dispatch<SetStateAction<Record<string, boolean>>>;
  /** Peel to a layer using the rail's own rule (peel.ts), so the rail shows what happened. */
  peelToLayer: (layer: string) => void;
  setOpacity: (value: number) => void;
  clearPicked: () => void;
  goPreset: (preset: CameraPreset) => void;
  pickAndFly: (item: InventoryItem) => void;
  flyToHeart: () => void;
};

/**
 * The guided-peel state machine (spotlight mode), extracted from BodyPage so the page component is
 * presentation. It owns only the step index and *applies* each stop to the caller's lab state — the
 * stop order, its layer effects and its copy are pure data in guide.ts, so they are testable
 * without rendering React.
 *
 * Two ordering rules matter and are easy to get wrong:
 *  - a stop's own layer state is applied BEFORE the journey's `mount` layers, because a stop may
 *    reset visibility to the defaults (which unmounts a lazily-mounted system) and the journey's
 *    layers must survive that. Otherwise the journey's own later stops would vanish mid-walk.
 *  - a stop with no layer fields touches NO layers: "omitted layers keep the user's current
 *    choice" is what makes the reference journey's steps 4-7 keep the peel its step 3 established.
 */
export function useGuidedPeel(ports: GuidedPeelPorts) {
  const {
    enabled,
    journeyId,
    stops,
    mount,
    inventory,
    setVisibleLayers,
    peelToLayer,
    setOpacity,
    clearPicked,
    goPreset,
    pickAndFly,
    flyToHeart
  } = ports;

  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);

  // Primitive deps: the caller rebuilds `stops` and `inventory` every render, so depend on their
  // CONTENT. The target's resolved mesh name is what tells us a stop's structure has arrived,
  // which is exactly when the camera should fly to it.
  const stopKeys = stops.map((entry) => entry.key).join(",");
  const mountKey = mount.join(",");
  const stepIndexRaw = Math.min(guideStep, Math.max(stops.length - 1, 0));
  const activeStop = stops[stepIndexRaw];
  const targetId = activeStop?.structureId ?? "";
  const targetName = targetId
    ? (inventory.find((item) => item.structureId === targetId)?.name ?? "")
    : "";

  // Read the inventory through a ref so the effect can act on the item without the whole inventory
  // becoming a dependency (it is rebuilt on every scene change).
  const inventoryRef = useRef(inventory);
  inventoryRef.current = inventory;

  useEffect(() => {
    if (!guideOpen || !enabled || !activeStop) return;

    if (activeStop.peelToLayer) peelToLayer(activeStop.peelToLayer);
    else if (activeStop.visibleLayers) setVisibleLayers(activeStop.visibleLayers);
    // AFTER the stop's own layers: a stop may reset visibility to the defaults, which unmounts a
    // lazily-mounted system the journey itself is about to walk into.
    if (mount.length > 0) setVisibleLayers((prev) => mountLayers(prev, mount));
    setOpacity(activeStop.opacity ?? 1);
    if (activeStop.clearPicked) clearPicked();
    if (activeStop.preset) goPreset(activeStop.preset);

    const target = activeStop.structureId
      ? inventoryRef.current.find((item) => item.structureId === activeStop.structureId)
      : undefined;
    if (target) pickAndFly(target);
    else if (activeStop.flyToHeart) flyToHeart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideOpen, guideStep, enabled, stopKeys, mountKey, targetId, targetName]);

  // A different body means different layers, stops and copy: leave spotlight mode.
  useEffect(() => {
    setGuideOpen(false);
    setGuideStep(0);
  }, [journeyId]);

  const start = () => {
    setGuideStep(0);
    setGuideOpen(true);
  };

  /** Exit the journey AND restore the pre-journey state (all layers on, full opacity, no pick). */
  const stop = () => {
    setGuideOpen(false);
    setGuideStep(0);
    const reset = guideExitReset();
    setVisibleLayers(reset.visibleLayers);
    setOpacity(reset.opacity);
    clearPicked();
  };

  return {
    guideOpen,
    guideStep,
    setGuideStep,
    /** Clamped index safe to read for titles/dots when the step list shrinks. */
    stepIndex: stepIndexRaw,
    atLast: stepIndexRaw >= stops.length - 1,
    start,
    stop
  };
}
