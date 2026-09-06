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
});
