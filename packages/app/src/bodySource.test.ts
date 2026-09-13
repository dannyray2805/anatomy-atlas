import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BODY_SOURCE_LABELS,
  BODY_SOURCE_ORDER,
  DEFAULT_BODY_SOURCE,
  bodySourceFromQuery,
  buildShareQuery,
  isDonorSource,
  resolveSource,
  shareStateFromQuery,
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

describe("shareable view state (?body= and ?structure=)", () => {
  it("reads the default view from an empty query", () => {
    assert.deepEqual(shareStateFromQuery(""), { source: "reference", structure: null });
    assert.deepEqual(shareStateFromQuery("?"), { source: "reference", structure: null });
  });

  it("reads a body and a structure", () => {
    assert.deepEqual(shareStateFromQuery("?body=donor-female&structure=uterus"), {
      source: "donor-female",
      structure: "uterus"
    });
  });

  it("falls back to the default body for an unknown one, without losing the structure", () => {
    // A hand-edited or outdated link should still open the structure it names.
    assert.deepEqual(shareStateFromQuery("?body=donor-alien&structure=liver"), {
      source: "reference",
      structure: "liver"
    });
  });

  it("treats a blank structure as no structure", () => {
    assert.equal(shareStateFromQuery("?structure=").structure, null);
    assert.equal(shareStateFromQuery("?structure=%20%20").structure, null);
  });

  it("tolerates extra unrelated parameters", () => {
    assert.deepEqual(shareStateFromQuery("?utm_source=x&body=donor-male&structure=brain&align=1"), {
      source: "donor-male",
      structure: "brain"
    });
  });

  it("omits the default body, so the default view is the bare URL", () => {
    assert.equal(buildShareQuery({ source: "reference", structure: null }), "");
    assert.equal(buildShareQuery({ source: "donor-male", structure: null }), "?body=donor-male");
    assert.equal(buildShareQuery({ source: "reference", structure: "liver" }), "?structure=liver");
  });

  it("emits a stable parameter order, so the same view is always the same string", () => {
    // The caller compares this against the current URL to decide whether to write history at all;
    // an unstable order would make it rewrite the address bar on every render.
    const a = buildShareQuery({ source: "donor-female", structure: "uterus" });
    assert.equal(a, buildShareQuery({ source: "donor-female", structure: "uterus" }));
    assert.equal(a, "?body=donor-female&structure=uterus");
  });

  it("round-trips through the parser", () => {
    const state = { source: "donor-female" as const, structure: "fallopian-tube" };
    assert.deepEqual(shareStateFromQuery(buildShareQuery(state)), state);
  });
});
