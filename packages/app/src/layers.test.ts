import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildVhBodyFromUrls, buildReferenceFromUrls, donorExtrasFromBase } from "./layers.ts";
import { filterVisibleLayers, applyVisibility } from "./layerVisibility.ts";
import type { LayerAsset } from "./components/VolumeViewer";

const HEART = {
  male: "https://example/heart-male.glb",
  female: "https://example/heart-female.glb"
};
const SKIN = {
  male: "https://example/skin-male.glb",
  female: "https://example/skin-female.glb"
};
const VESSEL = {
  male: "https://example/vessel-male.glb",
  female: "https://example/vessel-female.glb"
};
const SKELETON_URL = "https://example/skeleton.glb";
const MUSCLE_URL = "https://example/muscle.glb";
const REF_SKIN_URL = "https://example/z-anatomy-skin.glb";

// Visibility is resolved by the SHIPPED rule (layerVisibility.applyVisibility), not by a copy:
// an explicit user choice wins, otherwise a layer falls back to its own default. Duplicating the
// rule here would let the test keep passing after the real behaviour changed.

describe("layers.ts — VH body peel (Path 1, per-sex same-individual)", () => {
  it("yields that sex's skin + heart at identity; no transforms, all same-frame", () => {
    const male = buildVhBodyFromUrls("male", HEART, SKIN);
    assert.deepEqual(
      male.map((l) => [l.structureId, l.layer, l.url, l.visible]),
      [
        ["skin", "skin", SKIN.male, true],
        ["heart", "organ", HEART.male, true]
      ]
    );
    for (const l of male) {
      assert.equal(l.sameFrame, true, `${l.structureId} must be same-frame (identity)`);
      assert.equal(l.transform, undefined, `${l.structureId} must have no manual transform`);
    }

    const female = buildVhBodyFromUrls("female", HEART, SKIN);
    assert.equal(female.find((l) => l.structureId === "heart")?.url, HEART.female);
    assert.equal(female.find((l) => l.structureId === "skin")?.url, SKIN.female);
    for (const l of female) assert.equal(l.sameFrame, true);
  });

  it("omits any per-sex layer whose url is unset (no checkbox for missing asset)", () => {
    const onlySkin = buildVhBodyFromUrls("male", { male: "", female: "" }, SKIN);
    assert.deepEqual(onlySkin.map((l) => l.structureId), ["skin"]);
    // Female heart is configured, female skin is not -> heart remains, skin omitted.
    const noSkinFemale = buildVhBodyFromUrls("female", HEART, { male: "", female: "" });
    assert.deepEqual(noSkinFemale.map((l) => l.structureId), ["heart"]);
    // Nothing configured at all -> no layers (empty-state, not a crash).
    assert.deepEqual(
      buildVhBodyFromUrls("male", { male: "", female: "" }, { male: "", female: "" }).map(
        (l) => l.structureId
      ),
      []
    );
  });

  it("toggling skin or organs off removes it from the rendered+framed set", () => {
    const all = buildVhBodyFromUrls("male", HEART, SKIN);
    let visible = filterVisibleLayers(applyVisibility(all, { skin: false }));
    assert.deepEqual(visible.map((l) => l.structureId), ["heart"]);
    visible = filterVisibleLayers(applyVisibility(all, { organ: false }));
    assert.deepEqual(visible.map((l) => l.structureId), ["skin"]);
    visible = filterVisibleLayers(applyVisibility(all, { skin: false, organ: false }));
    assert.deepEqual(visible.map((l) => l.structureId), []);
  });

  it("yields that sex's blood vasculature too when its url is set (same-frame identity)", () => {
    const male = buildVhBodyFromUrls("male", HEART, SKIN, VESSEL);
    assert.deepEqual(
      male.map((l) => [l.structureId, l.layer, l.url]),
      [
        ["skin", "skin", SKIN.male],
        ["heart", "organ", HEART.male],
        ["blood-vasculature", "vessel", VESSEL.male]
      ]
    );
    const vessel = male.find((l) => l.structureId === "blood-vasculature");
    assert.equal(vessel?.sameFrame, true);
    assert.equal(vessel?.transform, undefined);
    // Female side uses its own vessel URL.
    const female = buildVhBodyFromUrls("female", HEART, SKIN, VESSEL);
    assert.equal(female.find((l) => l.structureId === "blood-vasculature")?.url, VESSEL.female);
    // Vasculature defaults OFF when no url is configured (existing 3-arg calls unchanged).
    assert.deepEqual(
      buildVhBodyFromUrls("male", HEART, SKIN).map((l) => l.structureId),
      ["skin", "heart"]
    );
  });
});

