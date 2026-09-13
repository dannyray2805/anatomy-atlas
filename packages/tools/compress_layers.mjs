// P0 layer-GLB compression (2026-09-05).
// Uniform, name-preserving, topology-preserving compression for the layer assets served
// from R2: male/female VH skin, VH male/female blood vasculature, the Z-Anatomy
// skeleton/muscle -v2, and the Z-Anatomy (BodyParts3D) whole-body skin. The VH hearts are
// loaded from the HuBMAP CDN and are NOT in our R2, so they are out of scope here.
//
// Two lossy-but-safe variants per asset:
//   -wq.glb : weld() + quantize(KHR_mesh_quantization) + dedup + prune
//             -> decoded natively by three.js GLTFLoader (no external decoder).
//   -dr.glb : weld() + dedup + prune + draco(KHR_draco_mesh_compression)
//             -> smallest; needs a DRACOLoader at runtime (drei wires one automatically).
//
// Explicitly AVOIDED (would alter scene-graph names / mesh topology, violating the truth
// rules): simplify, join, flatten, instance, palette, unweld, reorder. Weld merges only
// BITWISE-IDENTICAL vertices, so it never changes the surface.
//
// Run: node packages/tools/compress_layers.mjs   (from repo root)

import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { weld, quantize, dedup, prune, draco } from "@gltf-transform/functions";
import { KHRMeshQuantization, KHRDracoMeshCompression } from "@gltf-transform/extensions";
import draco3d from "draco3d";

const SRC = [
  ["incoming/VH_M_Skin.glb", "skin-male"],
  ["incoming/VH_F_Skin.glb", "skin-female"],
  ["incoming/VH_M_Blood_Vasculature.glb", "vasculature-male"],
  ["incoming/VH_F_Blood_Vasculature.glb", "vasculature-female"],
  ["incoming/skeleton-v2.glb", "skeleton-v2"],
  // v2 is superseded by v3: v2 included the 62 connective-tissue sheets (fascia,
  // aponeurosis, retinaculum) that the "Muscular system" collection carries alongside the
  // muscle bellies. Those sheets sit at or above skin level and were the worst group of
  // protrusions (max 26.15 mm, mean 5.90 mm). v3 excludes them by explicit object name --
  // connective-tissue sheets are not muscle, and the exclusion changes no muscle geometry
  // (the muscle group measures identically: 184 objects, 5702 verts, max 24.48 mm).
  // Do not regenerate v2.
  ["incoming/muscle-v3.glb", "muscle-v3"],
  // v1 is superseded: its face winding was inconsistent (~46 % of faces backwards), so it
  // rendered with see-through holes. Do not regenerate it.
  ["incoming/z-anatomy-skin-v2.glb", "z-anatomy-skin-v2"],
  // The Z-Anatomy whole-body systems exported in Phase 1c, which make up the rest of the
  // /reference atlas. Export provenance (collection, title-glyph exclusion, curve->mesh
  // conversion, and the one visceral object that does not ship) is recorded in docs/sources.md.
  ["incoming/nervous-v1.glb", "nervous-v1"],
  ["incoming/cardiovascular-v1.glb", "cardiovascular-v1"],
  ["incoming/visceral-v1.glb", "visceral-v1"],
  ["incoming/joints-v1.glb", "joints-v1"],
  ["incoming/lymphoid-v1.glb", "lymphoid-v1"],
  // --- Male Visible Human donor: organs, spine and brain (2026-09-13) ---
  // The HuBMAP Visible Human male is ONE individual, and ccf-3d-reference-object-library
  // publishes that same individual's organs in the same folder as his skin, so they nest at
  // identity and need NO registration (sameFrame). Verified with the app's own loader BEFORE
  // anything was compressed or uploaded — incoming/check_male_organs.mjs reports all 20 inside
  // the skin bounding box with anatomically plausible heights (brain 0.95, lungs 0.80, liver
  // 0.70, kidneys 0.66, bladder 0.52 of body height).
  // NOTE: SBU_M_Intestine_Large and Allen_M_Brain are published by OTHER contributors inside
  // that same repo; their provenance is recorded per asset in docs/sources.md.
  ["incoming/vh-male/VH_M_Liver.glb", "liver-male"],
  ["incoming/vh-male/VH_M_Lung.glb", "lung-male"],
  ["incoming/vh-male/VH_M_Kidney_L.glb", "kidney-l-male"],
  ["incoming/vh-male/VH_M_Kidney_R.glb", "kidney-r-male"],
  ["incoming/vh-male/VH_M_Gallbladder.glb", "gallbladder-male"],
  ["incoming/vh-male/VH_M_Biliary_Tree.glb", "biliary-tree-male"],
  ["incoming/vh-male/VH_M_Pancreas.glb", "pancreas-male"],
  ["incoming/vh-male/VH_M_Spleen.glb", "spleen-male"],
  ["incoming/vh-male/VH_M_Thymus.glb", "thymus-male"],
  ["incoming/vh-male/VH_M_Small_Intestine.glb", "small-intestine-male"],
  ["incoming/vh-male/SBU_M_Intestine_Large.glb", "large-intestine-male"],
  ["incoming/vh-male/VH_M_Urinary_Bladder.glb", "urinary-bladder-male"],
  ["incoming/vh-male/VH_M_Ureter_L.glb", "ureter-l-male"],
  ["incoming/vh-male/VH_M_Ureter_R.glb", "ureter-r-male"],
  ["incoming/vh-male/VH_M_Urethra.glb", "urethra-male"],
  ["incoming/vh-male/VH_M_Prostate.glb", "prostate-male"],
  ["incoming/vh-male/VH_M_Vertebrae.glb", "vertebrae-male"],
  ["incoming/vh-male/VH_M_Pelvis.glb", "pelvis-male"],
  ["incoming/vh-male/VH_M_Spinal_Cord.glb", "spinal-cord-male"],
  ["incoming/vh-male/Allen_M_Brain.glb", "brain-male"],
  ["incoming/vh-male/NIH_M_Lymph_Node.glb", "lymph-node-male"],
];
const OUT_DIR = "incoming/opt";
fs.mkdirSync(OUT_DIR, { recursive: true });

