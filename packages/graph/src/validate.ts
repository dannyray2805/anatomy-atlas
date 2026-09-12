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
  const errors: string[] = [];
  const ids = new Set<string>();
  const meshOwners = new Map<string, string[]>();
  for (const s of structures) {
    if (ids.has(s.id)) errors.push(`${s.id}: duplicate structure id`);
    ids.add(s.id);
    for (const name of s.mesh_names ?? []) {
      meshOwners.set(name, [...(meshOwners.get(name) ?? []), s.id]);
    }
  }
  for (const s of structures) {
    errors.push(...assertStructure(s));
    if (s.part_of && !ids.has(s.part_of)) {
      errors.push(`${s.id}: part_of ${s.part_of} does not exist`);
    }
  }
  // mesh_names are how a clicked mesh resolves to a structure, so a name claimed twice makes the
  // click ambiguous (whichever row is matched last wins) and shows the WRONG card. Silent by
  // nature — the click still resolves, it just resolves to the wrong thing — so it is checked here.
  for (const [name, owners] of meshOwners) {
    if (owners.length > 1) {
      errors.push(`mesh name "${name}" is claimed by more than one structure: ${owners.join(", ")}`);
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
