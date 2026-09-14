// Resolve the VISIBLE HUMAN donors' blood-vasculature meshes to Uberon ids.
//
// This is not a layer of the reference body: it is the two donors' own vessel trees
// (`VH_M_Blood_Vasculature.glb`, `VH_F_Blood_Vasculature.glb`, 104 and 108 meshes), which until now
// resolved for nobody except the ascending aorta — a click anywhere else in a donor's vessel tree
// said "not mapped to a structure".
//
// Naming, and the decisions it forces:
//   `VH_M_renal_artery`      -> "Renal artery"        (the plain case)
//   `VH_M_renal_vein_L`      -> "Left renal vein"     (the source's own side suffix)
//   `VH_F_left_uterine_artery`-> "Left uterine artery" (the source's own side WORD — the same fact,
//                                                      spelled differently; both forms are recognised,
//                                                      and only the suffix form used to be)
//   `VH_M_descending_aorta_a`-> "Descending aorta"    (`_a`/`_b`/`_c` are MESH SPLITS, not anatomy,
//     so they stay in one row — unlike a side, which changes which structure it is)
//   `VH_M_opthalmic_artery_L`-> "Ophthalmic artery"   (the source's own misspelling, corrected here
//                                                      and recorded, as the muscle pass did with
//                                                      "Bucinator")
//
// A side MAY be dropped to find the term (both sides are then one row, the `kidney` precedent), but a
// POSITION never is: `VH_M_pulmonary_vein_L_sup` is the LEFT SUPERIOR pulmonary vein, so mapping it
// to a generic "pulmonary vein" would claim a part as its whole. If Uberon does not name the composed
// structure, the mesh stays unmapped and is reported.
//
// The gate is the one used everywhere else: search proposes ids, the OLS4 term endpoint confirms an
// exact label or an exact synonym, and the label written into the graph is the term's own.
import { readFileSync, writeFileSync } from "node:fs";

const DUMPS = ["incoming/_m-vasculature.tsv", "incoming/_f-vasculature.tsv"];
const GRAPH = "content/published/structures.json";
const OUT = "incoming/_donor-vessels-resolution.tsv";
const EXCLUDED_OUT = "incoming/_donor-vessels-excluded.tsv";

/** Documented corrections of the source's own wording. Each is a wording variant of the same
 *  vessel, and the replacement still has to be confirmed by the term endpoint. */
const ALIASES = [
  ["Opthalmic", "Ophthalmic"], // the asset spells its ophthalmic ARTERY without the h
  // The asset means the adult arch of the aorta. Its own wording is also an exact synonym of the
  // EMBRYONIC pharyngeal arch artery, so the adult structure is named explicitly here; that
  // embryonic term was refused once already on the reference body's vessel pass.
  ["Aortic arch", "Arch of aorta"]
];

/**
 * Terms the gate would accept that are a DIFFERENT structure. Same rule as the reference-body
 * vessel pass: UBERON's synonymy is historical and sometimes reflects embryology, so a synonym
 * match still needs a human decision. Printed on every run.
 */
const REJECT = [
  [
    "Aortic arch",
    "UBERON:0004363",
    "UBERON:0004363 is the pharyngeal arch artery — the EMBRYONIC arch artery, which carries 'aortic arch' as a synonym from embryology. These meshes are the adult arch (UBERON:0001508)."
  ]
];

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Turn one asset mesh name into the structure it names, or null when it carries nothing usable.
 *  Returns both the side-specific wording and the side-less one, because the graph needs both: see
 *  the two-route comment in candidatesFor. */
function labelOf(mesh, sex) {
  const prefix = sex === "m" ? /^VH_M_/ : /^VH_F_/;
  if (!prefix.test(mesh)) return null;
  let rest = mesh.replace(prefix, "");

  // Mesh splits: not anatomy. Drop them and keep the mesh in its structure's row.
  rest = rest.replace(/_[abc]$/, "");

  // A side is written two ways in these assets, and they are the same fact: the suffix letter
  // (`renal_vein_L`) and the leading word (`left_uterine_artery`). Recognising only the suffix left
  // `left uterine artery` unmapped while `opthalmic_artery_L` resolved, because the side-less
  // fallback in candidatesFor never fired for the word form — a defect in this script, not a gap in
  // the ontology (`uterine artery` is UBERON:0002493, `uterine vein` UBERON:8600058).
  const sides = { L: "Left", R: "Right" };
  const word = rest.match(/^(left|right)_/i);
  let side = "";
  if (word) {
    rest = rest.slice(word[0].length);
    side = sides[word[1][0].toUpperCase()];
  }

  // Side and position suffixes. A POSITION changes which structure it is and is composed into the
  // label; a SIDE is an instance of the structure and is carried separately, because the graph's
  // convention is one row holding both sides (the `kidney` row holds the left and right meshes).
  const positions = { sup: "superior", inf: "inferior" };
  const m = rest.match(/_(L|R)(?:_(sup|inf))?$/) ?? null;
  let position = "";
  if (m) {
    rest = rest.slice(0, -m[0].length);
    side = sides[m[1]];
    position = m[2] ? positions[m[2]] : "";
  }
  const words = rest.split("_").filter(Boolean).join(" ").trim();
  if (!words) return null;
  const bare = [position, words].filter(Boolean).join(" ");
  return { label: [side, bare].filter(Boolean).join(" "), bare, side };
}

