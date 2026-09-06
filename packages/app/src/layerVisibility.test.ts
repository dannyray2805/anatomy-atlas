import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterVisibleLayers, hasConfiguredUrl } from "./layerVisibility.ts";
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
