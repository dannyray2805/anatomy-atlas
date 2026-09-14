// Add a resolved layer to the published graph. Generic: works for any layer whose rows were
// produced by a resolve_*.mjs run.
//
//   node incoming/apply_layer_mappings.mjs <resolution.tsv> <layer> <parentId> <assetLabel>
//
// The resolution file is `label \t uberon \t uberonLabel \t mesh names`. Every id in it was
// accepted only on an exact Uberon label match (see resolve_muscles.mjs / resolve_skeleton.mjs), and
// every mesh name came from a real loader dump, because mesh_names must hold the strings the app
// compares against.
//
// Idempotent: a row with the target id is replaced in place, so re-running cannot duplicate rows
// or mesh names.
import { readFileSync, writeFileSync } from "node:fs";

const [resolutionPath, layer, parentId, assetLabel] = process.argv.slice(2);
if (!resolutionPath || !layer || !parentId || !assetLabel) {
  console.error("usage: node incoming/apply_layer_mappings.mjs <resolution.tsv> <layer> <parentId> <assetLabel>");
  process.exit(2);
}

const GRAPH = "content/published/structures.json";
const SOURCE_ID = "z-anatomy";

function idFor(label) {
  return label
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const graph = JSON.parse(readFileSync(GRAPH, "utf8"));
const byId = new Map(graph.map((row) => [row.id, row]));

const resolution = readFileSync(resolutionPath, "utf8")
  .split(/\r?\n/)
  .filter((line) => line.trim())
  .map((line) => {
    const [label, uberon, uberonLabel, meshes] = line.split("\t");
    return { label, uberon, uberonLabel, meshes: meshes.split(" ").filter(Boolean) };
  })
  .filter((row) => row.uberon);

const added = [];
const updated = [];
const refused = [];
for (const item of resolution) {
  const id = idFor(item.label);
  const existing = byId.get(id);
  // An existing row that is REVIEWED belongs to a batch someone accepted. Replacing it wholesale
  // would silently drop its facts_id and reset reviewed to false — so it is reported and left alone
  // unless the caller passes --replace-reviewed.
  if (existing?.reviewed && !process.argv.includes("--replace-reviewed")) {
    refused.push(`${id} (reviewed: ${existing.reviewed}, facts_id: ${existing.facts_id ?? "none"})`);
    continue;
  }
  const differs = item.uberonLabel && item.uberonLabel.toLowerCase() !== item.label.toLowerCase();
  const note = [
    `Mesh node(s) confirmed present in the shipped ${layer} GLB (R2 ${assetLabel}) with the app's own loader.`,
    differs
      ? `UBERON's own label is '${item.uberonLabel}'; id verified against OLS4 (not obsolete).`
      : `Uberon id verified against OLS4 (label '${item.uberonLabel}', not obsolete).`
  ].join(" ");

  const row = {
    id,
    uberon: item.uberon,
    fma: null,
    label: item.label,
    layer,
    part_of: parentId,
    sources: [{ source_id: SOURCE_ID, asset: assetLabel, note }],
    voxel_size_um: null,
    hoa_dataset_doi: null,
    facts_id: null,
    reviewed: false,
    mesh_names: [...item.meshes].sort()
  };

  if (existing) {
    updated.push(id);
    Object.assign(existing, row);
  } else {
    added.push(id);
    graph.push(row);
    byId.set(id, row);
  }
}

writeFileSync(GRAPH, `${JSON.stringify(graph, null, 2)}\n`, "utf8");

const meshCount = new Set(resolution.flatMap((r) => r.meshes)).size;
console.log(`layer ${layer}: added ${added.length} row(s), updated ${updated.length}, covering ${meshCount} loader mesh name(s)`);
console.log(`graph rows: ${graph.length}`);
if (updated.length) console.log(`updated: ${updated.join(", ")}`);
if (refused.length) console.log(`REFUSED (reviewed row — pass --replace-reviewed to override): ${refused.join(", ")}`);
