import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PEEL_ORDER,
  isPeeled,
  peelRail,
  peelRank,
  peelStops,
  peelTo,
  restorePeel
} from "./peel.ts";
import { applyVisibility, filterVisibleLayers } from "./layerVisibility.ts";
import type { LayerAsset } from "./components/VolumeViewer";

// Synthetic fixtures — never shipped. The reference body (Z-Anatomy) has every layer, with the
// heavy systems opt-in; the VH donor body has only skin + heart + vessels.
const layer = (
  layerName: string,
  options: { defaultHidden?: boolean } = {}
): LayerAsset => ({
  structureId: `mock-${layerName}`,
  layer: layerName,
  url: `https://example/${layerName}.glb`,
  visible: true,
  sameFrame: true,
  defaultHidden: options.defaultHidden
});

const REFERENCE: LayerAsset[] = [
  layer("skin"),
  layer("skeleton"),
  layer("muscle"),
  layer("joint", { defaultHidden: true }),
  layer("organ", { defaultHidden: true }),
  layer("lymphatic", { defaultHidden: true }),
  layer("vessel", { defaultHidden: true }),
  layer("nerve", { defaultHidden: true })
];

const DONOR: LayerAsset[] = [layer("skin"), layer("organ"), layer("vessel")];

describe("peelRank (one canonical outer -> inner order)", () => {
  it("orders the shell before the contents", () => {
    assert.ok(peelRank("skin") < peelRank("muscle"));
    assert.ok(peelRank("muscle") < peelRank("skeleton"));
    assert.ok(peelRank("skeleton") < peelRank("organ"));
    assert.ok(peelRank("organ") < peelRank("vessel"));
    assert.ok(peelRank("vessel") < peelRank("nerve"));
  });

  it("ranks an unrecognised layer innermost, never as an outer shell", () => {
    assert.equal(peelRank("some-future-layer"), PEEL_ORDER.length);
    assert.ok(peelRank("some-future-layer") > peelRank("nerve"));
  });
});

describe("peelRail (only stops this body actually has)", () => {
  it("lists the reference body's present layers outermost first", () => {
    assert.deepEqual(peelRail(REFERENCE), [
      "skin",
      "muscle",
      "skeleton",
      "joint",
      "organ",
      "lymphatic",
      "vessel",
      "nerve"
    ]);
  });

  it("lists the donor body's three layers and omits everything it does not publish", () => {
    assert.deepEqual(peelRail(DONOR), ["skin", "organ", "vessel"]);
  });

  it("never offers a layer that has no asset", () => {
    const unconfigured = [layer("skin"), { ...layer("organ"), url: "" }];
    assert.deepEqual(peelRail(unconfigured), ["skin"]);
  });
});

describe("peelTo (hide what is outside, show the stop, leave the inside alone)", () => {
  it("peeling to the organs hides skin, muscle and skeleton", () => {
    const choices = peelTo(REFERENCE, "organ", {});
    const scene = filterVisibleLayers(applyVisibility(REFERENCE, choices));
    assert.deepEqual(
      scene.map((l) => l.layer),
      ["organ"]
    );
  });

  it("mounts an opt-in system when it is the stop (that is how viscera is reached)", () => {
    const choices = peelTo(REFERENCE, "organ", {});
    assert.equal(choices.organ, true);
    // ...and does not switch on anything deeper by itself.
    assert.equal(choices.vessel, undefined);
    assert.equal(choices.nerve, undefined);
  });

  it("leaves inner layers exactly as the user left them", () => {
    const choices = peelTo(REFERENCE, "organ", { nerve: true });
    assert.equal(choices.nerve, true, "a peel must not switch off what the user turned on");
  });

  it("peels back out one stop at a time", () => {
    const atOrgans = peelTo(REFERENCE, "organ", {});
    const backToSkeleton = peelTo(REFERENCE, "skeleton", atOrgans);
    const scene = filterVisibleLayers(applyVisibility(REFERENCE, backToSkeleton));
    assert.deepEqual(
      scene.map((l) => l.layer),
      ["skeleton", "organ"]
    );
  });

  it("is pure — the caller's choice map is never mutated", () => {
    const original = { skin: true };
    peelTo(REFERENCE, "organ", original);
    assert.deepEqual(original, { skin: true });
  });
});

