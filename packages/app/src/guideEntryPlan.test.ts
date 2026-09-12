import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { guideEntryPlan, type GuideStepKey } from "./guide.ts";

describe("guide entry plans", () => {
  it("whole-body restores every layer, full opacity, no pick, front preset", () => {
    const plan = guideEntryPlan("whole-body", {});
    assert.deepEqual(plan.visibleLayers, {});
    assert.equal(plan.opacity, 1);
    assert.equal(plan.clearPicked, true);
    assert.equal(plan.preset, "front");
  });

  it("peel-skin hides the skin but must NOT touch the vessel layer", () => {
    const plan = guideEntryPlan("peel-skin", { ascendingAortaId: "aorta-ascending" });
    assert.equal(plan.visibleLayers?.skin, false);
    // Hiding the vessel layer here unmounts its meshes, which empties the scene-derived
    // inventory and drops the journey's later aorta stop. Regression guard for a real bug.
    assert.equal("vessel" in (plan.visibleLayers ?? {}), false);
  });

  it("ventricle stops fly to the mapped mesh and never clear the selection", () => {
    const rv = guideEntryPlan("right-ventricle", { rightVentricleId: "heart-right-ventricle" });
    assert.equal(rv.flyToStructureId, "heart-right-ventricle");
    assert.ok(!rv.flyToHeart);
    assert.ok(!rv.clearPicked);

    const lv = guideEntryPlan("left-ventricle", { leftVentricleId: "heart-left-ventricle" });
    assert.equal(lv.flyToStructureId, "heart-left-ventricle");
    assert.equal(lv.visibleLayers?.skin, false);
  });

  it("does not fly anywhere when the stop's structure is absent from the body", () => {
    const plan = guideEntryPlan("left-ventricle", {});
    assert.equal(plan.flyToStructureId, undefined);
    assert.ok(!plan.flyToHeart);
  });

  it("the aorta stop enables the vessel layer, and falls back to the heart mesh when unmapped", () => {
    const mapped = guideEntryPlan("ascending-aorta", { ascendingAortaId: "aorta-ascending" });
    assert.equal(mapped.visibleLayers?.vessel, true);
    assert.equal(mapped.flyToStructureId, "aorta-ascending");
    assert.ok(!mapped.flyToHeart);

    // Female bodies without the vessel layer mounted: honest heart fly instead of no camera move.
    const unmapped = guideEntryPlan("ascending-aorta", {});
    assert.equal(unmapped.flyToHeart, true);
    assert.equal(unmapped.flyToStructureId, undefined);
    assert.equal(unmapped.visibleLayers?.vessel, true);
  });

  it("inside-heart is the defensive fallback: heart mesh, vessels hidden", () => {
    const plan = guideEntryPlan("inside-heart", {});
    assert.equal(plan.flyToHeart, true);
    assert.equal(plan.visibleLayers?.vessel, false);
  });

  it("every step key produces a plan that changes something", () => {
    const keys: GuideStepKey[] = [
      "whole-body",
      "peel-skin",
      "right-ventricle",
      "left-ventricle",
      "ascending-aorta",
      "inside-heart"
    ];
    for (const key of keys) {
      const plan = guideEntryPlan(key, {});
      assert.notEqual(plan.visibleLayers, undefined, `${key} must set layer visibility`);
      assert.equal(plan.opacity, 1, `${key} must normalise opacity`);
    }
  });
});
