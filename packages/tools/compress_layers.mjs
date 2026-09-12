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

for (const [input, base] of SRC) {
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
