// What a layer actually contains, measured before any mapping is designed.
//
// `node packages/tools/analyse_layer_names.mjs <owners.tsv>`, where the owners file came from
// dump_layer_meshes.mjs. It prints the vocabulary (so conventions
// come from the data rather than from memory), which nodes a published row ALREADY claims (mapping
// those twice would put one mesh name on two rows — a validator error), and the full label list.
import { readFileSync } from "node:fs";

const [ownersPath] = process.argv.slice(2);
if (!ownersPath) {
  console.error("usage: node incoming/analyse_layer_names.mjs <owners.tsv>");
  process.exit(2);
}
const GRAPH = "content/published/structures.json";

const graph = JSON.parse(readFileSync(GRAPH, "utf8"));
const claimed = new Map();
for (const row of graph) for (const name of row.mesh_names ?? []) claimed.set(name, row.id);

const owners = [];
for (const line of readFileSync(ownersPath, "utf8").split(/\r?\n/)) {
  if (!line.trim()) continue;
  const [owner, meshes] = line.split("\t");
  owners.push({ owner, meshes: meshes.split(" ").filter(Boolean) });
}

/** "(Abducens_nerve_(VI))l" -> "Abducens nerve (VI)"; a raw node name keeps its `.l`/`.r` dot, but
 *  the dump's owner names are already sanitised, so side markers are read from the raw name in the
 *  resolvers. Here the label is only for reading the vocabulary. */
function labelOf(owner) {
  return owner
    .replace(/_/g, " ")
    .replace(/[()]/g, (m) => (m === "(" ? "" : ""))
    .replace(/\s+(l|r)$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

const labels = new Map();
for (const { owner, meshes } of owners) {
  const label = labelOf(owner);
  if (!labels.has(label)) labels.set(label, new Set());
  for (const m of meshes) labels.get(label).add(m);
}

const allMeshes = new Set(owners.flatMap((o) => o.meshes));
console.log(`mesh objects: ${allMeshes.size} in ${owners.length} nodes`);
console.log(`distinct labels: ${labels.size}`);
console.log(`nodes with several primitives: ${owners.filter((o) => o.meshes.length > 1).length}`);
console.log("");

const already = [];
const fresh = [];
for (const [label, meshes] of labels) {
  ([...meshes].some((m) => claimed.has(m)) ? already : fresh).push(label);
}
console.log(`already claimed by a published row: ${already.length}`);
if (already.length) console.log(`  ${already.slice(0, 20).join(", ")}${already.length > 20 ? ` … (${already.length})` : ""}`);
console.log(`to consider: ${fresh.length}`);
console.log("");

const tail = new Map();
for (const label of fresh) {
  const words = label.toLowerCase().replace(/^the /, "").split(" ");
  const last = words[words.length - 1];
  tail.set(last, (tail.get(last) ?? 0) + 1);
}
console.log("last word histogram (top 20):");
for (const [word, n] of [...tail.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(`  ${String(n).padStart(4)}  ${word}`);
}
console.log("");

const odd = fresh.filter((l) => /[^A-Za-z0-9 ,.'()\-\/]/.test(l));
console.log(`labels with unusual characters: ${odd.length}`);
for (const l of odd.slice(0, 12)) console.log(`  ${JSON.stringify(l)}  codes: ${[...l].slice(0, 12).map((c) => c.charCodeAt(0)).join(",")}`);
console.log("");
console.log("all labels (sorted):");
for (const l of fresh.slice().sort((a, b) => a.localeCompare(b))) console.log(`  ${l}`);
