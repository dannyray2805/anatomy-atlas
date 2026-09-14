// Resolve the blood-vessel layer to Uberon ids, accepting ONLY an exact label match.
//
// The cardiovascular GLB names every vessel as its own object, with the side attached as a `.l` /
// `.r` suffix and, for names Z-Anatomy has not formally verified, wrapped in parentheses. So this
// reads the labels from the GLB's own node names rather than from the loader's sanitised strings:
// the sanitised form has already lost the dot, and guessing sidedness from a trailing letter would
// have to decide whether a name like "Cerebellar" ends in a side marker.
//
// Accepting only an exact match — on the Uberon label OR one of its exact synonyms — is the same
// gate the skeleton and muscle passes used, and it is what keeps a plausible-but-wrong id out: e.g.
// a "M1-segment" of the middle cerebral artery must NOT resolve to the whole artery, so no candidate
// ever strips a segment marker.
//
// The synonym half of that gate was added in this pass, after it produced an obvious false negative:
// UBERON's label for the human superior vena cava is "anterior vena cava" (UBERON:0001585) with
// "superior vena cava" among its synonyms. The search API returns those as `exact_synonyms` on the
// hit — an earlier note in this project claimed the API returns no synonyms at all, which was wrong:
// the field is `exact_synonyms`, not `synonym`. Only EXACT synonyms are accepted; `related_synonyms`
// are deliberately ignored because they can be broader or narrower than the term.
//
// Reported, never guessed: a label that needs a judgement beyond these mechanical transforms is
// left unmapped and printed, and anything in the layer that is not a single named blood vessel
// (heart valves, anastomoses, plexuses, bifurcations) is excluded with its own reason.
import { readFileSync, writeFileSync } from "node:fs";

const GLB = "incoming/cardiovascular-v1.glb";
const OWNERS = "incoming/_vessel-owners.tsv";
const GRAPH = "content/published/structures.json";
const OUT = "incoming/_vessel-resolution.tsv";
const EXCLUDED_OUT = "incoming/_vessel-excluded.tsv";

/** Not a single named blood vessel, so it is not a structure this layer can claim. */
const EXCLUDE = [
  [
    /\bvalve\b|\bleaflet\b/i,
    "part of the heart (a valve or one of its leaflets), not a blood vessel — belongs with the heart, so it is not claimed here"
  ],
  [
    /anastomosis|plexus|bifurcation/i,
    "an anastomosis, plexus or bifurcation — a confluence of vessels, not a single named one"
  ],
  [/^Branch to /i, "a named cerebral branch to a gyrus, with no vessel identity of its own"],
  [/^\?+x?$/, "the node name in the asset is literally '????????' — the source name was lost before export"]
];

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Candidate names to try, in order. All mechanical, all reviewable:
 *  1. the asset's own wording, and the same with a leading "The" removed;
 *  2. plurals brought to the singular Uberon labels ("Lumbar veins" -> "lumbar vein");
 *  3. hyphens folded out, which is how Uberon writes "hemiazygos" and "infraorbital";
 *  4. region vocabulary Uberon prefers (foot -> pes, hand -> manus);
 *  5. a short, explicit table of names Uberon spells differently (British "coeliac" and the two
 *     "trunk" names Uberon files as arteries).
 */
const HYPHEN_FOLDED = (s) => s.replace(/-/g, "");

const ALIASES = [
  ["Brachiocephalic trunk", "Brachiocephalic artery"],
  ["Coeliac trunk", "Celiac artery"],
  ["Coeliac artery", "Celiac artery"],
  ["Hemi-azygos vein", "Hemiazygos vein"],
  ["Accessory hemi-azygos vein", "Accessory hemiazygos vein"],
  // The asset means the adult arch of the aorta. Its own wording is also an exact synonym of the
  // EMBRYONIC pharyngeal arch artery, so this alias names the adult structure explicitly; the
  // embryonic term is refused in REJECT below.
  ["Aortic arch", "Arch of aorta"],
  // Word order only: UBERON says "humeral circumflex", the asset says "circumflex humeral".
  ["Anterior circumflex humeral artery", "Anterior humeral circumflex artery"],
  ["Anterior circumflex humeral vein", "Anterior humeral circumflex vein"],
  ["Posterior circumflex humeral artery", "Posterior humeral circumflex artery"],
  ["Posterior circumflex humeral vein", "Posterior humeral circumflex vein"]
];

/**
 * Terms the exact-synonym gate would accept that are a DIFFERENT structure.
 *
 * UBERON's synonymy is historical and sometimes reflects embryology or comparative anatomy rather
 * than the adult human body the asset depicts, so a synonym match still needs a human decision.
 * Each entry is label -> the id to refuse -> why, and every refusal is printed on every run.
 */
