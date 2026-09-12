import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { lookupStructure, meshNameMatches, normalizeMeshName } from "./structureLookup.ts";
import type { Structure } from "../../schema/src/structure";

const structures: Structure[] = [
  {
    id: "heart",
    uberon: "UBERON:0000948",
    fma: null,
    label: "Heart",
    layer: "organ",
    part_of: "body",
    sources: [],
    voxel_size_um: null,
    hoa_dataset_doi: null,
    facts_id: null,
    reviewed: false
  },
  {
    id: "heart-left-ventricle",
    uberon: "UBERON:0002084",
    fma: null,
    label: "Left ventricle",
    layer: "organ",
    part_of: "heart",
    sources: [],
    voxel_size_um: null,
    hoa_dataset_doi: null,
    facts_id: "heart-left-ventricle",
    reviewed: false,
    mesh_names: ["VH_M_heart_left_ventricle"]
  },
  {
    id: "kidney",
    uberon: "UBERON:0002113",
    fma: null,
    label: "Kidney",
    layer: "organ",
    part_of: "body",
    sources: [],
    voxel_size_um: null,
    hoa_dataset_doi: null,
    facts_id: null,
    reviewed: false,
    mesh_names: ["Kidney.l", "Kidney.r"]
  },
  {
    id: "lung",
    uberon: "UBERON:0002048",
    fma: null,
    label: "Lung",
    layer: "organ",
    part_of: "body",
    sources: [],
    voxel_size_um: null,
    hoa_dataset_doi: null,
    facts_id: null,
    reviewed: false,
    mesh_names: ["Inferior lobe of left lung", "Thyroid gland"]
  }
];

// three's GLTFLoader renames nodes (PropertyBinding.sanitizeNodeName) and splits multi-primitive
// meshes into `<name>_1`, `<name>_2` children. A register that matches literally looks correct in
// the file yet never resolves in the app — the mesh renders and clicking it reports
// "not in this dataset". These cases are the ones that were silently failing.
describe("mesh name normalization (three.js renames node names)", () => {
  it("normalizes whitespace to underscore and drops reserved characters", () => {
    assert.equal(normalizeMeshName("Thyroid gland"), "Thyroid_gland");
    assert.equal(normalizeMeshName("Kidney.l"), "Kidneyl");
    assert.equal(normalizeMeshName("(Anterior tibial node).l"), "(Anterior_tibial_node)l");
  });

  it("matches a scene name against the dataset name it came from", () => {
    assert.ok(meshNameMatches("Thyroid_gland", "Thyroid gland"));
    assert.ok(meshNameMatches("Kidneyl", "Kidney.l"));
    assert.ok(meshNameMatches("VH_M_heart_left_ventricle", "VH_M_heart_left_ventricle"));
  });

  it("matches a multi-primitive child mesh to its base name", () => {
    assert.ok(meshNameMatches("Inferior_lobe_of_left_lung_1", "Inferior lobe of left lung"));
    assert.ok(meshNameMatches("Inferior_lobe_of_left_lung_3", "Inferior lobe of left lung"));
  });

  it("does not match a different structure", () => {
    assert.equal(meshNameMatches("Kidneyl", "Kidney.r"), false);
    assert.equal(meshNameMatches("Thyroid_gland", "Parathyroid gland"), false);
  });

  it("resolve a clicked organ through the renamed mesh name", () => {
    assert.equal(lookupStructure(structures, "Kidneyl")?.id, "kidney");
    assert.equal(lookupStructure(structures, "Kidney.r")?.id, "kidney");
    assert.equal(lookupStructure(structures, "Inferior_lobe_of_left_lung_2")?.id, "lung");
    assert.equal(lookupStructure(structures, "Thyroid_gland")?.id, "lung");
  });
});

describe("lookupStructure", () => {
  it("resolves by id", () => {
    assert.equal(
      lookupStructure(structures, "heart-left-ventricle")?.id,
      "heart-left-ventricle"
    );
  });

  it("resolves by label", () => {
    assert.equal(lookupStructure(structures, "Left ventricle")?.id, "heart-left-ventricle");
  });

  it("resolves by HuBMAP mesh name", () => {
    assert.equal(
      lookupStructure(structures, "VH_M_heart_left_ventricle")?.id,
      "heart-left-ventricle"
    );
  });

  it("returns undefined for a mesh not in the graph (DATA_MISSING)", () => {
    assert.equal(lookupStructure(structures, "VH_M_mitral_valve"), undefined);
  });

  it("returns undefined for null", () => {
    assert.equal(lookupStructure(structures, null), undefined);
  });
});
