import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateGraph } from "./validate.ts";
import type { Structure } from "../../schema/src/structure.ts";

const here = dirname(fileURLToPath(import.meta.url));
const load = (name: string): Structure[] =>
  JSON.parse(readFileSync(resolve(here, "fixtures", name), "utf8")) as Structure[];

describe("validateGraph", () => {
  it("accepts the valid fixture graph", () => {
    assert.deepEqual(validateGraph(load("valid-graph.json")), []);
  });

  it("rejects reviewed structure without sources", () => {
    const errors = validateGraph(load("reviewed-no-sources.json"));
    assert.ok(errors.some((e) => e.includes("sources")));
  });

  it("rejects tissue without HOA metadata", () => {
    const errors = validateGraph(load("tissue-no-hoa.json"));
    assert.ok(errors.some((e) => e.includes("hoa_dataset_doi")));
    assert.ok(errors.some((e) => e.includes("voxel_size_um")));
  });

  it("rejects missing parent", () => {
    const errors = validateGraph(load("missing-parent.json"));
    assert.ok(errors.some((e) => e.includes("part_of")));
  });

  // Both of these protect click resolution: a clicked mesh must map to exactly one structure.
  it("rejects a mesh name claimed by two structures", () => {
    const base = load("valid-graph.json");
    const first = base[0];
    const second = { ...base[1], mesh_names: ["Shared_mesh"] };
    const errors = validateGraph([{ ...first, mesh_names: ["Shared_mesh"] }, second]);
    assert.ok(errors.some((e) => e.includes('mesh name "Shared_mesh"') && e.includes("more than one")));
  });

  it("rejects a duplicate structure id", () => {
    const base = load("valid-graph.json");
    const errors = validateGraph([base[0], { ...base[0] }]);
    assert.ok(errors.some((e) => e.includes("duplicate structure id")));
  });
});
