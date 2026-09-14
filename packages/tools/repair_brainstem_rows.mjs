// Repair the three brainstem rows the nerve pass had to overwrite.
//
// Why they needed overwriting: their mesh names were written from the FILE's node names
// (`Midbrain.l`), and the loader reports `Midbrainl` — so those three rows resolved for nobody while
// claiming to be mapped. The generic apply writes a row wholesale, which would have dropped their
// `facts_id` and reset `reviewed` to false, so this restores both and writes a note that keeps what
// the original said, corrected.
//
// Idempotent: sets the same values every run.
import { readFileSync, writeFileSync } from "node:fs";

const GRAPH = "content/published/structures.json";

const REPAIRS = [
  {
    id: "midbrain",
    meshes: ["Midbrainl", "Midbrainr"],
    note: "Mesh nodes 'Midbrainl' and 'Midbrainr' confirmed present in the shipped nervous-system GLB (R2 nervous-v1-draco.glb) with the app's own loader. The list previously read 'Midbrain.l' / 'Midbrain.r' — the file's own spelling, which the loader never reports (it strips the dot), so these meshes resolved for nobody. This source carries the brain as its named parts, not as one whole-brain mesh. Uberon id verified against OLS4 (label 'midbrain', not obsolete)."
  },
  {
    id: "pons",
    meshes: ["Ponsl", "Ponsr"],
    note: "Mesh nodes 'Ponsl' and 'Ponsr' confirmed present in the shipped nervous-system GLB with the app's own loader (previously written 'Pons.l' / 'Pons.r', which the loader never reports). The nuclei this source groups under the pons object — facial motor, abducens, salivatory and vestibular — are separate meshes and are mapped as their own rows rather than being claimed here. Uberon id verified against OLS4 (label 'pons', not obsolete)."
  },
  {
    id: "medulla-oblongata",
    meshes: ["Medulla_oblongatal", "Medulla_oblongatar"],
    note: "Mesh nodes 'Medulla_oblongatal' and 'Medulla_oblongatar' confirmed present in the shipped nervous-system GLB with the app's own loader (previously written 'Medulla oblongata.l' / '.r', which the loader never reports). The pyramids of the medulla are separate meshes and are their own row (pyramid-of-medulla-oblongata). Uberon id verified against OLS4 (label 'medulla oblongata', not obsolete)."
  }
];

const graph = JSON.parse(readFileSync(GRAPH, "utf8"));
const byId = new Map(graph.map((row) => [row.id, row]));
const problems = [];

for (const repair of REPAIRS) {
  const row = byId.get(repair.id);
  if (!row) {
    problems.push(`${repair.id} is missing from the graph`);
    continue;
  }
  if (!row.sources?.length) problems.push(`${repair.id} has no source entry`);
  row.mesh_names = [...repair.meshes].sort();
  row.facts_id = repair.id;
  row.reviewed = true;
  row.sources[0].note = repair.note;
}

if (problems.length) {
  console.error("cannot repair:");
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

writeFileSync(GRAPH, `${JSON.stringify(graph, null, 2)}\n`, "utf8");
console.log(`repaired ${REPAIRS.length} brainstem row(s): facts_id and reviewed restored, mesh names corrected`);
for (const r of REPAIRS) console.log(`  ${r.id}: ${r.meshes.join(", ")}`);
