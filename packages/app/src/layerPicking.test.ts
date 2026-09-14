import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { lookupStructure } from "./structureLookup.ts";
import type { Structure } from "../../schema/src/structure";

// Real published heart structures (source of truth) PLUS one synthetic row standing in for a
// future non-heart layer (e.g. skeleton) whose asset does not exist yet. The MOCK_ name is
// deliberately fake — a test double for "a mesh from another layer", never real anatomy or
// published data. VolumeViewer routes EVERY layer's mesh click through the same
// onPick(meshName) → lookupStructure path, so resolution must be keyed on the mesh name
// alone — never on which LayerAsset group the mesh was rendered in.
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
    id: "mock-other-layer-part",
    uberon: null,
    fma: null,
    label: "Mock other-layer part (test only)",
    layer: "skeleton",
    part_of: null,
    sources: [],
    voxel_size_um: null,
    hoa_dataset_doi: null,
    facts_id: null,
    reviewed: false,
    mesh_names: ["MOCK_OTHER_LAYER_part"]
  }
];

describe("multi-layer picking is layer-agnostic", () => {
  it("resolves a mesh from a mocked non-heart layer when its name is in the graph", () => {
    const hit = lookupStructure(structures, "MOCK_OTHER_LAYER_part");
    assert.equal(hit?.id, "mock-other-layer-part");
    assert.equal(hit?.layer, "skeleton");
  });

  it("resolves a heart mesh through the same name-based path (control)", () => {
    const hit = lookupStructure(structures, "VH_M_heart_left_ventricle");
    assert.equal(hit?.id, "heart-left-ventricle");
    assert.equal(hit?.layer, "organ");
  });

  it("returns DATA_MISSING (undefined) for an unknown mesh in ANY layer", () => {
    // Unknown node inside the heart layer. Deliberately a name that cannot become a row later: this
    // test's fixture is hand-written, so a real mesh name (it used to be `VH_M_mitral_valve`) makes
    // the assertion read as "this mesh is unmapped in the product" when it only means "not here".
    assert.equal(lookupStructure(structures, "VH_M_no_such_part"), undefined);
    // Unknown node inside the mocked non-heart layer.
    assert.equal(lookupStructure(structures, "MOCK_OTHER_LAYER_unknown"), undefined);
  });

  it("never matches on the layer value — resolution needs a real id/label/mesh name", () => {
    // "skeleton" is the layer value on the mock row, not an id/label/mesh_name -> DATA_MISSING.
    assert.equal(lookupStructure(structures, "skeleton"), undefined);
  });
});
