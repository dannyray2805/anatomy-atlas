import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  COLOR_DISCLOSURE,
  LAYER_COLORS,
  STRUCTURE_COLORS,
  anatomyColor,
  colorableLayers,
  layerColorHex,
  structureColorHex
} from "./anatomyColors.ts";

// Every layer key layers.ts can emit. If a new layer is added there, this test must be updated —
// which is the point: a layer with no colour would silently render in the asset's own colour.
const LAYERS = [
  "skin",
  "fascia",
  "muscle",
  "skeleton",
  "joint",
  "organ",
  "vessel",
  "nerve",
  "lymphatic",
  "tissue"
];

describe("anatomyColors (illustrative colouring)", () => {
  it("has a colour for every layer the app can render", () => {
    for (const layer of LAYERS) {
      assert.notEqual(layerColorHex(layer), undefined, `no colour for layer: ${layer}`);
    }
    assert.deepEqual(colorableLayers().sort(), [...LAYERS].sort());
  });

  it("uses valid 24-bit colours everywhere", () => {
    for (const [key, hex] of Object.entries({ ...LAYER_COLORS, ...STRUCTURE_COLORS })) {
      assert.equal(Number.isInteger(hex), true, `${key} is not an integer`);
      assert.ok(hex >= 0 && hex <= 0xffffff, `${key} out of range: ${hex}`);
    }
  });

  it("keeps the big tissues visually distinct, so layers do not blur together", () => {
    const hues = ["skin", "muscle", "skeleton", "organ", "vessel", "nerve", "lymphatic"].map(
      (l) => LAYER_COLORS[l]
    );
    assert.equal(new Set(hues).size, hues.length);
  });

  it("colours skin like skin, not like the source asset's flat blue", () => {
    const skin = LAYER_COLORS.skin;
    const r = (skin >> 16) & 0xff;
    const b = skin & 0xff;
    assert.ok(r > b, "skin tone must be warm (more red than blue)");
  });

  it("prefers a mapped structure's own tone over its layer tone", () => {
    assert.equal(anatomyColor("organ", "liver"), STRUCTURE_COLORS.liver);
    assert.equal(anatomyColor("vessel", "aorta-ascending"), STRUCTURE_COLORS["aorta-ascending"]);
    assert.notEqual(STRUCTURE_COLORS.liver, STRUCTURE_COLORS.kidney);
    assert.notEqual(STRUCTURE_COLORS.spleen, STRUCTURE_COLORS.kidney);
  });

  it("falls back to the layer tone for an unmapped mesh, and to nothing when unknown", () => {
    assert.equal(anatomyColor("muscle", undefined), LAYER_COLORS.muscle);
    assert.equal(anatomyColor("muscle", "not-a-structure"), LAYER_COLORS.muscle);
    // Unknown layer + unknown structure -> undefined, meaning "leave the asset's colour alone"
    // rather than inventing one.
    assert.equal(anatomyColor("some-future-layer", undefined), undefined);
    assert.equal(structureColorHex(undefined), undefined);
    assert.equal(layerColorHex("some-future-layer"), undefined);
  });

  it("states plainly that the colours are not measured data", () => {
    assert.match(COLOR_DISCLOSURE, /illustrative/i);
    assert.match(COLOR_DISCLOSURE, /NOT measured/i);
  });
});
