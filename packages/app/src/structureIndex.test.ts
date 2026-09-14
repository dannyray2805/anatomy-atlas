import { describe, it } from "node:test";
import assert from "node:assert/strict";
import structuresJson from "../../../content/published/structures.json" with { type: "json" };
import type { Structure } from "../../schema/src/structure";
import { shareStateFromQuery } from "./bodySource.ts";
import { lookupStructure } from "./structureLookup.ts";
import {
  BODY_PREFERENCE,
  bodiesForMeshNames,
  groupByLayer,
  indexEntries,
  indexSummary,
  linkNeedsSystems
} from "./structureIndex.ts";

const structures = structuresJson as unknown as Structure[];
const entry = (id: string) => indexEntries(structures).find((e) => e.id === id);

describe("bodiesForMeshNames (which body carries a structure)", () => {
  it("reads the Visible Human asset prefix", () => {
    assert.deepEqual(bodiesForMeshNames(["VH_M_liver"]), ["donor-male"]);
    assert.deepEqual(bodiesForMeshNames(["VH_F_body_of_uterus"]), ["donor-female"]);
    assert.deepEqual(bodiesForMeshNames(["SBU_M_rectum"]), ["donor-male"]);
  });

  it("treats unprefixed names as the Reference Atlas body's own", () => {
    assert.deepEqual(bodiesForMeshNames(["Liver", "Kidney.l"]), ["reference"]);
  });

  it("treats the mesh names shared by BOTH donors as being on both", () => {
    // The Allen brain atlas and the NIH lymph node publish identical names for each sex, so a
    // prefix-based split would wrongly say "male only" and hide the other body's copy.
    assert.deepEqual(bodiesForMeshNames(["Allen_olfactory_bulb_L"]), ["donor-male", "donor-female"]);
    assert.deepEqual(bodiesForMeshNames(["Yao_follicles"]), ["donor-male", "donor-female"]);
  });

  it("returns bodies in a stable preference order when several carry it", () => {
    const bodies = bodiesForMeshNames(["Liver", "VH_M_liver", "VH_F_liver"]);
    assert.deepEqual(bodies, ["reference", "donor-male", "donor-female"]);
    assert.deepEqual(bodies, [...BODY_PREFERENCE]);
  });

  it("returns nothing for a structure with no names", () => {
    assert.deepEqual(bodiesForMeshNames([]), []);
  });
  // Grounded in the real graph rather than a fixture: these are the cases a wrong rule breaks.
  it("places real structures on the right bodies", () => {
    assert.deepEqual(entry("uterus")?.bodies, ["donor-female"]);
    assert.deepEqual(entry("prostate")?.bodies, ["donor-male"]);
    assert.deepEqual(entry("liver")?.bodies, ["reference", "donor-male", "donor-female"]);
    assert.deepEqual(entry("jejunum")?.bodies, ["reference", "donor-male", "donor-female"]);
    // The heart chambers are carried by all three bodies: the donors' HRA heart assets (`VH_M_` /
    // `VH_F_`) and the Reference body's Z-Anatomy cardiovascular layer, whose meshes carry no prefix.
    assert.deepEqual(entry("heart-right-ventricle")?.bodies, [
      "reference",
      "donor-male",
      "donor-female"
    ]);
    // The left ventricle used to be male-only, because the female asset names it
    // `VH_F_left_ventricle` while the male one says `VH_M_heart_left_ventricle`; the female mesh is
    // mapped now, so this row must not quietly go back to one body.
    assert.deepEqual(entry("heart-left-ventricle")?.bodies, [
      "reference",
      "donor-male",
      "donor-female"
    ]);
    // And the left atrium, which had no row at all until it was noticed that both donors' assets
    // carry the mesh. A body must not be dropped for this one either.
    assert.deepEqual(entry("heart-left-atrium")?.bodies, [
      "reference",
      "donor-male",
      "donor-female"
    ]);
  });
});

describe("linkNeedsSystems (should a shared link mount the heavy systems?)", () => {
  const namesOf = (id: string) => structures.find((s) => s.id === id)?.mesh_names ?? [];

  it("asks for them when this body carries the structure but the scene has not mounted it", () => {
    // Grounded in the real graph: the Reference body files the chamber under `organ` yet carries the
    // mesh in its lazily-mounted "Heart + vessels" system — the deep link that opened the entry and
    // showed nothing until this was fixed.
    assert.equal(
      linkNeedsSystems(namesOf("heart-left-atrium"), "reference", "heart-left-atrium", []),
      true
    );
  });

  it("does not spend the download on a structure this body does not carry", () => {
    // The female donor publishes no femur; mounting every system could not reveal it.
    assert.equal(namesOf("femur").length > 0, true);
    assert.deepEqual(bodiesForMeshNames(namesOf("femur")), ["reference"]);
    assert.equal(linkNeedsSystems(namesOf("femur"), "donor-female", "femur", []), false);
  });

  it("does nothing once the scene already holds it", () => {
    // A default-visible structure (a bone on the Reference body) is mounted before any link runs,
    // so the peel alone reveals it and no system is switched on behind the user's back. The mounted
    // list holds structure IDS — what the scene reports per mesh — not mesh names.
    assert.equal(linkNeedsSystems(namesOf("femur"), "reference", "femur", ["femur"]), false);
    assert.equal(
      linkNeedsSystems(namesOf("heart-left-atrium"), "reference", "heart-left-atrium", [
        "heart-left-atrium"
      ]),
      false
    );
  });

  it("does nothing for a whole-layer row with no meshes", () => {
    assert.equal(linkNeedsSystems([], "reference", "body", []), false);
  });
});

