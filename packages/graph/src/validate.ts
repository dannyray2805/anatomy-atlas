import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertStructure, type Structure } from "../../schema/src/structure.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export function loadGraph(pathname = resolve(root, "content/published/structures.json")): Structure[] {
  const raw = readFileSync(pathname, "utf8");
  return JSON.parse(raw) as Structure[];
}

export function validateGraph(structures: Structure[]): string[] {
  const ids = new Set(structures.map((s) => s.id));
  const errors: string[] = [];
  for (const s of structures) {
    errors.push(...assertStructure(s));
    if (s.part_of && !ids.has(s.part_of)) {
      errors.push(`${s.id}: part_of ${s.part_of} does not exist`);
    }
  }
  return errors;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const errors = validateGraph(loadGraph());
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("graph ok");
}