/**
 * The two wordings of the same mesh, in order of preference:
 *  1. the side-specific name (`Left renal vein`) — Uberon does name some vessels by side, and those
 *     terms already have rows from the reference body's layer, so the donor mesh joins that row;
 *  2. the side-less name (`Ophthalmic artery`) — for the many vessels Uberon does NOT split by side.
 *     This is the graph's existing convention, not a shortcut: the `kidney` row holds the left and
 *     right meshes, and every sided bone row holds both sides. Only a SIDE may be dropped this way —
 *     never a position, because `left superior pulmonary vein` is not `pulmonary vein`.
 * Wording corrections are applied to both.
 */
function candidatesFor(item) {
  const out = new Set([item.label]);
  if (item.bare && norm(item.bare) !== norm(item.label)) out.add(item.bare);
  for (const base of [...out]) {
    for (const [from, to] of ALIASES) {
      out.add(base.replace(new RegExp(`\\b${from}\\b`, "i"), to));
    }
  }
  return [...out];
}

// --- what the assets contain, and what is already claimed --------------------------------

const claimed = new Map();
for (const row of JSON.parse(readFileSync(GRAPH, "utf8"))) {
  for (const name of row.mesh_names ?? []) claimed.set(name, row.id);
}

const groups = new Map();
for (const path of DUMPS) {
  const sex = path.includes("_m-") ? "m" : "f";
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [, meshes] = line.split("\t");
    for (const mesh of (meshes ?? "").split(" ").filter(Boolean)) {
      const parsed = labelOf(mesh, sex);
      if (!parsed) continue;
      // Group case-insensitively: the source writes the same structure as `left_renal_vein` in one
      // spelling and `Left_renal_vein`-style wording in another, and a case-sensitive key split them
      // into two rows that resolved to the SAME Uberon term — two rows for one structure.
      const key = norm(parsed.label);
      if (!groups.has(key)) groups.set(key, { ...parsed, meshes: new Set(), sexes: new Set() });
      const group = groups.get(key);
      // Prefer a capitalised spelling for display, since the row's label is read by people.
      if (/^[A-Z]/.test(parsed.label)) group.label = parsed.label;
      group.meshes.add(mesh);
      group.sexes.add(sex);
    }
  }
}

console.log(`labels across both donors: ${groups.size}`);
console.log(`on both donors: ${[...groups.values()].filter((g) => g.sexes.size === 2).length}`);
console.log("");

const toResolve = [];
const excluded = [];
for (const group of groups.values()) {
  const already = [...group.meshes].filter((m) => claimed.has(m));
  if (already.length === group.meshes.size) {
    excluded.push({ label: group.label, reason: `already mapped to '${claimed.get(already[0])}'`, meshes: [...group.meshes].sort() });
    continue;
  }
  if (already.length) {
    // Partly claimed: the free meshes stay with the existing row, so report rather than split a
    // structure across two rows.
    excluded.push({
      label: group.label,
      reason: `partly claimed by '${claimed.get(already[0])}' — the rest is left to that row`,
      meshes: already.sort()
    });
    continue;
  }
  toResolve.push({ ...group, meshes: [...group.meshes].sort() });
}

const accounted = new Set([...toResolve, ...excluded].flatMap((g) => g.meshes));
const orphans = [...new Set([...groups.values()].flatMap((g) => [...g.meshes]))].filter((n) => !accounted.has(n));
console.log(`to resolve ${toResolve.length}, excluded ${excluded.length}, unaccounted ${orphans.length}`);
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

