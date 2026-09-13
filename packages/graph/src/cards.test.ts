import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  inBodyCitationKeys,
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

describe("inBodyCitationKeys", () => {
  const register = new Set(["uberon", "z-anatomy", "hubmap-hra-glb"]);

  it("returns only tokens that are real register keys", () => {
    // Ordinary parentheses must never be mistaken for citations, or the check below would be
    // unusable on real cards (they are full of (UBERON:...) and (layer `organ`) asides).
    const body = [
      "- A claim (uberon).",
      "- An ascription (UBERON:0000948) in the (layer `organ`) sense (e.g. the lungs)."
    ].join("\n");
    assert.deepEqual(inBodyCitationKeys(body, register), ["uberon"]);
  });

  it("handles a parenthesised list of several keys", () => {
    const keys = inBodyCitationKeys("- A claim (z-anatomy, hubmap-hra-glb).", register);
    assert.deepEqual(keys.sort(), ["hubmap-hra-glb", "z-anatomy"]);
  });

  it("ignores a register key that the card never cites", () => {
    assert.deepEqual(inBodyCitationKeys("- A claim (uberon).", register), ["uberon"]);
  });
});

describe("validateCards: body citations must be declared", () => {
  function withTempCard(cardMarkdown: string): string[] {
    const dir = mkdtempSync(join(tmpdir(), "atlas-cards-"));
    writeFileSync(join(dir, "x.md"), cardMarkdown);
    // Deliberately NOT named *.md: readCards() reads every .md in the facts dir as a card, so a
    // register file living there would be parsed as one.
    const sourcesPath = join(dir, "sources.txt");
    writeFileSync(sourcesPath, "| id | name |\n|---|---|\n| uberon | Uberon |\n| z-anatomy | Z-Anatomy |\n");
    const base = loadGraph()[0];
    return validateCards({
      factsDir: dir,
      sourcesPath,
      structures: [{ ...base, id: "x", facts_id: "x" }]
    });
  }

  const HEAD = '---\nid: x\nuberon: null\nreviewed: false\nreviewer: null\ndate: null\ncitations:\n  - "uberon"\n---\n\n';

  it("flags a body citing a register key the card does not declare", () => {
    const errors = withTempCard(`${HEAD}## Identity\n\n- A claim (uberon) and another (z-anatomy).\n`);
    assert.ok(
      errors.some((e) => e.includes("does not declare") && e.includes("z-anatomy")),
      `expected an undeclared-citation error, got: ${JSON.stringify(errors)}`
    );
  });

  it("accepts a body whose every cited key is declared", () => {
    const errors = withTempCard(`${HEAD}## Identity\n\n- A claim (uberon).\n`);
    assert.deepEqual(errors, []);
  });
});