const bytes = (p) => fs.statSync(p).size;

function meshSummary(doc) {
  const meshes = doc.getRoot().listMeshes();
  let prims = 0;
  let tris = 0;
  for (const m of meshes) {
    for (const p of m.listPrimitives()) {
      prims += 1;
      const idx = p.getIndices();
      tris += idx ? idx.getCount() / 3 : 0;
    }
  }
  return { meshes: meshes.length, prims, tris: Math.round(tris) };
}

async function makeIO(exts, deps) {
  const io = new NodeIO().registerExtensions(exts);
  if (deps) io.registerDependencies(deps);
  return io;
}

async function variant(input, output, transforms, io) {
  const doc = await io.read(input);
  const before = meshSummary(doc);
  await doc.transform(...transforms);
  const after = meshSummary(doc);
  const bin = await io.writeBinary(doc);
  fs.writeFileSync(output, Buffer.from(bin));
  const srcSize = bytes(input);
  const outSize = bytes(output);
  const pct = ((1 - outSize / srcSize) * 100).toFixed(1);
  const vertGain = before.meshes
    ? "meshes " + before.meshes + " -> " + after.meshes
    : "n/a";
  console.log(
    `${path.basename(output)}: ${srcSize} B -> ${outSize} B (-${pct}%)  [${vertGain}, prims ${before.prims} -> ${after.prims}, tris ${before.tris} -> ${after.tris}]`
  );
}

const wqIO = await makeIO([KHRMeshQuantization]);
const drIO = await makeIO(
  [KHRDracoMeshCompression],
  { "draco3d.encoder": await draco3d.createEncoderModule() }
);

// Optional filter so an incremental addition does not re-compress every existing asset.
// Each argument is matched against the entry's base name and input path:
//   node packages/tools/compress_layers.mjs incoming/vh-male      <- the 20 male donor organs
//   node packages/tools/compress_layers.mjs liver-male lung-male
// With no arguments, every entry is compressed (the full rebuild).
const only = process.argv.slice(2);
const selected = only.length
  ? SRC.filter(([input, base]) => only.some((token) => base.includes(token) || input.includes(token)))
  : SRC;
if (only.length && selected.length === 0) {
  console.error(`No SRC entries matched: ${only.join(", ")}`);
  process.exit(1);
}
console.log(`compressing ${selected.length} of ${SRC.length} entries${only.length ? ` (filter: ${only.join(", ")})` : ""}`);

for (const [input, base] of selected) {
  if (!fs.existsSync(input)) {
    console.error(`MISSING source: ${input}`);
    continue;
  }
  const wqOut = path.join(OUT_DIR, `${base}-wq.glb`);
  const drOut = path.join(OUT_DIR, `${base}-dr.glb`);
  console.log(`\n== ${base} ==`);
  try {
    await variant(
      input,
      wqOut,
      [
        weld(),
        quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
        dedup(),
        prune(),
      ],
      wqIO
    );
  } catch (err) {
    console.error(`  WQ variant failed for ${base}:`, err.message);
  }
  try {
    await variant(
      input,
      drOut,
      [
        weld(),
        dedup(),
        prune(),
        draco({
          method: "edgebreaker",
          encodeSpeed: 5,
          decodeSpeed: 5,
          quantizePosition: 14,
          quantizeNormal: 10,
        }),
      ],
      drIO
    );
  } catch (err) {
    console.error(`  DR variant failed for ${base}:`, err.message);
  }
}
console.log("\ndone");