describe("layers.ts — Reference Atlas (Z-Anatomy body + BodyParts3D skin)", () => {
  it("yields skin + skeleton + muscle at identity, all same-frame", () => {
    const ref = buildReferenceFromUrls(SKELETON_URL, MUSCLE_URL, REF_SKIN_URL);
    assert.deepEqual(
      ref.map((l) => [l.structureId, l.layer, l.url]),
      [
        ["skin", "skin", REF_SKIN_URL],
        ["skeleton", "skeleton", SKELETON_URL],
        ["muscle", "muscle", MUSCLE_URL]
      ]
    );
    for (const l of ref) {
      assert.equal(l.sameFrame, true);
      assert.equal(l.transform, undefined);
    }
  });

  it("omits a reference layer with no url (skin defaults off, existing calls unchanged)", () => {
    assert.deepEqual(buildReferenceFromUrls("", MUSCLE_URL).map((l) => l.structureId), [
      "muscle"
    ]);
    assert.deepEqual(buildReferenceFromUrls(SKELETON_URL, MUSCLE_URL).map((l) => l.structureId), [
      "skeleton",
      "muscle"
    ]);
  });

  it("hiding the skin removes it from the rendered+framed set", () => {
    const all = buildReferenceFromUrls(SKELETON_URL, MUSCLE_URL, REF_SKIN_URL);
    const visible = filterVisibleLayers(applyVisibility(all, { skin: false }));
    assert.deepEqual(visible.map((l) => l.structureId), ["skeleton", "muscle"]);
  });

  it("adds each whole-body system as its own same-frame layer, hidden by default", () => {
    const ref = buildReferenceFromUrls(SKELETON_URL, MUSCLE_URL, REF_SKIN_URL, {
      nervous: "https://example/nervous.glb",
      cardiovascular: "https://example/cardio.glb",
      visceral: "https://example/visceral.glb",
      joints: "https://example/joints.glb",
      lymphoid: "https://example/lymphoid.glb"
    });
    const systems = ref.slice(3).map((l) => [l.structureId, l.layer, l.url]);
    assert.deepEqual(systems, [
      ["viscera", "organ", "https://example/visceral.glb"],
      ["cardiovascular-system", "vessel", "https://example/cardio.glb"],
      ["nervous-system", "nerve", "https://example/nervous.glb"],
      ["joints", "joint", "https://example/joints.glb"],
      ["lymphoid-system", "lymphatic", "https://example/lymphoid.glb"]
    ]);
    for (const l of ref.slice(3)) {
      assert.equal(l.sameFrame, true);
      assert.equal(l.defaultHidden, true, `${l.structureId} should not load until asked for`);
    }
    // The base three keep their shipped behaviour: present, same-frame, NOT hidden.
    for (const l of ref.slice(0, 3)) assert.equal(l.defaultHidden, undefined);
  });

  it("omits a system whose url is unset and lists the rest", () => {
    const ref = buildReferenceFromUrls(SKELETON_URL, MUSCLE_URL, "", {
      visceral: "https://example/visceral.glb",
      joints: "https://example/joints.glb"
    });
    assert.deepEqual(ref.map((l) => l.structureId), [
      "skeleton",
      "muscle",
      "viscera",
      "joints"
    ]);
  });
});

