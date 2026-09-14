// Resolve the nervous-system layer's meshes to Uberon ids, accepting ONLY an exact label or an
// exact synonym of the term.
//
// The layer is Z-Anatomy's "Nervous system & Sense organs", so it carries the brain surface, the
// brainstem and cord, the cranial and peripheral nerves, and the eye. Its naming has three quirks
// this resolver has to handle mechanically:
//
//   1. the side is a `.l` / `.r` suffix on the raw node name, sometimes after a closing parenthesis
//      (`Abducens nerve (VI).l`), and 136 of the 541 objects have several primitives (so the label
//      is read from the RAW node name, where the dot still exists, never from the loader's string);
//   2. many objects carry a trailing `*` (`Anterior occipital sulcus*.l`), Z-Anatomy's own marker,
//      which is stripped — it is punctuation, not part of any anatomical name;
//   3. cranial nerves carry their Roman numeral in parentheses (`Trigeminal nerve (V)`), which Uberon
//      does not put in the label, so a second candidate without the parenthetical is tried.
//
// The id is only accepted when the term endpoint confirms the name — its canonical label or one of
// its exact synonyms. `related_synonyms` are ignored: they can be broader or narrower than the term.
import { readFileSync, writeFileSync } from "node:fs";

const GLB = "incoming/nervous-v1.glb";
const OWNERS = "incoming/_nerve-owners.tsv";
const GRAPH = "content/published/structures.json";
const OUT = "incoming/_nerve-resolution.tsv";
const EXCLUDED_OUT = "incoming/_nerve-excluded.tsv";

/**
 * The only things this layer cannot claim are names that are not structures at all.
 *
 * An earlier draft also excluded anything containing "part of" ("Opercular part of inferior frontal
 * gyrus") and the "proprius" names, on the reasoning that they are subdivisions rather than
 * structures. That was wrong in both directions: Uberon DOES name the opercular, orbital and
 * triangular parts of the inferior frontal gyrus, so the rule silently dropped mappable rows. The
 * gate is the right place for those judgements — an exact label or synonym match decides, and
 * anything else is reported.
 */
const EXCLUDE = [
  [/^\?+x?$/, "the node name in the asset is literally '????????' — the source name was lost before export"],
  [/^\s*$/, "the node name is empty"]
];

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Names Uberon spells differently. Each is a pure wording variant of the SAME structure, and the
 * alias is still only accepted when the term endpoint confirms the replacement as its own label or
 * an exact synonym — so a wrong guess simply does not resolve.
 */
const ALIASES = [
  // The source's own spelling; Uberon uses the double-m form.
  ["Mamillary body", "Mammillary body"],
  // In the CNS the source uses the older anterior/posterior wording where Uberon says ventral/dorsal.
  ["Anterior horn of spinal cord", "Ventral horn of spinal cord"],
  ["Anterior root of spinal nerve", "Ventral root of spinal cord"],
  ["Anterior spinothalamic tract", "Ventral spinothalamic tract"]
];

/** Candidate names, in order. All mechanical and reviewable. */
function candidatesFor(label) {
  const out = new Set();
  const add = (s) => {
    const t = s.replace(/\s+/g, " ").trim();
    if (t) out.add(t);
  };

  add(label);
  // "Trigeminal nerve (V)" -> "Trigeminal nerve"; also handles "(BVIII)" style lung/bronchus markers
  // and a bare " (VI)" suffix.
  add(label.replace(/\s*\([^)]*\)\s*$/, ""));
  // The parentheses are gone by this point, so the numeral must be stripped on its own: the asset's
  // `Abducens nerve (VI)` arrives here as "Abducens nerve VI" while Uberon's label is the bare name.
  // Only a trailing Roman numeral goes, and the result still has to match the term exactly.
  add(label.replace(/\s+[IVX]+\s*$/, ""));
  add(label.replace(/^The /i, ""));
  add(label.replace(/-/g, ""));

  const algebraic = [
    [/\bNerves\b/gi, "nerve"],
    [/\bBranches\b/gi, "branch"],
    [/\bRami\b/gi, "ramus"],
    [/\bPosterior\b/g, "posterior"],
    // Uberon prefers the "of" form for a few regions this layer names with a trailing qualifier.
    [/\bof foot\b/gi, "of pes"],
    [/\bof hand\b/gi, "of manus"]
  ];
  for (const base of [...out]) {
    for (const [re, replacement] of algebraic) {
      if (re.test(base)) add(base.replace(re, replacement));
    }
    for (const [from, to] of ALIASES) {
      if (base === from) add(to);
    }
    // A trailing side word the source writes as text rather than as a `.l`/`.r` suffix.
    add(base.replace(/\s+(left|right)$/i, ""));
  }
  return [...out];
}

// --- what the loader produced, and what the file called it ---------------------------------