describe("indexEntries", () => {
  const entries = indexEntries(structures);

  it("lists only structures that something actually resolves to", () => {
    const namesless = structures.filter((s) => (s.mesh_names ?? []).length === 0).map((s) => s.id);
    assert.ok(namesless.length > 0, "expected some whole-layer rows with no meshes");
    for (const id of namesless) {
      assert.equal(entries.some((e) => e.id === id), false, `${id} has no meshes but was listed`);
    }
    for (const e of entries) {
      assert.ok(e.bodies.length > 0, `${e.id} is listed with no body to open it on`);
    }
  });

  it("sorts by label so the list is scannable", () => {
    const labels = entries.map((e) => e.label);
    assert.deepEqual(labels, [...labels].sort((a, b) => a.localeCompare(b)));
  });

  it("records whether an entry can actually answer a question", () => {
    // A structure without a card opens an identity panel that declines the tutor; the index should
    // not imply more depth than exists.
    assert.equal(entry("liver")?.hasCard, true);
    assert.equal(entry("uterus")?.hasCard, true);
  });

  it("links to the body that carries the structure, and the link parses back", () => {
    // The href format is built here and parsed by bodySource.ts, so round-trip every entry: if the
    // two ever drift apart, every index link silently opens the wrong view.
    for (const e of entries) {
      const state = shareStateFromQuery(e.href.replace(/^\//, ""));
      assert.equal(state.structure, e.id, `${e.id}: link lost the structure`);
      assert.equal(state.source, e.body, `${e.id}: link opens ${state.source}, expected ${e.body}`);
      assert.ok(e.bodies.includes(state.source), `${e.id}: linked body does not carry it`);
    }
  });
});

describe("the heart's own parts (valves and the interventricular septum)", () => {
  it("are mapped for both donors, and resolve from the mesh names a click produces", () => {
    for (const id of ["aortic-valve", "mitral-valve", "pulmonary-valve", "tricuspid-valve", "interventricular-septum"]) {
      assert.ok(entry(id), `${id} is missing from the index`);
      assert.deepEqual(entry(id)?.bodies, ["donor-male", "donor-female"], `${id} lost a body`);
    }
    // The name the scene actually reports is what has to resolve; a row listing the asset's name
    // from the FILE rather than the loader's is dead on arrival, which this project has hit before.
    assert.equal(lookupStructure(structures, "VH_M_mitral_valve")?.id, "mitral-valve");
    assert.equal(lookupStructure(structures, "VH_F_tricuspid_valve")?.id, "tricuspid-valve");
    assert.equal(
      lookupStructure(structures, "VH_F_interventricular_septum")?.id,
      "interventricular-septum"
    );
  });

  it("leaves the ten named papillary muscles unmapped rather than filing them under one broad term", () => {
    // They are real meshes in both shipping heart GLBs. Uberon models the papillary muscles as a
    // group, so mapping each named muscle would map a part to its whole — the same reason the named
    // muscle heads and bellies are unmapped. Recorded here so the gap cannot be quietly forgotten.
    assert.equal(
      lookupStructure(structures, "VH_M_papillary_muscle_of_heart_anterior"),
      undefined
    );
    assert.equal(
      lookupStructure(structures, "VH_F_papillary_muscle_of_heart_posmed"),
      undefined
    );
  });
});

describe("groupByLayer", () => {
  it("uses the caller's order and appends unranked layers rather than dropping them", () => {
    const entries = indexEntries(structures);
    const groups = groupByLayer(entries, ["lymphatic", "organ"], (l) => l.toUpperCase());
    assert.deepEqual(groups.slice(0, 2).map((g) => g.layer), ["lymphatic", "organ"]);
    const regrouped = groups.flatMap((g) => g.entries.map((e) => e.id)).sort();
    assert.deepEqual(regrouped, entries.map((e) => e.id).sort());
    const unranked = groups.slice(2).map((g) => g.layer);
    assert.deepEqual(unranked, [...unranked].sort());
  });
});

describe("indexSummary", () => {
  it("states coverage from the rows, not from a literal", () => {
    const s = indexSummary(structures);
    assert.equal(s.totalRows, structures.length);
    assert.equal(s.documented, structures.filter((x) => (x.mesh_names ?? []).length > 0).length);
    assert.ok(s.withCards <= s.documented);
  });
});
