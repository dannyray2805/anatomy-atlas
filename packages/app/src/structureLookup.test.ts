import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { lookupStructure } from "./structureLookup.ts";
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
  }
];

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
