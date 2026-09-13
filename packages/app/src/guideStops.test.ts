import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DONOR_JOURNEY, REFERENCE_JOURNEY, mountLayers, type GuideStop } from "./guide.ts";

const stopOf = (key: string) =>
  [...DONOR_JOURNEY.stops, ...REFERENCE_JOURNEY.stops].find((s) => s.key === key) as GuideStop;

describe("what entering a stop does to the lab state", () => {
  it("whole-body restores every layer, full opacity, no pick, front preset", () => {
    const stop = stopOf("whole-body");
    assert.deepEqual(stop.visibleLayers, {});
    assert.equal(stop.opacity, undefined, "opacity defaults to 1 — the rail reveals, not the slider");
    assert.equal(stop.clearPicked, true);
    assert.equal(stop.preset, "front");
  });

  it("peel-skin hides the skin but must NOT touch the vessel layer", () => {
    const stop = stopOf("peel-skin");
    assert.equal(stop.visibleLayers?.skin, false);
    // Hiding the vessel layer here unmounts its meshes, which empties the scene-derived inventory
    // and drops the journey's later aorta stop. Regression guard for a real bug.
    assert.equal("vessel" in (stop.visibleLayers ?? {}), false);
  });

  it("ventricle stops fly to their mapped mesh and never clear the selection", () => {
    const rv = stopOf("right-ventricle");
    assert.equal(rv.structureId, "heart-right-ventricle");
    assert.equal(rv.clearPicked, undefined);
    assert.equal(rv.visibleLayers?.skin, false);

    const lv = stopOf("left-ventricle");
    assert.equal(lv.structureId, "heart-left-ventricle");
    assert.equal(lv.visibleLayers?.skin, false);
  });

  it("the aorta stop enables the vessel layer and keeps the heart visible, with the heart as its fallback", () => {
    const stop = stopOf("ascending-aorta");
    assert.equal(stop.structureId, "aorta-ascending");
    assert.equal(stop.visibleLayers?.vessel, true);
    // The aorta mesh is on the vessel layer, which is INSIDE the heart's layer in the peel order:
    // peeling to it would hide the heart this stop is describing.
    assert.equal(stop.peelToLayer, undefined);
    assert.equal("organ" in (stop.visibleLayers ?? {}), false, "the heart layer must stay on");
    assert.equal(stop.flyToHeart, true);
  });

  it("inside-heart is the defensive fallback: heart mesh, vessels hidden, no structure claimed", () => {
    const stop = stopOf("inside-heart");
    assert.equal(stop.flyToHeart, true);
    assert.equal(stop.structureId, undefined);
    assert.equal(stop.visibleLayers?.vessel, false);
  });

  it("stops after the peel-in touch NO layers, so the peel the journey established survives", () => {
    // If these reset visibility to the defaults they would unmount the viscera and drop the
    // journey's own later stops — and they would also silently switch off anything the user had on.
    for (const key of ["stomach", "liver", "jejunum", "kidney"]) {
      const stop = stopOf(key);
      assert.equal(stop.visibleLayers, undefined, `${key} must not set layer visibility`);
      assert.equal(stop.peelToLayer, undefined, `${key} must not re-peel`);
    }
  });

  it("the reference journey peels into the viscera exactly once, at its first structure stop", () => {
    const peeling = REFERENCE_JOURNEY.stops.filter((s) => s.peelToLayer != null);
    assert.deepEqual(peeling.map((s) => s.key), ["oesophagus"]);
    assert.equal(peeling[0].peelToLayer, "organ");
  });
});

describe("mounting the layers a journey depends on", () => {
  it("forces the journey's layers on and leaves every other recorded choice alone", () => {
    const prev = { skin: false, "nervous-system": false };
    const next = mountLayers(prev, ["organ"]);
    assert.deepEqual(next, { skin: false, "nervous-system": false, organ: true });
    assert.notEqual(next, prev, "returns a new record — state must be replaced, never mutated");
  });

  it("overrides a journey layer the user had switched off", () => {
    assert.deepEqual(mountLayers({ organ: false }, ["organ"]), { organ: true });
  });

  it("is a no-op for a journey that needs nothing mounted (returns the same object)", () => {
    const prev = { skin: false };
    assert.equal(mountLayers(prev, []), prev);
  });
});