describe("isPeeled / restorePeel", () => {
  it("a freshly opened body is not peeled", () => {
    assert.equal(isPeeled(REFERENCE, {}), false);
    assert.equal(isPeeled(DONOR, {}), false);
  });

  it("is peeled once an outer shell is hidden, and not merely because a system is off", () => {
    assert.equal(isPeeled(REFERENCE, peelTo(REFERENCE, "muscle", {})), true);
    // Every opt-in system off is still an unpeeled body: nothing published was taken away.
    assert.equal(
      isPeeled(REFERENCE, { joint: false, organ: false, lymphatic: false, vessel: false, nerve: false }),
      false
    );
  });

  it("restores the opening state exactly — shells on, opt-in systems off", () => {
    const peeled = peelTo(REFERENCE, "nerve", {});
    const restored = restorePeel(REFERENCE, peeled);
    assert.equal(isPeeled(REFERENCE, restored), false);
    assert.deepEqual(
      filterVisibleLayers(applyVisibility(REFERENCE, restored)).map((l) => l.layer),
      ["skin", "skeleton", "muscle"]
    );
  });

  it("restores the donor body to skin + heart + vessels", () => {
    const peeled = peelTo(DONOR, "organ", {});
    const restored = restorePeel(DONOR, peeled);
    const scene = filterVisibleLayers(applyVisibility(DONOR, restored));
    assert.deepEqual(
      scene.map((l) => l.layer),
      ["skin", "organ", "vessel"]
    );
  });
});

describe("peelStops (what the rail shows)", () => {
  const states = (layers: LayerAsset[], choices: Record<string, boolean>) =>
    peelStops(applyVisibility(layers, choices)).map((stop) => `${stop.layer}:${stop.state}`);

  it("a freshly opened body sits at its outermost stop, with nothing marked peeled", () => {
    assert.deepEqual(states(REFERENCE, {}), [
      "skin:current",
      "muscle:inside",
      "skeleton:inside",
      "joint:inside",
      "organ:inside",
      "lymphatic:inside",
      "vessel:inside",
      "nerve:inside"
    ]);
  });

  it("marks everything outside the peel point as peeled, and the peel point as current", () => {
    assert.deepEqual(states(REFERENCE, peelTo(REFERENCE, "organ", {})), [
      "skin:peeled",
      "muscle:peeled",
      "skeleton:peeled",
      "joint:peeled",
      "organ:current",
      "lymphatic:inside",
      "vessel:inside",
      "nerve:inside"
    ]);
  });

  it("follows a peel back outwards", () => {
    const back = peelTo(REFERENCE, "skeleton", peelTo(REFERENCE, "organ", {}));
    assert.deepEqual(states(REFERENCE, back), [
      "skin:peeled",
      "muscle:peeled",
      "skeleton:current",
      "joint:inside",
      "organ:inside",
      "lymphatic:inside",
      "vessel:inside",
      "nerve:inside"
    ]);
  });

  it("shows only the donor body's three real stops", () => {
    assert.deepEqual(states(DONOR, {}), ["skin:current", "organ:inside", "vessel:inside"]);
    assert.deepEqual(states(DONOR, peelTo(DONOR, "organ", {})), [
      "skin:peeled",
      "organ:current",
      "vessel:inside"
    ]);
  });

  it("never claims a stop is peeled away on a body with nothing visible", () => {
    const allHidden = { skin: false, skeleton: false, muscle: false };
    assert.deepEqual(
      peelStops(applyVisibility(REFERENCE, allHidden)).map((stop) => stop.state),
      ["inside", "inside", "inside", "inside", "inside", "inside", "inside", "inside"]
    );
  });
});