const owners = new Map();
for (const line of readFileSync(OWNERS, "utf8").split(/\r?\n/)) {
  if (!line.trim()) continue;
  const [owner, meshes] = line.split("\t");
  owners.set(owner, meshes.split(" ").filter(Boolean));
}

const buf = readFileSync(GLB);
const gltf = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString("utf8"));
const rawBySanitisedNode = new Map();
for (const node of gltf.nodes) {
  if ((node.mesh ?? -1) < 0 || !node.name) continue;
  const sanitised = node.name.replace(/\s/g, "_").replace(/[[\].:/]/g, "");
  if (!rawBySanitisedNode.has(sanitised)) rawBySanitisedNode.set(sanitised, node.name);
}
/** Sanitised mesh-data name -> the name the file gave that mesh data. */
const rawBySanitisedMesh = new Map();
for (const mesh of gltf.meshes ?? []) {
  if (!mesh.name) continue;
  const sanitised = mesh.name.replace(/\s/g, "_").replace(/[[\].:/]/g, "");
  if (!rawBySanitisedMesh.has(sanitised)) rawBySanitisedMesh.set(sanitised, mesh.name);
}

const claimed = new Map();
for (const row of JSON.parse(readFileSync(GRAPH, "utf8"))) {
  for (const name of row.mesh_names ?? []) claimed.set(name, row.id);
}

/**
 * Group by the MESH a click reports, not by the object that owns it.
 *
 * For a multi-primitive object the loader names the group after the mesh-data block, and that block
 * can hold unrelated structures: the object `Ponsr` carries the pons AND the facial motor nucleus,
 * the abducens nucleus, the salivatory nuclei and the vestibular nuclei. Grouping by the owner put
 * all nine on the `pons` row, i.e. a click on the facial nucleus would have reported "Pons". The
 * child names are the anatomy, so they are what the labels come from; a name ending `_N` is folded
 * back onto its base, which is exactly the rule the app matches with.
 */
const groups = new Map();
const unresolvableOwners = [];
for (const [owner, meshes] of owners) {
  for (const mesh of meshes) {
    const key = mesh.replace(/_\d+$/, "");
    const raw = rawBySanitisedMesh.get(key) ?? rawBySanitisedNode.get(key);
    if (!raw) {
      unresolvableOwners.push(mesh);
      continue;
    }
    const bare = raw.replace(/\.(l|r)$/, "");
    const label = bare
      .replace(/_/g, " ")
      .replace(/[()]/g, "")
      .replace(/\*/g, " ")
      .replace(/['\u2019]+\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!groups.has(label)) {
      groups.set(label, { label, meshes: new Set(), rawNames: new Set(), sides: new Set(), starred: /\*/.test(bare) });
    }
    const group = groups.get(label);
    group.meshes.add(mesh);
    group.rawNames.add(raw);
    if (/\.(l|r)$/.test(raw)) group.sides.add(raw.slice(-1));
  }
}

console.log(`owners: ${owners.size}; labels: ${groups.size}`);
if (unresolvableOwners.length) console.log(`mesh names with no raw name found: ${unresolvableOwners.length} -> ${unresolvableOwners.slice(0, 6).join(", ")}`);
console.log(`labels present on both sides: ${[...groups.values()].filter((g) => g.sides.size === 2).length}`);
console.log(`labels carrying the source's '*' marker: ${[...groups.values()].filter((g) => g.starred).length}`);
console.log("");

const toResolve = [];
const excluded = [];
for (const group of groups.values()) {
  const already = [...group.meshes].filter((m) => claimed.has(m));
  if (already.length) {
    excluded.push({ label: group.label, reason: `already mapped to '${claimed.get(already[0])}'`, meshes: [...group.meshes].sort() });
    continue;
  }
  const reason = EXCLUDE.find(([re]) => re.test(group.label));
  if (reason) excluded.push({ label: group.label, reason: reason[1], meshes: [...group.meshes].sort() });
  else toResolve.push({ ...group, meshes: [...group.meshes].sort() });
}

const accounted = new Set([...toResolve, ...excluded].flatMap((g) => g.meshes));
const orphans = [...new Set([...owners.values()].flat())].filter((n) => !accounted.has(n));
console.log(`to resolve ${toResolve.length}, excluded ${excluded.length}`);
console.log(`Mesh objects: ${new Set([...owners.values()].flat()).size}, accounted for ${accounted.size}, orphaned ${orphans.length}${orphans.length ? " -> " + orphans.slice(0, 6).join(", ") : ""}`);
console.log("");

// --- resolve ------------------------------------------------------------------------------

const search = async (q) => {
  const res = await fetch(
    `https://www.ebi.ac.uk/ols4/api/search?q=${encodeURIComponent(q)}&ontology=uberon&rows=30`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`OLS ${res.status}`);
  const json = await res.json();
  // Scan the WHOLE returned window. A 10-hit window silently dropped real matches: `Lateral
  // ventricle` and `Lens` both have an exact synonym sitting just outside it, and were reported
  // unresolved because of the cut, not because the ontology lacks them.
  return (json?.response?.docs ?? []).filter((d) => !d.is_obsolete);
};

const terms = new Map();
const fetchTerm = async (id) => {
  if (terms.has(id)) return terms.get(id);
  const iri = `http://purl.obolibrary.org/obo/${id.replace(":", "_")}`;
  const res = await fetch(`https://www.ebi.ac.uk/ols4/api/terms?iri=${encodeURIComponent(iri)}`, {
    headers: { Accept: "application/json" }
  });
  if (!res.ok) throw new Error(`OLS term ${res.status}`);
  const json = await res.json();
  const term = json?._embedded?.terms?.[0];
  const value = term ? { label: term.label ?? "", synonyms: term.synonyms ?? [] } : null;
  terms.set(id, value);
  return value;
};

function matchInDocs(docs, candidate) {
  const want = norm(candidate);
  for (const doc of docs) {
    if (norm(doc.label ?? "") === want) return { id: doc.obo_id, on: "label", value: doc.label };
  }
  for (const doc of docs) {
    const syn = (doc.exact_synonyms ?? []).find((s) => norm(s) === want);
    if (syn) return { id: doc.obo_id, on: "synonym", value: syn };
  }
  return null;
}

async function confirm(proposal, candidate) {
  const term = await fetchTerm(proposal.id);
  if (!term) return null;
  const want = norm(candidate);
  if (norm(term.label) === want) return { id: proposal.id, label: term.label, on: "label", value: term.label };
  const syn = term.synonyms.find((s) => norm(s) === want);
  if (syn) return { id: proposal.id, label: term.label, on: "synonym", value: syn };
  return null;
}

const rows = [];
let cursor = 0;
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (cursor < toResolve.length) {
      const item = toResolve[cursor++];
      const candidates = candidatesFor(item.label);
      let hit = null;
      let matchedBy = "";
      let error = "";
      try {
        for (const candidate of candidates) {
          const proposal = matchInDocs(await search(candidate), candidate);
          if (!proposal) continue;
          const found = await confirm(proposal, candidate);
          if (found) {
            hit = found;
            matchedBy = candidate;
            break;
          }
        }
      } catch (e) {
        error = e.message;
      }
      rows.push({ ...item, hit, matchedBy, error });
    }
  })
);

