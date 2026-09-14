// Resolve the joint layer's meshes to Uberon ids, accepting ONLY an exact label or an exact synonym.
//
// Z-Anatomy's "Joints" collection is the periarticular structures: capsules, ligaments, menisci,
// labra and a few bursae and discs. Its names are conventional anatomical ones ("Anterior cruciate
// ligament", "Acetabular labrum"), so the gate does most of the work; the conventions below only
// bring the asset's wording into line (plurals, the source's hyphens, a trailing side letter).
//
// Labels are grouped by THE MESH A CLICK REPORTS rather than by the object that owns it, for the
// reason recorded on the nervous-system pass: the loader names a multi-primitive object after the
// mesh-data block, and that block can hold more than one structure.
import { readFileSync, writeFileSync } from "node:fs";

const GLB = "incoming/joints-v1.glb";
const OWNERS = "incoming/_joints-owners.tsv";
const GRAPH = "content/published/structures.json";
const OUT = "incoming/_joints-resolution.tsv";
const EXCLUDED_OUT = "incoming/_joints-excluded.tsv";

/** The only things this layer cannot claim are names that are not structures at all. */
const EXCLUDE = [
  [/^\?+x?$/, "the node name in the asset is literally '????????' — the source name was lost before export"],
  [/^\s*$/, "the node name is empty"]
];

/**
 * Names Uberon spells differently. Each is a wording variant of the SAME structure, and the alias is
 * only accepted when the term endpoint confirms the replacement as its own label or exact synonym.
 */
const ALIASES = [
  // The source hyphenates it; Uberon writes "sacroiliac".
  ["Sacro-iliac", "Sacroiliac"],
  ["sacro-iliac", "sacroiliac"]
];

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function candidatesFor(label) {
  const out = new Set();
  const add = (s) => {
    const t = s.replace(/\s+/g, " ").trim();
    if (t) out.add(t);
  };

  add(label);
  add(label.replace(/^The /i, ""));
  add(label.replace(/-/g, ""));

  const algebraic = [
    [/\bLigaments\b/gi, "ligament"],
    [/\bMeniscus\b/gi, "meniscus"],
    [/\bCapsules\b/gi, "capsule"],
    [/\bBursae\b/gi, "bursa"],
    [/\bDiscs\b/gi, "disc"],
    [/\bof foot\b/gi, "of pes"],
    [/\bof hand\b/gi, "of manus"]
  ];
  for (const base of [...out]) {
    for (const [re, replacement] of algebraic) {
      if (re.test(base)) add(base.replace(re, replacement));
    }
    for (const [from, to] of ALIASES) {
      if (base.includes(from)) add(base.replace(from, to));
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

const groups = new Map();
const unresolvedOwners = [];
for (const [owner, meshes] of owners) {
  for (const mesh of meshes) {
    const key = mesh.replace(/_\d+$/, "");
    const raw = rawBySanitisedMesh.get(key) ?? rawBySanitisedNode.get(key);
    if (!raw) {
      unresolvedOwners.push(mesh);
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
      groups.set(label, { label, meshes: new Set(), rawNames: new Set(), sides: new Set() });
    }
    const group = groups.get(label);
    group.meshes.add(mesh);
    group.rawNames.add(raw);
    if (/\.(l|r)$/.test(raw)) group.sides.add(raw.slice(-1));
  }
}

console.log(`owners: ${owners.size}; labels: ${groups.size}`);
if (unresolvedOwners.length) console.log(`mesh names with no raw name found: ${unresolvedOwners.length}`);
console.log(`labels present on both sides: ${[...groups.values()].filter((g) => g.sides.size === 2).length}`);
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

/**
 * The third acceptance route, and the only one that is not a string equality: Uberon qualifies many
 * periarticular structures by the joint they belong to, so the asset's `Anterior cruciate ligament`
 * is `anterior cruciate ligament of knee joint` there. This route accepts such a term ONLY when
 *  - its label is the asset's name followed by ` of …` (the qualifier is additive, never a different
 *    structure's name), and
 *  - EXACTLY ONE non-obsolete Uberon term matches that way, so an ambiguous name is refused rather
 *    than decided here.
 * Every acceptance it makes is printed with the qualifier it relied on, so the list can be read.
 */
async function qualifiedMatch(docs, candidate) {
  const want = norm(candidate);
  const hits = [];
  for (const doc of docs.slice(0, 12)) {
    const term = await fetchTerm(doc.obo_id);
    if (!term?.label) continue;
    if (norm(term.label).startsWith(`${want} of `)) hits.push({ id: doc.obo_id, label: term.label });
  }
  if (hits.length !== 1) return null;
  return { id: hits[0].id, label: hits[0].label, on: "qualified", value: hits[0].label };
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
          const docs = await search(candidate);
          const proposal = matchInDocs(docs, candidate);
          const found = proposal ? await confirm(proposal, candidate) : await qualifiedMatch(docs, candidate);
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
const viaQualified = resolved.filter((r) => r.hit.on === "qualified");

console.log(`RESOLVED ${resolved.length}/${rows.length}`);
console.log(`  matched on the term's own label: ${resolved.filter((r) => r.hit.on === "label").length}`);
console.log(`  matched on an exact synonym: ${viaSynonym.length}`);
console.log(`  matched on a joint-qualified label (the third route): ${viaQualified.length}`);
console.log(`  needed a rename: ${viaRename.length}`);
console.log("");
console.log("UNRESOLVED — each needs a human decision, so none is written:");
for (const r of failed) console.log(`  ${r.label}${r.error ? `   [${r.error}]` : ""}`);
console.log("");
console.log("accepted on a JOINT-QUALIFIED label — read each one; the qualifier is Uberon's, not mine:");
for (const r of viaQualified) {
  console.log(`  ${r.label.padEnd(52)} -> ${(r.hit.id ?? "").padEnd(16)} "${r.hit.label}"`);
}
console.log("");
console.log("matched by SYNONYM — read each one:");
for (const r of viaSynonym) {
  console.log(`  ${r.label.padEnd(56)} -> ${(r.hit.id ?? "").padEnd(16)} "${r.hit.label}"  [synonym "${r.hit.value}"]`);
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
