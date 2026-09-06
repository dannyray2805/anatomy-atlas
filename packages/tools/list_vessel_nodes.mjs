#!/usr/bin/env node
/**
 * Vasculature node-name dump — enumeration for HUMAN review only (no structure mapping, no
 * writing to structures.json / layers.ts / sources.md / fact cards).
 *
 * Loads each sex's whole-body blood-vasculature GLB with the SAME loader the app uses
 * (three.js GLTFLoader) and records, per unique node name: how many meshes carry it, its
 * total triangle count, and the union bounding-box center/size across those meshes (so a
 * human can tell "this one sits near the heart" without opening a viewer).
 *
 * WHY THE UNCOMPRESSED ORIGINALS (incoming/), NOT THE -draco KEYS: Draco compresses geometry
 * buffers only — node names / scene graph are untouched — so the node list from
 * `VH_M_Blood_Vasculature.glb` is byte-for-byte the node list the app serves from
 * `vasculature-v1-draco.glb` on R2. Enumerating the originals avoids needing a Draco decoder
 * in Node.
 *
 * TRUTH RULES (unchanged): this tool lists what exists. The anatomical-vs-generic split is a
 * KEYWORD pattern match for triage only — it is NOT a claim that a name is the correct
 * vessel. No anatomical identity is inferred or assigned here.
 *
 * Usage:
 *   node packages/tools/list_vessel_nodes.mjs [male.glb] [female.glb]
 * Defaults: incoming/VH_M_Blood_Vasculature.glb, incoming/VH_F_Blood_Vasculature.glb
 * Output:    incoming/vasculature-male-nodes.json, incoming/vasculature-female-nodes.json
 *            (+ anatomical-looking subset + counts on stdout)
 */
import * as THREE from "../../packages/app/node_modules/three/build/three.module.js";
import { GLTFLoader } from "../../packages/app/node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [malePath = "incoming/VH_M_Blood_Vasculature.glb", femalePath = "incoming/VH_F_Blood_Vasculature.glb"] =
  process.argv.slice(2);

// Triage keywords ONLY — a mechanical filter so a human knows how much of this list reads as
// real vessel vocabulary vs. opaque ids. Not an anatomical-identity claim.
// Vessel suffixes/roots common in per-vessel arterial/venous naming.
const ANATOMICAL_RE =
  /aorta|arter(?:y|ies)|vein|vena|venae|cava|coronary|carotid|subclavian|axillary|brachiocephalic|brachial|innominate|vertebral|jugular|iliac|femoral|popliteal|tibial|fibular|peroneal|radial|ulnar|celiac|mesenteric|renal|hepatic|splenic|gastric|gonadal|sacral|epigastric|phrenic|intercostal|mammary|thyroid|lingual|facial|temporal|occipital|ophthalmic|meningeal|basilar|cerebellar|cerebral|pericardial|bronchial|esophageal|portal|pulmonary/i;

function loadGLB(rel) {
  const buf = readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)));
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      "",
      (gltf) => resolve(gltf.scene),
      (err) => reject(err)
    );
  });
}

/** Group meshes by node name; per name: mesh count, summed triangles, union bbox. */
function inventory(scene) {
  const byName = new Map();
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const name = o.name || "(unnamed)";
    const geo = o.geometry;
    const triCount = geo.index ? geo.index.count / 3 : geo.position.count / 3;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push({ object: o, triCount });
  });

  const nodes = [];
  for (const [name, entries] of byName) {
    const box = new THREE.Box3();
    let triangles = 0;
    for (const e of entries) {
      // Apply the node's world transform so the box is in scene space (like the app sees it).
      e.object.updateWorldMatrix(true, false);
      box.expandByObject(e.object);
      triangles += e.triCount;
    }
    nodes.push({
      name,
      meshCount: entries.length,
      triangles: Math.round(triangles),
      bboxCenter: box.isEmpty()
        ? null
        : box.getCenter(new THREE.Vector3()).toArray().map((n) => +n.toFixed(4)),
      bboxSize: box.isEmpty()
        ? null
        : box.getSize(new THREE.Vector3()).toArray().map((n) => +n.toFixed(4))
    });
  }
  nodes.sort((a, b) => a.name.localeCompare(b.name));
  return nodes;
}

function triage(nodes) {
  const anatomical = nodes.filter((n) => ANATOMICAL_RE.test(n.name));
  const generic = nodes.filter((n) => !ANATOMICAL_RE.test(n.name));
  return { anatomical, generic };
}

function report(sex, source, nodes) {
  const { anatomical, generic } = triage(nodes);
  const fmtTri = (t) => t.toLocaleString("en-US");
  const lines = [`== ${sex.toUpperCase()} vasculature (${source})`, `   unique node names: ${nodes.length}`];
  lines.push(`   anatomical-looking (keyword triage): ${anatomical.length} / ${nodes.length}`);
  lines.push(`   generic / not keyword-matched:      ${generic.length} / ${nodes.length}`);
  lines.push(`   --- anatomical-looking subset (name | tri | center x,y,z | size x,y,z) ---`);
  for (const n of anatomical) {
    lines.push(`   ${n.name} | ${fmtTri(n.triangles)} | ${n.bboxCenter.join(", ")} | ${n.bboxSize.join(", ")}`);
  }
  lines.push(`   --- generic remainder (names only) ---`);
  for (const n of generic) {
    lines.push(`   ${n.name}`);
  }
  lines.push("");
  return lines.join("\n");
}

console.log(`VH blood-vasculature node dump (three GLTFLoader r${THREE.REVISION})\n`);

for (const [sex, path, out] of [
  ["male", malePath, "incoming/vasculature-male-nodes.json"],
  ["female", femalePath, "incoming/vasculature-female-nodes.json"]
]) {
  const scene = await loadGLB(path);
  const nodes = inventory(scene);
  const { anatomical, generic } = triage(nodes);
  const payload = {
    source: path,
    generated: new Date().toISOString(),
    loader: `three GLTFLoader r${THREE.REVISION}`,
    note: "Node names are Draco-preserved, so this equals the served -draco scene graph.",
    uniqueNodeNames: nodes.length,
    triage: {
      keywordRegex: String(ANATOMICAL_RE),
      anatomicalLooking: anatomical.length,
      generic: generic.length
    },
    nodes
  };
  writeFileSync(fileURLToPath(new URL(`../../${out}`, import.meta.url)), JSON.stringify(payload, null, 2) + "\n");
  process.stdout.write(report(sex, path, nodes));
}

console.log("Wrote incoming/vasculature-male-nodes.json + incoming/vasculature-female-nodes.json");
