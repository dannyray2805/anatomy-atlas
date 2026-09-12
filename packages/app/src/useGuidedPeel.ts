import { useEffect, useState } from "react";
import { guideEntryPlan, guideExitReset, type GuideStepKey } from "./guide";
import type { CameraPreset, InventoryItem } from "./components/VolumeViewer";
import type { Sex } from "./sex";

export type GuidedPeelPorts = {
  /** True only where a real outer→inner peel exists (the per-sex VH body: skin + organs). */
  isBodyPeel: boolean;
  /** Changing body leaves the journey — its layers and captions are per-sex. */
  sex: Sex;
  /** Stop order for this body, from guide.ts (pure + tested, never padded per sex). */
  steps: GuideStepKey[];
  rightVentricle?: InventoryItem;
  leftVentricle?: InventoryItem;
  ascendingAorta?: InventoryItem;
  setVisibleLayers: (next: Record<string, boolean>) => void;
  setOpacity: (value: number) => void;
  clearPicked: () => void;
  goPreset: (preset: CameraPreset) => void;
  pickAndFly: (item: InventoryItem) => void;
  flyToHeart: () => void;
};

/**
 * The P3 guided-peel state machine (spotlight mode), extracted from App.tsx so the page component
 * is presentation. It owns only the step index and *applies* each stop's plan to the caller's lab
 * state — the stop order and each stop's effects are pure functions in guide.ts, so they are
 * testable without rendering React.
 */
export function useGuidedPeel(ports: GuidedPeelPorts) {
  const {
    isBodyPeel,
    sex,
    steps,
    rightVentricle,
    leftVentricle,
    ascendingAorta,
    setVisibleLayers,
    setOpacity,
    clearPicked,
    goPreset,
    pickAndFly,
    flyToHeart
  } = ports;

  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);

  // Primitive deps: the caller rebuilds `steps`/items every render, so depend on their CONTENT.
  const stepKey = steps.join(",");
  const rvId = rightVentricle?.structureId ?? "";
  const lvId = leftVentricle?.structureId ?? "";
  const aortaId = ascendingAorta?.structureId ?? "";

  useEffect(() => {
    if (!guideOpen || !isBodyPeel) return;
    const key = steps[Math.min(guideStep, steps.length - 1)];
    if (!key) return;

    const plan = guideEntryPlan(key, {
      rightVentricleId: rvId || undefined,
      leftVentricleId: lvId || undefined,
      ascendingAortaId: aortaId || undefined
    });

    if (plan.visibleLayers) setVisibleLayers(plan.visibleLayers);
    if (plan.opacity != null) setOpacity(plan.opacity);
    if (plan.clearPicked) clearPicked();
    if (plan.preset) goPreset(plan.preset);

    // Fly to the mapped structure's mesh; the aorta stop falls back to the heart mesh when the
    // vessel is not in this body's scene.
    const target = plan.flyToStructureId
      ? [rightVentricle, leftVentricle, ascendingAorta].find(
          (item) => item?.structureId === plan.flyToStructureId
        )
      : undefined;
    if (target) pickAndFly(target);
    else if (plan.flyToHeart) flyToHeart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideOpen, guideStep, sex, isBodyPeel, stepKey, rvId, lvId, aortaId]);

  // A different body means different layers and captions: leave spotlight mode.
  useEffect(() => {
    setGuideOpen(false);
    setGuideStep(0);
  }, [sex]);

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

  const stepIndex = Math.min(guideStep, Math.max(steps.length - 1, 0));

  return {
    guideOpen,
    guideStep,
    setGuideStep,
    /** Clamped index safe to read for captions/dots when the step list shrinks. */
    stepIndex,
    atLast: stepIndex >= steps.length - 1,
    start,
    stop
  };
}
