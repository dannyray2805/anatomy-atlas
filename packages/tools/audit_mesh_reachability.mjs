// Is every published mesh name actually in the asset its row declares?
//
// This is the project's core data invariant, and until now it was only ever checked by hand, one
// batch at a time: `mesh_names` must hold the strings the app's loader reports, because a row whose
// name the loader never produces is dead on arrival — the mesh renders, the click resolves to
// nothing, and neither `pnpm validate` nor any test notices.
//
// Correctness note: a name does NOT have to be byte-identical to the file's node name. The app folds
// both sides (`structureLookup.normalizeMeshName` strips what the loader strips, and accepts the
// `_1`, `_2` … suffix a multi-primitive child gets), so `Pons.l`, `Kidneyl` and
// `Middle_lobar_bronchusr` all resolve. So does this check — and the names it can still catch are the
// ones normalisation cannot save, above all a name that has to be the MESH DATA name because the
// object had several primitives (`Femur.l` and `Femur.r` alike arrive as `Femur` + `Femur_1`, so a
// row listing `Femurl` resolves for nobody).
//
// Run after any batch that writes mesh names, from the repository root:
//   node packages/tools/audit_mesh_reachability.mjs
import { readFileSync } from "node:fs";
import { normalizeMeshName } from "../app/src/structureLookup.ts";

const GRAPH = "content/published/structures.json";

/** Which local loader dump proves which declared asset. Matched by FILE NAME, because rows name the
 *  asset in both the short form (`muscle-v3-draco.glb`) and the full R2 key
 *  (`z-anatomy/glb/muscle-v3-draco.glb`). */
const DUMPS = [
  ["visceral-v1-draco.glb", ["incoming/_visceral-owners.tsv"]],
  ["visceral-v1.glb", ["incoming/_visceral-owners.tsv"]],
  ["cardiovascular-v1-draco.glb", ["incoming/_vessel-owners.tsv"]],
  ["nervous-v1-draco.glb", ["incoming/_nerve-owners.tsv"]],
  ["joints-v1-draco.glb", ["incoming/_joints-owners.tsv"]],
  ["lymphoid-v1-draco.glb", ["incoming/_lymphoid-owners.tsv"]],
  ["skeleton-v2-draco.glb", ["incoming/_skeleton-owners.tsv"]],
  ["skeleton-v2.glb", ["incoming/_skeleton-owners.tsv"]],
  ["muscle-v3-draco.glb", ["incoming/_muscle-owners.tsv"]],
  ["muscle-v3.glb", ["incoming/_muscle-owners.tsv"]],
  ["3d-vh-m-heart.glb", ["incoming/_m-heart-owners.tsv"]],
  ["3d-vh-f-heart.glb", ["incoming/_f-heart-owners.tsv"]],
  // The donor vasculature assets were mapped before `dump_donor_meshes.mjs` existed, so they are not
  // in the donor name dumps and need their own entries. Without them `aorta-ascending` — the one row
  // that names them — reads as unreachable, which is what this audit is for the first time it ran.
  ["VH_M_Blood_Vasculature.glb", ["incoming/_m-vasculature.tsv"]],
  ["VH_F_Blood_Vasculature.glb", ["incoming/_f-vasculature.tsv"]]
];
const MALE_DUMP = "incoming/_male-mesh-names.txt";
const FEMALE_DUMP = "incoming/_female-mesh-names.txt";

const namesFromOwners = (path) => {
  const out = new Set();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [, meshes] = line.split("\t");
    for (const m of (meshes ?? "").split(" ").filter(Boolean)) out.add(normalizeMeshName(m));
  }
  return out;
};

/** file name -> the loader-reported mesh names of that file. */
const namesByDonorFile = (path) => {
  const out = new Map();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [file, name] = line.split("\t");
    if (!file || !name) continue;
    if (!out.has(file)) out.set(file, new Set());
    out.get(file).add(normalizeMeshName(name));
  }
  return out;
};

const male = namesByDonorFile(MALE_DUMP);
const female = namesByDonorFile(FEMALE_DUMP);
const maleAll = new Set([...male.values()].flatMap((s) => [...s]));
const femaleAll = new Set([...female.values()].flatMap((s) => [...s]));
const zDumps = new Map(DUMPS.map(([key, paths]) => [key, paths.map(namesFromOwners)]));

/** Every dump the declared assets imply, or null when this row cannot be verified here. */
function dumpsFor(row) {
  const sets = [];
  let matchedAsset = false;
  for (const source of row.sources ?? []) {
    const asset = String(source.asset ?? "");
    for (const [key, list] of zDumps) {
      if (asset.includes(key)) {
        sets.push(...list);
        matchedAsset = true;
      }
    }
    for (const file of asset.split(",").map((s) => s.trim())) {
      if (male.has(file)) {
        sets.push(male.get(file));
        matchedAsset = true;
      }
      if (female.has(file)) {
        sets.push(female.get(file));
        matchedAsset = true;
      }
    }
    // The visible-human male batch recorded its assets as that phrase rather than as file names.
    if (/visible human male organ set/i.test(asset)) {
      sets.push(maleAll);
      matchedAsset = true;
    }
    if (/VH_M_/i.test(asset) && /organ set|visible human male/i.test(asset)) sets.push(maleAll);
  }
  return matchedAsset ? sets : null;
}

const graph = JSON.parse(readFileSync(GRAPH, "utf8"));
const missing = [];
const unverifiable = [];
let checkedNames = 0;

for (const row of graph) {
  const names = row.mesh_names ?? [];
  if (!names.length) continue;
  const dumps = dumpsFor(row);
  if (!dumps) {
    unverifiable.push({ id: row.id, assets: (row.sources ?? []).map((s) => s.asset).join(" / ") });
    continue;
  }
  for (const name of names) {
    checkedNames++;
    const key = normalizeMeshName(name);
    // The app compares in the OTHER direction from the obvious one: the scene reports the child of a
    // multi-primitive mesh as `<mesh data name>_1`, and `meshNameMatches` strips that suffix off the
    // SCENE name before comparing. So a registered name is reachable when the dump holds the name
    // itself or any `_N` child of it.
    const reachable = dumps.some(
      (set) =>
        set.has(key) ||
        Array.from({ length: 9 }, (_, i) => `${key}_${i + 1}`).some((child) => set.has(child))
    );
    if (!reachable) missing.push({ id: row.id, name, key });
  }
}

console.log(`${graph.length} rows`);
console.log(`mesh names checked against a loader dump: ${checkedNames}`);
console.log(`not verifiable here (no dump for the declared asset): ${unverifiable.length} row(s)`);
for (const row of unverifiable) console.log(`    ${row.id}  <- ${row.assets}`);
console.log("");
if (missing.length === 0) {
  console.log("every published mesh name is one the loader really reports");
} else {
  console.log(`UNREACHABLE mesh names: ${missing.length}`);
  const byRow = new Map();
  for (const m of missing) {
    if (!byRow.has(m.id)) byRow.set(m.id, []);
    byRow.get(m.id).push(m);
  }
  for (const [id, list] of byRow) {
    console.log(`  ${id} (${list.length})`);
    for (const m of list.slice(0, 6)) console.log(`      ${JSON.stringify(m.name)}`);
    if (list.length > 6) console.log(`      … (${list.length})`);
  }
}
process.exitCode = missing.length ? 1 : 0;
