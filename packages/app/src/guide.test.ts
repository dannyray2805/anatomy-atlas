import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DONOR_JOURNEY,
  REFERENCE_JOURNEY,
  guideExitReset,
  guideStops,
  type GuideJourney
} from "./guide.ts";

const always = () => true;
const never = () => false;
const only = (...ids: string[]) => (id: string) => ids.includes(id);

test("donor journey — male (RV + LV + aorta mapped) keeps all 5 steps in circulation order", () => {
  const keys = guideStops(DONOR_JOURNEY, always).map((s) => s.key);
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

test("donor journey — female (RV + aorta mapped, LV not) drops ONLY the LV stop, ending on the aorta, never the fallback", () => {
  const keys = guideStops(
    DONOR_JOURNEY,
    only("heart-right-ventricle", "aorta-ascending")
  ).map((s) => s.key);
  assert.deepEqual(keys, ["whole-body", "peel-skin", "right-ventricle", "ascending-aorta"]);
  assert.equal(keys.length, 4);
  assert.equal(keys[keys.length - 1], "ascending-aorta");
  assert.ok(
    !keys.includes("left-ventricle"),
    "female has no left-ventricle stop (LV is male-only mapped)"
  );
  assert.ok(
    !keys.includes("inside-heart"),
    "female must not show the unmapped fallback when real stops exist"
  );
});

test("donor journey — no body offers a step count its own mappings do not justify", () => {
  // RV only: the journey ends at the right ventricle rather than inventing the aorta.
  assert.deepEqual(
    guideStops(DONOR_JOURNEY, only("heart-right-ventricle")).map((s) => s.key),
    ["whole-body", "peel-skin", "right-ventricle"]
  );
  // RV + LV, no aorta (the pre-aorta rollout state).
  assert.deepEqual(
    guideStops(DONOR_JOURNEY, only("heart-right-ventricle", "heart-left-ventricle")).map(
      (s) => s.key
    ),
    ["whole-body", "peel-skin", "right-ventricle", "left-ventricle"]
  );
});

test("donor journey — nothing mapped falls back to the honest inside-heart stop", () => {
  const keys = guideStops(DONOR_JOURNEY, never).map((s) => s.key);
  assert.deepEqual(keys, ["whole-body", "peel-skin", "inside-heart"]);
  const fallback = guideStops(DONOR_JOURNEY, never).find((s) => s.key === "inside-heart");
  assert.ok(fallback?.flyToHeart, "the fallback flies to the heart mesh rather than nowhere");
  assert.equal(
    fallback?.structureId,
    undefined,
    "the fallback must not claim a structure mapping the body does not have"
  );
});

test("reference journey — the alimentary passage then out through the kidney, all mapped", () => {
  const keys = guideStops(REFERENCE_JOURNEY, always).map((s) => s.key);
  assert.deepEqual(keys, [
    "whole-body",
    "peel-skin",
    "oesophagus",
    "stomach",
    "liver",
    "jejunum",
    "kidney"
  ]);
});

test("reference journey — a missing passage stop is dropped, and the rest still walk in order", () => {
  // e.g. if the viscera never mounted: the two opening states must survive, and the fallback
  // (which the reference journey has none of) must not be invented.
  assert.deepEqual(guideStops(REFERENCE_JOURNEY, never).map((s) => s.key), [
    "whole-body",
    "peel-skin"
  ]);
  assert.deepEqual(
    guideStops(REFERENCE_JOURNEY, only("liver", "kidney")).map((s) => s.key),
    ["whole-body", "peel-skin", "liver", "kidney"]
  );
});

test("every stop of every journey carries the copy that explains it", () => {
  for (const journey of [DONOR_JOURNEY, REFERENCE_JOURNEY]) {
    for (const stop of journey.stops) {
      assert.ok(stop.title.trim().length > 0, `${stop.key} has no title`);
      assert.ok(stop.caption.trim().length > 0, `${stop.key} has no caption`);
    }
  }
});

test("every structure stop names a structure, and every always-stop names none", () => {
  for (const journey of [DONOR_JOURNEY, REFERENCE_JOURNEY]) {
    for (const stop of journey.stops) {
      if (stop.always) {
        assert.equal(stop.structureId, undefined, `${stop.key} is a state, not a structure`);
      } else if (!stop.fallback) {
        assert.ok(stop.structureId, `${stop.key} must name the structure it focuses`);
      }
    }
  }
});

test("no journey can unmount the layers its own stops depend on", () => {
  // The reference body's viscera is lazy-mounted and HIDDEN by default, and a stop list is derived
  // from what is in the scene — so the journey must hold that layer up for its whole length or its
  // own later stops would vanish mid-walk. (The donor's organs/vessels are shown by default.)
  assert.deepEqual(REFERENCE_JOURNEY.mount, ["organ"]);
  const firstStructureStop = REFERENCE_JOURNEY.stops.find((s) => s.structureId != null);
  assert.equal(
    firstStructureStop?.peelToLayer,
    "organ",
    "the first structure stop peels into the viscera; the rest inherit that peel"
  );
  assert.deepEqual(DONOR_JOURNEY.mount, []);
});

test("a journey with no structure stops never gets a fallback appended", () => {
  const statesOnly: GuideJourney = {
    mount: [],
    stops: [
      { key: "whole-body", title: "Whole body", caption: "x", always: true },
      { key: "peel-skin", title: "Peel the skin", caption: "x", always: true }
    ]
  };
  assert.deepEqual(guideStops(statesOnly, always).map((s) => s.key), ["whole-body", "peel-skin"]);
});

test("guide exit reset restores default state as a fresh object per call", () => {
  const a = guideExitReset();
  const b = guideExitReset();
  assert.deepEqual(a, { visibleLayers: {}, opacity: 1, pickedName: null });
  assert.notEqual(a, b, "each exit reset must be a fresh object (state replacement, never a shared ref)");
});
