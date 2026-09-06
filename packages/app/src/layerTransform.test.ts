import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_TRANSFORM,
  effectiveTransform,
  groupTransformProps,
  identityTransform,
  isSameFrame,
  parseOverrides,
  serializeOverrides,
  type LayerTransform
} from "./layerTransform.ts";

const noTransform = {
  structureId: "heart",
  layer: "organ",
  url: "https://example/heart.glb",
  visible: true
};

const withTransform = {
  structureId: "skeleton",
  layer: "skeleton",
  url: "https://example/skeleton.glb",
  visible: true,
  transform: { position: [1, 2, 3] as [number, number, number], rotationY: 90, scale: 2 }
};

describe("layerTransform (Task O)", () => {
  it("falls back to identity when a layer has no transform (no regression)", () => {
    const t = effectiveTransform(noTransform, undefined);
    assert.deepEqual(t, { position: [0, 0, 0], rotationY: 0, scale: 1 });
    const g = groupTransformProps(t);
    assert.deepEqual(g.position, [0, 0, 0]);
    assert.deepEqual(g.rotation, [0, 0, 0]);
    assert.equal(g.scale, 1);
  });

  it("applies an explicit layer.transform to the group props (rotation degrees -> radians)", () => {
    const t = effectiveTransform(withTransform, undefined);
    assert.deepEqual(t.position, [1, 2, 3]);
    const g = groupTransformProps(t);
    assert.deepEqual(g.position, [1, 2, 3]);
    assert.equal(g.rotation[0], 0);
    assert.equal(g.rotation[2], 0);
    assert.ok(Math.abs(g.rotation[1] - Math.PI / 2) < 1e-9); // 90 deg
    assert.equal(g.scale, 2);
  });

  it("an AlignPanel override wins over the layer's own transform", () => {
    const override: LayerTransform = { position: [-1, -2, -3], rotationY: 180, scale: 0.5 };
    const t = effectiveTransform(withTransform, override);
    assert.deepEqual(t.position, [-1, -2, -3]);
    assert.equal(t.rotationY, 180);
    assert.equal(t.scale, 0.5);
    const g = groupTransformProps(t);
    assert.ok(Math.abs(g.rotation[1] - Math.PI) < 1e-9);
  });

  it("identity results are fresh objects, never the shared default", () => {
    const a = effectiveTransform(undefined, undefined);
    const b = identityTransform();
    assert.deepEqual(a, DEFAULT_TRANSFORM);
    assert.notEqual(a, DEFAULT_TRANSFORM);
    assert.notEqual(b, DEFAULT_TRANSFORM);
  });
});

describe("override persistence + same-frame (Task P)", () => {
  it("serialize/parse round-trips an override map", () => {
    const src: Record<string, LayerTransform> = {
      heart: { position: [-0.01, 0.8, -0.02], rotationY: 0, scale: 1 }
    };
    assert.deepEqual(parseOverrides(serializeOverrides(src)), src);
  });

  it("parseOverrides returns {} on null / invalid JSON / malformed entries", () => {
    assert.deepEqual(parseOverrides(null), {});
    assert.deepEqual(parseOverrides("not json"), {});
    assert.deepEqual(parseOverrides(JSON.stringify([1, 2, 3])), {});
    assert.deepEqual(
      parseOverrides(JSON.stringify({ heart: { position: [1, 2, 3], rotationY: "x", scale: 1 } })),
      {}
    );
  });

  it("isSameFrame defaults false and is true only when flagged", () => {
    assert.equal(isSameFrame(undefined), false);
    assert.equal(isSameFrame({}), false);
    assert.equal(isSameFrame({ sameFrame: false }), false);
    assert.equal(isSameFrame({ sameFrame: true }), true);
  });
});