describe("donorExtrasFromBase (the Visible Human donors' published interiors)", () => {
  const BASE = "https://example/api/media/hubmap/glb";

  it("returns nothing without a base url — for either sex", () => {
    // A missing base must never yield half a body.
    for (const sex of ["male", "female"] as const) {
      assert.deepEqual(donorExtrasFromBase(sex, ""), []);
      assert.deepEqual(donorExtrasFromBase(sex, "   "), []);
    }
  });

  it("builds every asset of that sex against the base, normalising a trailing slash", () => {
    for (const sex of ["male", "female"] as const) {
      const extras = donorExtrasFromBase(sex, BASE);
      assert.ok(extras.length >= 19, `expected the ${sex} set, got ${extras.length}`);
      assert.ok(extras.every((l) => l.url.startsWith(`${BASE}/`)));
      // A base given with a trailing slash must produce the identical urls, not a doubled slash.
      assert.deepEqual(
        donorExtrasFromBase(sex, `${BASE}/`).map((l) => l.url),
        extras.map((l) => l.url)
      );
      // Only the scheme may contain a double slash.
      assert.equal(extras[0].url.split("//").length - 1, 1);
    }
  });

  it("mounts the organs by default and keeps the heavy spine + cord opt-in", () => {
    for (const sex of ["male", "female"] as const) {
      const extras = donorExtrasFromBase(sex, BASE);
      const organ = extras.filter((l) => l.layer === "organ");
      assert.ok(organ.length >= 16, "the donor's organs should be the bulk of the set");
      assert.ok(organ.every((l) => l.visible && !l.defaultHidden), "organs must show on first paint");
      for (const layer of ["skeleton", "nerve"]) {
        const entries = extras.filter((l) => l.layer === layer);
        assert.ok(entries.length > 0, `${sex} ${layer} should be wired`);
        assert.ok(entries.every((l) => l.defaultHidden && !l.visible), `${layer} must start hidden`);
      }
    }
  });

  it("marks every donor layer sameFrame — they are that same individual's assets", () => {
    // If this ever goes false, the layer would become alignable in ?align=1 and a stale override
    // could displace a correctly-registered organ.
    for (const sex of ["male", "female"] as const) {
      assert.ok(donorExtrasFromBase(sex, BASE).every((l) => l.sameFrame === true));
    }
  });

  it("names a real structure id for every entry, so picking resolves to a published row", () => {
    for (const sex of ["male", "female"] as const) {
      const ids = donorExtrasFromBase(sex, BASE).map((l) => l.structureId);
      assert.ok(ids.every((id) => id.length > 0));
      // The donor's organ layer must not be labelled as the heart alone any more.
      assert.ok(
        ids.includes("liver") && ids.includes("spinal-cord") && ids.includes("vertebral-column"),
        `the ${sex} set is missing a core organ/spine layer`
      );
    }
  });

  it("mounts each sex's own reproductive anatomy and not the other's", () => {
    const female = donorExtrasFromBase("female", BASE).map((l) => l.structureId);
    const male = donorExtrasFromBase("male", BASE).map((l) => l.structureId);
    // Her set is the whole reason this table is per-sex: showing the male set under "Donor female"
    // would misdescribe a real person's body.
    for (const id of ["uterus", "ovary", "fallopian-tube", "vagina"]) {
      assert.ok(female.includes(id), `the female set should include ${id}`);
      assert.ok(!male.includes(id), `the male set must not include ${id}`);
    }
    for (const id of ["prostate", "urethra"]) {
      assert.ok(male.includes(id), `the male set should include ${id}`);
      assert.ok(!female.includes(id), `the female set must not include ${id}`);
    }
  });

  it("leaves out the pregnancy-specific placenta and the duplicated duct assets", () => {
    const urls = donorExtrasFromBase("female", BASE).map((l) => l.url);
    // The placenta is a pregnancy-specific organ; placing it on a non-pregnant body would assert
    // a state that is not there. This is a deliberate exclusion, not an oversight.
    assert.ok(!urls.some((u) => /placenta/i.test(u)), "the placenta must not be wired");
    assert.ok(!urls.some((u) => /ligaments-uterus/i.test(u)), "the uterine ligament set has no row");
    // The three dedicated duct assets carry exactly the same eight duct meshes as the single
    // Biliary_Tree asset, so mounting both would draw coincident surfaces twice.
    for (const name of ["ducts-of-liver", "ducts-of-gallbladder", "ducts-of-pancreas"]) {
      assert.ok(!urls.some((u) => u.includes(name)), `${name} duplicates the biliary tree`);
    }
    assert.ok(urls.some((u) => u.includes("biliary-tree-female")), "the biliary tree is wired");
  });
});
