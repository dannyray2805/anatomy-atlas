import { describe, it } from "node:test";
import assert from "node:assert/strict";
import structuresJson from "../../../content/published/structures.json" with { type: "json" };
import type { Structure } from "../../schema/src/structure";
import { shareStateFromQuery } from "./bodySource.ts";
import {
  BODY_PREFERENCE,
  bodiesForMeshNames,
  groupByLayer,
  indexEntries,
  indexSummary
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
    // The heart rows name `VH_M_` / `VH_F_` meshes; they are the donor hearts, not the reference.
    assert.deepEqual(entry("heart-right-ventricle")?.bodies, ["donor-male", "donor-female"]);
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
