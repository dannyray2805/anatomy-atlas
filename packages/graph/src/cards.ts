import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FactCardFrontmatterSchema, type Structure } from "../../schema/src/structure.ts";

/**
 * Fact-card validation.
 *
 * Cards were previously unchecked: the frontmatter schema existed but was only ever exercised
 * against a test fixture, so a malformed card, a card whose `id` disagreed with its filename, or a
 * citation key that exists in no source row would all ship silently — the Worker serves the raw
 * markdown whatever it says, and the deploy smoke only checks that the card is reachable. Those
 * are exactly the failures that make a citation-gated tutor cite something that does not exist.
 *
 * The parser is deliberately a strict subset of YAML (the shape these cards actually use) that
 * THROWS on anything it does not recognise, rather than guessing: a lenient parser would turn a
 * formatting mistake into a silently missing citation.
 */

export type CardFrontmatter = {
  id: string;
  uberon: string | null;
  reviewed: boolean;
  reviewer: string | null;
  date: string | null;
  citations: string[];
};

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** Split a card into its frontmatter block and body, failing loudly on a missing/blank block. */
export function splitCard(text: string): { block: string; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) throw new Error("no frontmatter block (expected --- ... --- at the top)");
  return { block: match[1], body: match[2] };
}

/**
 * Parse the card frontmatter subset: `key: value` scalars plus a `citations:` block list of
 * indented `- "key"` entries. Anything else throws.
 */
export function parseCardFrontmatter(block: string): CardFrontmatter {
  const scalars: Record<string, string> = {};
  const citations: string[] = [];
  let inCitations = false;

  for (const rawLine of block.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const listItem = /^\s+-\s+(.*)$/.exec(rawLine);
    if (inCitations && listItem) {
      citations.push(unquote(listItem[1]));
      continue;
    }
    const scalar = /^([A-Za-z_][A-Za-z0-9_]*):(?:\s*(.*))?$/.exec(rawLine);
    if (!scalar) throw new Error(`unparsable frontmatter line: ${JSON.stringify(rawLine)}`);
    const [, key, value = ""] = scalar;
    inCitations = key === "citations" && !value.trim();
    if (!inCitations) scalars[key] = unquote(value);
  }

  return FactCardFrontmatterSchema.parse({
    id: scalars.id,
    uberon: scalars.uberon === "" || scalars.uberon === "null" ? null : (scalars.uberon ?? null),
    reviewed: scalars.reviewed === "true",
    reviewer: scalars.reviewer === "" || scalars.reviewer === "null" ? null : (scalars.reviewer ?? null),
    date: scalars.date === "" || scalars.date === "null" ? null : (scalars.date ?? null),
    citations
  }) as CardFrontmatter;
}

/** Source ids are the first cell of every data row in the docs/sources.md register. */
export function registerSourceIds(registerMarkdown: string): Set<string> {
  const ids = new Set<string>();
  for (const line of registerMarkdown.split(/\r?\n/)) {
    const cell = /^\|\s*([A-Za-z0-9._-]+)\s*\|/.exec(line);
    if (!cell) continue;
    const id = cell[1];
    // Skip the header and the |---|---|---| separator; an id must contain an alphanumeric.
    if (id === "id" || !/[A-Za-z0-9]/.test(id)) continue;
    ids.add(id);
  }
  return ids;
}

export type CardFile = { file: string; frontmatter: CardFrontmatter };

/** Read and parse every card in a directory. Throws with the filename on any parse failure. */
export function readCards(factsDir: string): CardFile[] {
  return readdirSync(factsDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((file) => {
      const text = readFileSync(join(factsDir, file), "utf8");
      try {
        const { block, body } = splitCard(text);
        if (!body.trim()) throw new Error("empty body");
        return { file, frontmatter: parseCardFrontmatter(block) };
      } catch (e) {
        throw new Error(`${file}: ${(e as Error).message}`);
      }
    });
}

/**
 * Every card must parse, its `id` must match its filename, every citation key must exist in the
 * source register, and every `facts_id` a structure points at must exist as a card. Returns
 * human-readable errors (empty = ok).
 */
export function validateCards(opts: {
  factsDir: string;
  sourcesPath: string;
  structures: Structure[];
}): string[] {
  const errors: string[] = [];
  let cards: CardFile[];
  try {
    cards = readCards(opts.factsDir);
  } catch (e) {
    return [(e as Error).message];
  }

  const register = registerSourceIds(readFileSync(opts.sourcesPath, "utf8"));
  const byId = new Map(cards.map((c) => [c.frontmatter.id, c]));

  for (const { file, frontmatter } of cards) {
    if (`${frontmatter.id}.md` !== file) {
      errors.push(`${file}: frontmatter id "${frontmatter.id}" does not match the filename`);
    }
    const unknown = frontmatter.citations.filter((c) => !register.has(c));
    if (unknown.length) {
      errors.push(`${file}: citation key(s) not in docs/sources.md: ${unknown.join(", ")}`);
    }
  }

  for (const s of opts.structures) {
    if (s.facts_id && !byId.has(s.facts_id)) {
      errors.push(`${s.id}: facts_id "${s.facts_id}" has no card in content/published/facts/`);
    }
  }

  return errors;
}
