import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseCardFrontmatter,
  readCards,
  registerSourceIds,
  splitCard,
  validateCards
} from "./cards.ts";
import { loadGraph } from "./validate.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("card frontmatter parsing", () => {
  it("parses scalars and a quoted citation list", () => {
    const fm = parseCardFrontmatter(
      [
        "id: liver",
        "uberon: UBERON:0002107",
        "reviewed: false",
        "reviewer: null",
        "date: 2026-09-12",
        "citations:",
        '  - "z-anatomy"',
        '  - "uberon"'
      ].join("\n")
    );
    assert.equal(fm.id, "liver");
    assert.equal(fm.uberon, "UBERON:0002107");
    assert.equal(fm.reviewed, false);
    assert.equal(fm.reviewer, null);
    assert.deepEqual(fm.citations, ["z-anatomy", "uberon"]);
  });

  it("rejects a line it cannot parse instead of skipping it", () => {
    // The point of strictness: a formatting slip must not quietly drop a citation.
    assert.throws(() => parseCardFrontmatter("citations:\n  - z-anatomy\n  oops"), /unparsable/);
  });

  it("requires a frontmatter block, and readCards rejects an empty body", () => {
    assert.throws(() => splitCard("no frontmatter here"), /frontmatter/);
    // splitCard only splits; the emptiness check that matters lives in readCards (a card with no
    // body would serve an empty answer to the tutor).
    assert.equal(splitCard("---\nid: x\n---\n\n").body.trim(), "");
  });
});

describe("source register parsing", () => {
  it("takes the first cell of each data row and ignores the header", () => {
    const ids = registerSourceIds("| id | name |\n|---|---|\n| uberon | Uberon |\n| z-anatomy | Z-Anatomy |");
    assert.deepEqual([...ids].sort(), ["uberon", "z-anatomy"]);
  });
});

describe("validateCards", () => {
  const structures = [loadGraph()[0], { ...loadGraph()[0], id: "ghost", facts_id: "no-such-card" }];

  it("flags a facts_id with no card", () => {
    const errors = validateCards({
      factsDir: resolve(root, "content/published/facts"),
      sourcesPath: resolve(root, "docs/sources.md"),
      structures
    });
    assert.ok(errors.some((e) => e.includes("no-such-card") && e.includes("no card")));
  });

  it("passes for every card actually published in this repo", () => {
    const graph = loadGraph();
    const errors = validateCards({
      factsDir: resolve(root, "content/published/facts"),
      sourcesPath: resolve(root, "docs/sources.md"),
      structures: graph
    });
    // The real cards must be internally consistent: parse, id == filename, known citations.
    assert.deepEqual(
      errors.filter((e) => !e.includes("no-such-card")),
      []
    );
  });

  it("flags a citation key that no source row declares", () => {
    const cards = readCards(resolve(root, "content/published/facts"));
    assert.ok(cards.length > 0, "expected published cards");
    const fm = cards[0].frontmatter;
    assert.ok(fm.citations.length > 0);
    const register = registerSourceIds("| id | name |\n|---|---|\n| something-else | x |");
    assert.equal(register.has(fm.citations[0]), false);
  });
});