rows.sort((a, b) => a.label.localeCompare(b.label));
const resolved = rows.filter((r) => r.hit);
const failed = rows.filter((r) => !r.hit);
const viaRename = resolved.filter((r) => norm(r.matchedBy) !== norm(r.label));
const viaSynonym = resolved.filter((r) => r.hit.on === "synonym");

console.log(`RESOLVED ${resolved.length}/${rows.length}`);
console.log(`  matched on the term's own label: ${resolved.length - viaSynonym.length}`);
console.log(`  matched on an exact synonym: ${viaSynonym.length}`);
console.log(`  needed a rename: ${viaRename.length}`);
console.log("");
console.log("UNRESOLVED — each needs a human decision, so none is written:");
for (const r of failed) console.log(`  ${r.label}${r.error ? `   [${r.error}]` : ""}`);
console.log("");
console.log("matched by SYNONYM — read each one; UBERON's own name is on the right:");
for (const r of viaSynonym) {
  console.log(`  ${r.label.padEnd(52)} -> ${(r.hit.id ?? "").padEnd(16)} "${r.hit.label}"  [synonym "${r.hit.value}"]`);
}
console.log("");
console.log("resolved by renaming (review these):");
for (const r of viaRename) console.log(`  ${r.label.padEnd(56)} -> ${(r.hit.id ?? "").padEnd(16)} "${r.hit.label}"`);

const seen = new Map();
for (const r of rows) {
  for (const m of r.meshes) {
    if (seen.has(m) && seen.get(m) !== r.label) console.log(`COLLISION: mesh ${m} claimed by '${seen.get(m)}' and '${r.label}'`);
    seen.set(m, r.label);
  }
}
const byTerm = new Map();
for (const r of resolved) {
  if (!byTerm.has(r.hit.id)) byTerm.set(r.hit.id, []);
  byTerm.get(r.hit.id).push(r.label);
}
for (const [id, labels] of byTerm) {
  if (labels.length > 1) console.log(`SAME TERM: ${id} <- ${labels.join(" | ")}`);
}

writeFileSync(OUT, rows.map((r) => [r.label, r.hit?.id ?? "", r.hit?.label ?? "", r.meshes.join(" ")].join("\t")).join("\n") + "\n", "utf8");
writeFileSync(EXCLUDED_OUT, excluded.map((g) => [g.label, g.reason, g.meshes.join(" ")].join("\t")).join("\n") + "\n", "utf8");
console.log(`\nwrote ${OUT} and ${EXCLUDED_OUT}`);
