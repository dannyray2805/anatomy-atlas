import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BODY_SOURCE_LABELS,
  BODY_SOURCE_ORDER,
  DEFAULT_BODY_SOURCE,
  bodySourceFromQuery,
  isDonorSource,
  resolveSource,
  sourceSex
} from "./bodySource.ts";

describe("bodySource (which individual the pane is showing)", () => {
  it("defaults to the reference body — the only source with an interior", () => {
    assert.equal(DEFAULT_BODY_SOURCE, "reference");
    assert.equal(bodySourceFromQuery(null), "reference");
    assert.equal(bodySourceFromQuery(undefined), "reference");
    assert.equal(bodySourceFromQuery(""), "reference");
  });

  it("parses every configured source from a deep link", () => {
    for (const source of BODY_SOURCE_ORDER) {
      assert.equal(bodySourceFromQuery(source), source);
    }
  });

  it("falls back to the default for junk instead of rendering a broken pane", () => {
    for (const junk of ["Reference", "REFERENCE", "donor", "donor-male ", "../etc", "0"]) {
      assert.equal(bodySourceFromQuery(junk), "reference", `junk: ${junk}`);
    }
  });

  it("maps each source to the sex it actually is, and null when sex does not apply", () => {
    assert.equal(sourceSex("donor-male"), "male");
    assert.equal(sourceSex("donor-female"), "female");
    // The reference body is one male individual — it is not a sex-selectable body, so the
    // honest answer is "this question does not apply", not "male".
    assert.equal(sourceSex("reference"), null);
  });

  it("knows which sources are the per-sex Visible Human donors", () => {
    assert.equal(isDonorSource("donor-male"), true);
    assert.equal(isDonorSource("donor-female"), true);
    assert.equal(isDonorSource("reference"), false);
  });

  it("falls back to the first configured source when an id is unknown", () => {
    const configs = [{ id: "donor-female" }, { id: "reference" }] as const;
    assert.deepEqual(resolveSource(configs, "reference"), { id: "reference" });
    // An id this build does not configure (e.g. a stale shared link) must not yield undefined.
    assert.deepEqual(resolveSource(configs, "donor-male"), { id: "donor-female" });
  });

  it("labels every configured source, so the control can never render an empty pill", () => {
    for (const source of BODY_SOURCE_ORDER) {
      assert.ok(BODY_SOURCE_LABELS[source].length > 0, `missing label for ${source}`);
    }
    assert.equal(new Set(BODY_SOURCE_ORDER).size, BODY_SOURCE_ORDER.length);
  });
});
