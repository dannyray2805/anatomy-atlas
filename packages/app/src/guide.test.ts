import { test } from "node:test";
import assert from "node:assert/strict";
import { guideExitReset, guideStepOrder } from "./guide.ts";

test("guide step order — male (RV + LV + aorta mapped) -> 5 steps, circulation order RV -> LV -> aorta", () => {
  const keys = guideStepOrder({ rightVentricle: true, leftVentricle: true, ascendingAorta: true });
  assert.deepEqual(keys, [
    "whole-body",
    "peel-skin",
    "right-ventricle",
    "left-ventricle",
    "ascending-aorta"
  ]);
  assert.equal(keys.length, 5);
  assert.equal(keys[keys.length - 1], "ascending-aorta");
  assert.deepEqual(keys.slice(2), ["right-ventricle", "left-ventricle", "ascending-aorta"]);
});

test("guide step order — female (RV + aorta mapped, LV not) -> 4 steps ending on aorta, no left-ventricle, NOT the fallback", () => {
  const keys = guideStepOrder({ rightVentricle: true, leftVentricle: false, ascendingAorta: true });
  assert.deepEqual(keys, ["whole-body", "peel-skin", "right-ventricle", "ascending-aorta"]);
  assert.equal(keys.length, 4);
  assert.equal(keys[keys.length - 1], "ascending-aorta");
  assert.ok(!keys.includes("left-ventricle"), "female has no left-ventricle stop (LV is male-only mapped)");
  assert.ok(!keys.includes("inside-heart"), "female must not show the unmapped fallback when real stops exist");
});

test("guide step order — pre-aorta male (RV + LV only) ends on left ventricle", () => {
  const keys = guideStepOrder({ rightVentricle: true, leftVentricle: true, ascendingAorta: false });
  assert.deepEqual(keys, ["whole-body", "peel-skin", "right-ventricle", "left-ventricle"]);
});

test("guide step order — right-ventricle-only body stops on RV (dual-sex content, no LV/aorta)", () => {
  const keys = guideStepOrder({ rightVentricle: true, leftVentricle: false, ascendingAorta: false });
  assert.deepEqual(keys, ["whole-body", "peel-skin", "right-ventricle"]);
});

test("guide step order — nothing mapped falls back to the honest inside-heart stop", () => {
  const keys = guideStepOrder({ rightVentricle: false, leftVentricle: false, ascendingAorta: false });
  assert.deepEqual(keys, ["whole-body", "peel-skin", "inside-heart"]);
});

test("guide exit reset restores default state as a fresh object per call", () => {
  const a = guideExitReset();
  const b = guideExitReset();
  assert.deepEqual(a, { visibleLayers: {}, opacity: 1, pickedName: null });
  assert.notEqual(a, b, "each exit reset must be a fresh object (state replacement, never a shared ref)");
});