const REJECT = [
  [
    "Aortic arch",
    "UBERON:0004363",
    "UBERON:0004363 is the pharyngeal arch artery — the EMBRYONIC arch artery, which carries 'aortic arch' as a synonym from embryology. This mesh is the adult arch of the aorta (UBERON:0001508)."
  ],
  [
    "Medial plantar veins",
    "UBERON:0006144",
    "UBERON:0006144 is the medial plantar DIGITAL vein, a vein of the toes; these meshes accompany the medial plantar artery in the sole. A shared synonym is not enough to call those one vessel."
  ]
];

function candidatesFor(label) {
  const out = new Set();
  const add = (s) => {
    const t = s.replace(/\s+/g, " ").trim();
    if (t) out.add(t);
  };

  add(label);
  add(label.replace(/^The /i, ""));
  add(HYPHEN_FOLDED(label));

  const algebraic = [
    [/\bArteries\b/gi, "artery"],
    [/\bVeins\b/gi, "vein"],
    [/\bBranches\b/gi, "branch"],
    [/\bof foot\b/gi, "of pes"],
    [/\bof hand\b/gi, "of manus"],
    [/\bof the foot\b/gi, "of pes"],
    [/\bof the hand\b/gi, "of manus"]
  ];
  for (const base of [...out]) {
    for (const [re, replacement] of algebraic) {
      if (re.test(base)) add(base.replace(re, replacement));
    }
    for (const [from, to] of ALIASES) {
      if (new RegExp(`\\b${from}\\b`, "i").test(base)) add(base.replace(new RegExp(from, "i"), to));
    }
  }
  return [...out];
}

// --- what the loader produced, and what the file called it -------------------------------

const owners = new Map();
for (const line of readFileSync(OWNERS, "utf8").split(/\r?\n/)) {
  if (!line.trim()) continue;
  const [owner, meshes] = line.split("\t");
  owners.set(owner, meshes.split(" ").filter(Boolean));
}

const buf = readFileSync(GLB);
const gltf = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString("utf8"));
const rawBySanitised = new Map();
for (const node of gltf.nodes) {
  if ((node.mesh ?? -1) < 0 || !node.name) continue;
  const sanitised = node.name.replace(/\s/g, "_").replace(/[[\].:/]/g, "");
  if (!rawBySanitised.has(sanitised)) rawBySanitised.set(sanitised, node.name);
}

/** The mesh names a published row already claims — those must not be claimed twice. */
const claimedMeshes = new Map();
for (const row of JSON.parse(readFileSync(GRAPH, "utf8"))) {
  for (const name of row.mesh_names ?? []) claimedMeshes.set(name, row.id);
}

const groups = new Map();
const noRawName = [];
for (const [owner, meshes] of owners) {
  const raw = rawBySanitised.get(owner);
  if (!raw) {
    noRawName.push(owner);
    continue;
  }
  const sided = /\.(l|r)$/.test(raw);
  const bare = raw.replace(/\.(l|r)$/, "");
  const parenthesised = /[()]/.test(bare);
  const label = bare.replace(/_/g, " ").replace(/[()]/g, "").replace(/\s+/g, " ").trim();
  if (!groups.has(label)) groups.set(label, { label, meshes: new Set(), rawNames: new Set(), sides: new Set(), parenthesised });
  const group = groups.get(label);
  for (const m of meshes) group.meshes.add(m);
  group.rawNames.add(raw);
  if (sided) group.sides.add(raw.slice(-1));
  group.parenthesised = group.parenthesised || parenthesised;
}

console.log(`owners: ${owners.size}; labels: ${groups.size}`);
if (noRawName.length) console.log(`owners with no matching raw node name: ${noRawName.length} -> ${noRawName.slice(0, 8).join(", ")}`);
const bothSides = [...groups.values()].filter((g) => g.sides.size === 2).length;
console.log(`labels present on both sides (one row, two mesh names): ${bothSides}`);
console.log("");

const toResolve = [];
const excluded = [];
for (const group of groups.values()) {
  const already = [...group.meshes].filter((m) => claimedMeshes.has(m));
  if (already.length) {
    excluded.push({
      label: group.label,
      reason: `already mapped to '${claimedMeshes.get(already[0])}'`,
      meshes: [...group.meshes].sort()
    });
    continue;
  }
  const reason = EXCLUDE.find(([re]) => re.test(group.label));
  if (reason) excluded.push({ label: group.label, reason: reason[1], meshes: [...group.meshes].sort() });
  else toResolve.push({ ...group, meshes: [...group.meshes].sort() });
}

