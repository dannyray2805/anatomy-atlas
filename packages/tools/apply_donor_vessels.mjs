// Fold the donors' blood-vasculature meshes into the published graph.
//
// The two donors' vessel trees are the same structures the Reference body's layer already names, so
// this MERGES rather than duplicates: a resolution row whose Uberon id an existing row already uses
// contributes its mesh names to that row (one row per structure, the convention the `kidney` row
// follows for its left and right meshes), and only a structure with no row gets a new one.
//
//   node incoming/apply_donor_vessels.mjs [--allow-reviewed]
//
// A row that is `reviewed: true` is reported and left alone unless --allow-reviewed is passed,
// because merging mesh names into it changes what it claims and what a click resolves.
//
// Idempotent: mesh names are unioned, and the source entry for these assets is added once.
import { readFileSync, writeFileSync } from "node:fs";

const RESOLUTION = process.argv[2] ?? "incoming/_donor-vessels-resolution.tsv";
const GRAPH = "content/published/structures.json";
const ASSET = "VH_M_Blood_Vasculature.glb, VH_F_Blood_Vasculature.glb";
const ALLOW_REVIEWED = process.argv.includes("--allow-reviewed");

const rows = [];
for (const line of readFileSync(RESOLUTION, "utf8").split(/\r?\n/)) {
  if (!line.trim()) continue;
  const [label, uberon, uberonLabel, meshes] = line.split("\t");
  if (!uberon) continue;
  rows.push({ label, uberon, uberonLabel, meshes: meshes.split(" ").filter(Boolean) });
}

const graph = JSON.parse(readFileSync(GRAPH, "utf8"));
const byUberon = new Map();
for (const row of graph) if (row.uberon) byUberon.set(row.uberon, row);

const idFor = (label) =>
  label
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function sourceEntry(uberonLabel, labels) {
  return {
    source_id: "hubmap-hra-glb",
    asset: ASSET,
    note: `This individual's own blood-vasculature model (v1.2), published in the HuBMAP CCF reference library. Mesh node(s) ${labels.join(" + ")} confirmed present with the app's own loader. Uberon id verified against OLS4 (label '${uberonLabel}', not obsolete).`
  };
}

const merged = [];
const created = [];
const refused = [];

for (const item of rows) {
  const existing = byUberon.get(item.uberon);
  if (existing) {
    if (existing.reviewed && !ALLOW_REVIEWED) {
      refused.push(`${existing.id} (uberon ${item.uberon}, reviewed)`);
      continue;
    }
    const before = new Set(existing.mesh_names ?? []);
    const added = item.meshes.filter((m) => !before.has(m));
    if (!added.length) continue;
    existing.mesh_names = [...new Set([...(existing.mesh_names ?? []), ...item.meshes])].sort();
    const declared = (existing.sources ?? []).some((s) => String(s.asset ?? "").includes("Blood_Vasculature"));
    if (!declared) {
      if (!existing.sources) existing.sources = [];
      existing.sources.push(sourceEntry(item.uberonLabel, added));
    }
    merged.push(`${existing.id}: +${added.length} mesh(es)`);
    continue;
  }

  const id = idFor(item.label);
  const row = {
    id,
    uberon: item.uberon,
    fma: null,
    label: item.label,
    layer: "vessel",
    part_of: "blood-vasculature",
    sources: [sourceEntry(item.uberonLabel, item.meshes)],
    voxel_size_um: null,
    hoa_dataset_doi: null,
    facts_id: null,
    reviewed: false,
    mesh_names: [...item.meshes].sort()
  };
  if (byUberon.has(item.uberon)) {
    refused.push(`${id} (uberon already used)`);
    continue;
  }
  graph.push(row);
  byUberon.set(item.uberon, row);
  created.push(`${id} (${item.uberon}, ${item.meshes.length} mesh(es))`);
}

writeFileSync(GRAPH, `${JSON.stringify(graph, null, 2)}\n`, "utf8");
console.log(`donor vessels: merged into ${merged.length} existing row(s), created ${created.length} new row(s)`);
console.log(`\ncreated:`);
for (const c of created) console.log(`  ${c}`);
console.log(`\nmerged:`);
for (const m of merged) console.log(`  ${m}`);
if (refused.length) console.log(`\nREFUSED (reviewed — pass --allow-reviewed to override):\n  ${refused.join("\n  ")}`);
console.log(`\ngraph rows: ${graph.length}`);
