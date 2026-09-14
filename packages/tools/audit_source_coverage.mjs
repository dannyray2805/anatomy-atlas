// Does every mesh name a row claims have a source that could have provided it?
//
// The prefix of a mesh name says which library it came from: the Visible Human assets name theirs
// `VH_M_`, `VH_F_`, `SBU_M_`, `NIH_M_`…, the Z-Anatomy body's own meshes carry no prefix, and the
// two shared contributed models use `Allen_` / `Yao_`. So a row that lists an unprefixed name but
// declares only a huBMAP source — or the reverse — is claiming a mesh nothing on the row accounts
// for. That is how `heart-left-ventricle` came to list a WOMAN's mesh while declaring no source for
// the female heart GLB.
//
// This reports; it does not fix, because which source entry is missing is a judgement.
import { readFileSync } from "node:fs";

const graph = JSON.parse(readFileSync("content/published/structures.json", "utf8"));

const Z_SOURCES = new Set(["z-anatomy", "bodyparts3d"]);
const VH_SOURCES = new Set(["hubmap-hra-glb", "hubmap-asctb-heart", "nlm-vhp-male"]);
const VH_PREFIX = /^(VH_M_|VH_F_|SBU_M_|SBU_F_|NIH_M_|NIH_F_|Allen_|Yao_)/;

/** Which sex's asset a mesh name came from: `VH_F_…` is the woman's, `Allen_`/`Yao_` are published
 *  for both sexes byte-identically, so they need the two of them. */
function sexOf(name) {
  if (/^(VH_F_|SBU_F_|NIH_F_)/.test(name)) return ["f"];
  if (/^(VH_M_|SBU_M_|NIH_M_)/.test(name)) return ["m"];
  if (/^(Allen_|Yao_)/.test(name)) return ["m", "f"];
  return [];
}

const gaps = [];
for (const row of graph) {
  const meshes = row.mesh_names ?? [];
  if (!meshes.length) continue;
  const sources = row.sources ?? [];
  const ids = new Set(sources.map((s) => s.source_id));
  // Fold punctuation so both naming styles register: the visible-human assets use underscores
  // (`VH_F_Liver.glb`) while the HRA ref-organ heart GLBs use hyphens (`3d-vh-f-heart.glb`).
  const assets = sources.map((s) => String(s.asset ?? "")).join(" ").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const hasZ = [...ids].some((i) => Z_SOURCES.has(i));
  const hasVh = [...ids].some((i) => VH_SOURCES.has(i));

  const zNames = meshes.filter((m) => !VH_PREFIX.test(m));
  const vhNames = meshes.filter((m) => VH_PREFIX.test(m));
  if (zNames.length && !hasZ) {
    gaps.push({ id: row.id, kind: "Z-Anatomy mesh, no Z-Anatomy source", names: zNames });
  }
  if (vhNames.length && !hasVh) {
    gaps.push({ id: row.id, kind: "visible-human mesh, no visible-human source", names: vhNames });
  }

  // A mesh name also says WHICH individual's asset has it, so a row naming a woman's mesh must
  // declare a source that names a female asset. This is the check the prefix rule alone missed on
  // `heart-left-ventricle`, which listed `VH_F_left_ventricle` while declaring only a male table.
  for (const sex of ["f", "m"]) {
    const names = vhNames.filter((n) => sexOf(n).includes(sex));
    if (!names.length) continue;
    const token = sex === "f" ? /_f_|_female/ : /_m_|_male/;
    if (!token.test(assets)) {
      gaps.push({
        id: row.id,
        kind: `names a ${sex === "f" ? "female" : "male"} mesh but no ${sex === "f" ? "female" : "male"} asset is declared`,
        names
      });
    }
  }
}

console.log(`${graph.length} rows, ${gaps.length} with an unaccounted-for mesh name`);
for (const g of gaps) {
  console.log(`  ${g.id.padEnd(26)} ${g.kind}`);
  console.log(`      ${g.names.slice(0, 6).join(", ")}${g.names.length > 6 ? ` … (${g.names.length})` : ""}`);
}
