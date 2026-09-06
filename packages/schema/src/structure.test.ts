import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertStructure,
  FactCardFrontmatterSchema,
  StructureSchema,
  type Structure
} from "./structure.ts";

const here = dirname(fileURLToPath(import.meta.url));
const loadFixture = (name: string): unknown =>
  JSON.parse(readFileSync(resolve(here, "fixtures", name), "utf8"));

const base = (): Structure => ({
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
});

describe("assertStructure", () => {
  it("allows unreviewed fixture without sources", () => {
    assert.deepEqual(assertStructure(base()), []);
  });

  it("rejects reviewed structure with empty sources", () => {
    const errors = assertStructure({ ...base(), reviewed: true });
    assert.ok(errors.some((e) => e.includes("sources")));
  });

  it("rejects tissue without HOA metadata", () => {
    const errors = assertStructure({
      ...base(),
      id: "heart-myocardium-tissue",
      layer: "tissue",
      reviewed: false
    });
    assert.ok(errors.some((e) => e.includes("hoa_dataset_doi")));
    assert.ok(errors.some((e) => e.includes("voxel_size_um")));
  });
});

describe("StructureSchema (zod)", () => {
  it("rejects unknown layer", () => {
    const bad = { ...base(), layer: "bogus" } as unknown;
    assert.equal(StructureSchema.safeParse(bad).success, false);
  });

  it("rejects missing label", () => {
    const bad = { ...base(), label: "" } as unknown;
    assert.equal(StructureSchema.safeParse(bad).success, false);
  });

  it("accepts a structure with mesh_names", () => {
    const s = { ...base(), mesh_names: ["VH_M_heart_left_ventricle"] };
    assert.equal(StructureSchema.safeParse(s).success, true);
  });

  it("rejects an empty mesh name", () => {
    const s = { ...base(), mesh_names: [""] };
    assert.equal(StructureSchema.safeParse(s).success, false);
  });
});

describe("FactCardFrontmatterSchema (zod)", () => {
  it("accepts the valid frontmatter fixture", () => {
    const result = FactCardFrontmatterSchema.safeParse(loadFixture("fact-card-valid.json"));
    assert.equal(result.success, true);
  });

  it("rejects frontmatter without citations", () => {
    const bad = { ...(loadFixture("fact-card-valid.json") as object), citations: [] };
    assert.equal(FactCardFrontmatterSchema.safeParse(bad).success, false);
  });
});
