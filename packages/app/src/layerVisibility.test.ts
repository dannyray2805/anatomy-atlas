import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  allSystemsShown,
  applyVisibility,
  filterVisibleLayers,
  hasConfiguredUrl,
  isLayerVisible,
  setSystemsVisibility
} from "./layerVisibility.ts";
import type { LayerAsset } from "./components/VolumeViewer";

// Mock layer config with 2+ layers — synthetic test data, never shipped. Only the shape
// matters: toggling a LayerAsset.visible must drop it from the rendered scene and from the
// framing calculation, exactly as VolumeViewer consumes filterVisibleLayers.
const heart: LayerAsset = {
  structureId: "heart",
  layer: "organ",
  url: "https://example/heart.glb",
  visible: true
};
const skeleton: LayerAsset = {
  structureId: "mock-skeleton",
  layer: "skeleton",
  url: "https://example/skeleton.glb",
  visible: true
};

describe("filterVisibleLayers (visibility -> rendering + framing)", () => {
  it("mounts every visible configured layer", () => {
    const onScreen = filterVisibleLayers([heart, skeleton]);
    assert.deepEqual(onScreen.map((l) => l.structureId), ["heart", "mock-skeleton"]);
  });

  it("toggling one layer visible:false removes it from the scene/framing set", () => {
    const onScreen = filterVisibleLayers([heart, { ...skeleton, visible: false }]);
    // Hidden layer contributes nothing to the rendered group or the bounding sphere.
    assert.deepEqual(onScreen.map((l) => l.structureId), ["heart"]);
    assert.ok(!onScreen.some((l) => l.structureId === "mock-skeleton"));
  });

  it("keeps the remaining layer rendered and pickable", () => {
    const onScreen = filterVisibleLayers([heart, { ...skeleton, visible: false }]);
    assert.equal(onScreen.length, 1);
    // The survivor still mounts, so its meshes keep the existing name-based click path.
    assert.equal(onScreen[0].structureId, "heart");
    assert.equal(onScreen[0].url, "https://example/heart.glb");
  });

  it("drops a visible:true layer whose url is unset (not configured)", () => {
    const unset: LayerAsset = { ...heart, url: "" };
    assert.deepEqual(filterVisibleLayers([unset]), []);
    assert.equal(hasConfiguredUrl([unset]), false);
  });

  it("hiding the only visible layer yields an empty visible set (empty state, not a crash)", () => {
    const hiddenOnly: LayerAsset[] = [{ ...heart, visible: false }];
    assert.deepEqual(filterVisibleLayers(hiddenOnly), []);
    // Configured but hidden -> the "all hidden" empty panel, not the "not configured" one.
    assert.equal(hasConfiguredUrl(hiddenOnly), true);
  });
});

// The whole-body systems are ~10 MB / ~1,940 meshes together, so they load on demand: hidden
// until switched on. This is the rule that keeps the first paint light.
const nervous: LayerAsset = {
  structureId: "nervous-system",
  layer: "nerve",
  url: "https://example/nervous.glb",
  visible: false,
  defaultHidden: true
};
const joints: LayerAsset = {
  structureId: "joints",
  layer: "joint",
  url: "https://example/joints.glb",
  visible: false,
  defaultHidden: true
};
const unconfiguredSystem: LayerAsset = { ...joints, url: "" };

describe("layerVisibility — on-demand system layers", () => {
  it("defaults an un-chosen system to hidden and a normal layer to visible", () => {
    assert.equal(isLayerVisible(nervous, {}), false);
    assert.equal(isLayerVisible(heart, {}), true);
  });

  it("an explicit choice beats the default in both directions", () => {
    assert.equal(isLayerVisible(nervous, { nerve: true }), true);
    assert.equal(isLayerVisible(heart, { organ: false }), false);
  });

  it("applyVisibility mounts no system until asked for, then mounts it", () => {
    const all = [heart, nervous, joints];
    assert.deepEqual(
      applyVisibility(all, {}).map((l) => l.visible),
      [true, false, false]
    );
    const requested = applyVisibility(all, { nerve: true });
    assert.deepEqual(
      filterVisibleLayers(requested).map((l) => l.structureId),
      ["heart", "nervous-system"]
    );
  });

  it("allSystemsShown ignores unconfigured systems", () => {
    assert.equal(allSystemsShown([unconfiguredSystem], {}), false);
    assert.equal(allSystemsShown([nervous, unconfiguredSystem], { nerve: true }), true);
  });

  it("setSystemsVisibility switches every configured system and nothing else", () => {
    const all = [heart, nervous, joints, unconfiguredSystem];
    const on = setSystemsVisibility(all, {}, true);
    assert.deepEqual(on, { nerve: true, joint: true });
    assert.equal(isLayerVisible(heart, on), true, "skin/skeleton/muscle untouched");
    const off = setSystemsVisibility(all, on, false);
    assert.deepEqual(off, { nerve: false, joint: false });
  });
});