const rows = [];
let cursor = 0;
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (cursor < toResolve.length) {
      const item = toResolve[cursor++];
      let hit = null;
      let matchedBy = "";
      let rejected = "";
      let error = "";
      try {
        for (const candidate of candidatesFor(item)) {
          const proposal = matchInDocs(await search(candidate), candidate);
          if (!proposal) continue;
          const refused = REJECT.find(([label, id]) => norm(label) === norm(item.label) && id === proposal.id);
          if (refused) {
            rejected = refused[2];
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
const viaSynonym = resolved.filter((r) => r.hit.on === "synonym");
const viaAlias = resolved.filter((r) => norm(r.matchedBy) !== norm(r.label) && norm(r.matchedBy) !== norm(r.bare));
const viaSide = resolved.filter((r) => norm(r.matchedBy) === norm(r.bare) && norm(r.label) !== norm(r.bare));

/**
 * Several wordings can land on ONE term — `Left ophthalmic artery` and `Right ophthalmic artery`
 * both resolve to the ophthalmic artery, which Uberon does not split by side. Two rows for one
 * structure is a validator error, so they merge here into a single row labelled with the SHORTEST
 * wording, which is the side-less one.
 */
const byTerm = new Map();
for (const r of resolved) {
  if (!byTerm.has(r.hit.id)) byTerm.set(r.hit.id, { uberon: r.hit.id, uberonLabel: r.hit.label, labels: [], meshes: new Set() });
  const m = byTerm.get(r.hit.id);
  m.labels.push(r.label);
  for (const mesh of r.meshes) m.meshes.add(mesh);
}
const mergedRows = [...byTerm.values()]
  .map((m) => {
    const shortest = m.labels.slice().sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
    // Several wordings landed on one term, which means the term itself is the generic structure and
    // the wordings are its sides (`Left ophthalmic vein` / `Right ophthalmic vein` -> `ophthalmic
    // vein`). Labelling the row from a SIDE would name half a structure, so the merged row takes the
    // term's own name. A row with a single wording keeps the asset's, which is what a reader expects
    // for the many cases where UBERON's own name is the odd one (`Superior vena cava` is UBERON's
    // 'anterior vena cava').
    const label =
      m.labels.length > 1
        ? m.uberonLabel.charAt(0).toUpperCase() + m.uberonLabel.slice(1)
        : shortest;
    return {
      label,
      uberon: m.uberon,
      uberonLabel: m.uberonLabel,
      meshes: [...m.meshes].sort(),
      mergedFrom: m.labels.slice().sort()
    };
  })
  .sort((a, b) => a.label.localeCompare(b.label));

console.log(`RESOLVED ${resolved.length}/${rows.length} label(s) -> ${mergedRows.length} row(s) after merging by term`);
console.log(`  matched on the term's own label: ${resolved.length - viaSynonym.length}`);
console.log(`  matched on an exact synonym: ${viaSynonym.length}`);
console.log(`  matched on the side-less wording (the row then holds both sides): ${viaSide.length}`);
console.log(`  needed a wording correction: ${viaAlias.length}`);
console.log(`  refused by the documented REJECT table: ${rows.filter((r) => r.rejected).length}`);
console.log("");
console.log("REFUSED even though the ontology's own synonymy would have accepted them:");
for (const r of rows.filter((x) => x.rejected)) console.log(`  ${r.label} — ${r.rejected}`);
console.log("");
console.log("UNRESOLVED — reported, not guessed:");
for (const r of failed) console.log(`  ${r.label}${r.error ? `   [${r.error}]` : ""}`);
console.log("");
console.log("merged by term (one row, both sides):");
for (const m of mergedRows) {
  if (m.mergedFrom.length > 1) console.log(`  ${m.label.padEnd(34)} ${m.uberon.padEnd(16)} <- ${m.mergedFrom.join(" | ")}`);
}
console.log("");
console.log("matched on the side-less wording (review these):");
for (const r of viaSide) console.log(`  ${r.label.padEnd(40)} -> ${(r.hit.id ?? "").padEnd(16)} "${r.hit.label}"`);
console.log("");
console.log("matched by SYNONYM:");
for (const r of viaSynonym) console.log(`  ${r.label.padEnd(44)} -> ${(r.hit.id ?? "").padEnd(16)} "${r.hit.label}"`);
console.log("");
console.log("needed a wording correction (review these):");
for (const r of viaAlias) console.log(`  ${r.label.padEnd(44)} -> ${(r.hit.id ?? "").padEnd(16)} "${r.hit.label}"`);

const seen = new Map();
for (const row of mergedRows) {
  for (const m of row.meshes) {
    if (seen.has(m) && seen.get(m) !== row.label) console.log(`COLLISION: mesh ${m} claimed by '${seen.get(m)}' and '${row.label}'`);
    seen.set(m, row.label);
  }
}

writeFileSync(OUT, mergedRows.map((r) => [r.label, r.uberon, r.uberonLabel, r.meshes.join(" ")].join("\t")).join("\n") + "\n", "utf8");
writeFileSync(EXCLUDED_OUT, excluded.map((g) => [g.label, g.reason, g.meshes.join(" ")].join("\t")).join("\n") + "\n", "utf8");
console.log(`\nwrote ${OUT} and ${EXCLUDED_OUT}`);