const claimedByLabels = new Set([...toResolve, ...excluded].flatMap((g) => g.meshes));
const orphans = [...new Set([...owners.values()].flat())].filter((n) => !claimedByLabels.has(n));
console.log(`to resolve ${toResolve.length}, excluded ${excluded.length}`);
console.log(`Mesh objects: ${new Set([...owners.values()].flat()).size}, accounted for ${claimedByLabels.size}, orphaned ${orphans.length}${orphans.length ? " -> " + orphans.slice(0, 8).join(", ") : ""}`);
console.log("");

// --- resolve ------------------------------------------------------------------------------

const search = async (q) => {
  const res = await fetch(
    `https://www.ebi.ac.uk/ols4/api/search?q=${encodeURIComponent(q)}&ontology=uberon&rows=20`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`OLS ${res.status}`);
  const json = await res.json();
  return (json?.response?.docs ?? []).filter((d) => !d.is_obsolete).slice(0, 10);
};

/**
 * The authoritative term — canonical label AND synonyms — fetched by id.
 *
 * The search index is only ever used to PROPOSE ids, because its own `label` field can disagree with
 * the term: measured, it calls UBERON:0010408 "ocular angle artery" while the term's label is
 * "Angular artery", and it called UBERON:0006198 "dorsal intercostal artery" while the term's label
 * is "Supreme intercostal artery". A note written from the search wording would be false, so every
 * label that reaches the graph comes from here, and every acceptance is confirmed here too.
 */
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

/** A match found in the search results: the id to try, and which string matched. */
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

/**
 * Confirm the proposal against the term itself, and return the canonical label to record.
 * A proposal the term does not confirm is dropped rather than trusted.
 */
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
      let rejected = null;
      let error = "";
      try {
        for (const candidate of candidates) {
          const proposal = matchInDocs(await search(candidate), candidate);
          if (!proposal) continue;
          const refused = REJECT.find(([label, id]) => norm(label) === norm(item.label) && id === proposal.id);
          if (refused) {
            rejected = { id: proposal.id, why: refused[2] };
            continue;
          }
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
      rows.push({ ...item, hit, matchedBy, rejected, error });
    }
  })
);

rows.sort((a, b) => a.label.localeCompare(b.label));
const resolved = rows.filter((r) => r.hit);
const failed = rows.filter((r) => !r.hit);
const viaRename = resolved.filter((r) => norm(r.matchedBy) !== norm(r.label));
const viaSynonym = resolved.filter((r) => r.hit.on === "synonym");
const refused = rows.filter((r) => r.rejected);

console.log(`RESOLVED ${resolved.length}/${rows.length}`);
console.log(`  matched on the term's own label: ${resolved.length - viaSynonym.length}`);
console.log(`  matched on an exact synonym (weaker claim — every one is listed below): ${viaSynonym.length}`);
console.log(`  needed a rename rather than the asset's own wording: ${viaRename.length}`);
console.log(`  from a name Z-Anatomy itself wraps in parentheses: ${resolved.filter((r) => r.parenthesised).length}`);
console.log("");
console.log("REFUSED even though the ontology's own synonymy would have accepted them:");
for (const r of refused) console.log(`  ${r.label}  (would have been ${r.rejected.id}) — ${r.rejected.why}`);
console.log("");
console.log("UNRESOLVED — each needs a human decision, so none is written:");
for (const r of failed) console.log(`  ${r.label}${r.error ? `   [${r.error}]` : ""}`);
console.log("");
console.log("matched by SYNONYM — read each one; UBERON's own name for the structure is on the right:");
for (const r of viaSynonym) {
  console.log(`  ${r.label.padEnd(48)} -> ${(r.hit.id ?? "").padEnd(16)} "${r.hit.label}"  [synonym "${r.hit.value}"]`);
}
console.log("");
console.log("resolved by renaming (review these):");
for (const r of viaRename) console.log(`  ${r.label.padEnd(52)} -> ${(r.hit.id ?? "").padEnd(16)} "${r.hit.label}"`);

// A mesh name on two rows is a validator error, so catch it here rather than at the gate.
const seen = new Map();
for (const r of rows) {
  for (const m of r.meshes) {
    if (seen.has(m) && seen.get(m) !== r.label) console.log(`COLLISION: mesh ${m} claimed by '${seen.get(m)}' and '${r.label}'`);
    seen.set(m, r.label);
  }
}

// Two labels resolving to ONE term would be two rows for a single structure, so report it too.
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
