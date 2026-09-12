#!/usr/bin/env node
/**
 * Prove that a compressed GLB is SCENE-equivalent to its source — the check that
 * `compress_layers.mjs`'s own summary cannot make.
 *
 * WHY THIS EXISTS
 * ---------------
 * `compress_layers.mjs` prints `meshes / prims / tris`, but it computes them over UNIQUE MESH
 * DATA BLOCKS. Its pipeline includes `dedup()`, which collapses duplicate data blocks and
 * re-points the nodes at the survivor — visually identical, yet the block-level counts fall.
 * So a large drop in those numbers means "dedup worked", NOT "geometry was lost" — and
 * conversely they cannot prove nothing was lost. For the Z-Anatomy systems this matters: the
 * block counts for `cardiovascular-v1` fall from 675 to 430 meshes while the rendered body is
 * unchanged, because those objects share mesh data in the source GLB.
 *
 * This tool walks the NODE hierarchy, counts triangles PER NODE (instanced), and separates
 * SURFACE-BEARING nodes (mesh has triangles) from geometry-less ones. The contract for an
 * accepted derivative is:
 *
 *   MUST MATCH  - the set of surface-bearing node names, and how many there are. This is what
 *                 `mesh_names` / per-mesh picking resolve against, and what the viewer draws.
 *   MAY DIFFER  - unique mesh data blocks (dedup collapsing identical data = the point of it).
 *                 geometry-less nodes, which prune() drops (they carry no surface and cannot
 *                 be clicked; the Blender sources contain many `.j` placeholders and
 *                 vertex-only stubs).
 *   REPORTED    - instanced triangles. weld/prune/quantize preserve them exactly, so a delta
 *                 comes from Draco itself removing sub-quantization (zero-area) slivers:
 *                 measured 0.53 % on nervous-v1 and 0 for cardiovascular/muscle/lymphoid.
 *                 An image diff of the two renders is the test that settles acceptability —
 *                 10 of 1,638,400 pixels differed by >8/255 for nervous-v1, i.e. invisible.
 *
 * Usage (from the repo root):
 *
 *   node packages/tools/compare_glb_scene.mjs <source.glb> <derived.glb> [<source2> <derived2> ...]
 *
 * Exit code is non-zero if any MUST-match field differs, so it can gate a batch.
 */

import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { KHRDracoMeshCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import draco3d from "draco3d";

async function makeIO() {
  return new NodeIO()
    .registerExtensions([KHRDracoMeshCompression, KHRMeshQuantization])
    .registerDependencies({
      "draco3d.decoder": await draco3d.createDecoderModule(),
      "draco3d.encoder": await draco3d.createEncoderModule()
    });
}

function primTris(prim) {
  const idx = prim.getIndices();
  return idx ? idx.getCount() / 3 : 0;
}

/** Scene-level summary: what gets drawn, and under which names. */
async function summarise(io, file) {
  const doc = await io.readBinary(new Uint8Array(fs.readFileSync(file)));
  const root = doc.getRoot();
  const nodes = root.listNodes();
  let nodesWithMesh = 0;
  let instancedTris = 0;
  const names = new Set();
  const surfaceNames = new Set();
  for (const n of nodes) {
    names.add(n.getName());
    const mesh = n.getMesh();
    if (!mesh) continue;
    nodesWithMesh += 1;
    let tris = 0;
    for (const prim of mesh.listPrimitives()) tris += primTris(prim);
    instancedTris += tris;
    if (tris > 0) surfaceNames.add(n.getName());
  }
  return {
    file: path.basename(file),
    nodes: nodes.length,
    nodesWithMesh,
    uniqueMeshes: root.listMeshes().length,
    instancedTris: Math.round(instancedTris),
    names,
    surfaceNames
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2 || args.length % 2 !== 0) {
    console.error("usage: <source.glb> <derived.glb> [<source2> <derived2> ...]");
    process.exit(2);
  }
  const io = await makeIO();
  let failures = 0;
  for (let i = 0; i < args.length; i += 2) {
    const a = await summarise(io, args[i]);
    const b = await summarise(io, args[i + 1]);
    console.log(`=== ${a.file}  ->  ${b.file}`);
    const row = (label, x, y, mustMatch, note = "") => {
      const differs = x !== y;
      if (differs && mustMatch) failures += 1;
      const verdict = !differs ? "same" : mustMatch ? "** DIFFERENT **" : `differs ${note}`.trim();
      console.log(`  ${label.padEnd(20)}${String(x).padStart(9)}  ->  ${String(y).padStart(9)}   ${verdict}`);
    };
    row("nodes (total)", a.nodes, b.nodes, false, "(informational)");
    row("nodes with mesh", a.nodesWithMesh, b.nodesWithMesh, true);
    row("surface names", a.surfaceNames.size, b.surfaceNames.size, true);
    row("unique mesh data", a.uniqueMeshes, b.uniqueMeshes, false, "(expected: dedup)");
    const missing = [...a.surfaceNames].filter((n) => !b.surfaceNames.has(n));
    if (missing.length) failures += 1;
    console.log(
      `  ${"surface-name check".padEnd(20)}${String(a.surfaceNames.size).padStart(9)}  ->  ${String(b.surfaceNames.size).padStart(9)}   ` +
        `${missing.length === 0 ? "all surfaces present" : `${missing.length} SURFACE MISSING **`}`
    );
    if (missing.length) console.log(`      e.g. ${missing.slice(0, 8).join(", ")}`);
    const prunedNames = [...a.names].filter((n) => !b.names.has(n) && !a.surfaceNames.has(n));
    console.log(
      `  ${"geometry-less nodes".padEnd(20)}${String(a.nodes - a.nodesWithMesh).padStart(9)}  ->  ${String(b.nodes - b.nodesWithMesh).padStart(9)}   ` +
        `${prunedNames.length} name(s) pruned (no surface)`
    );
    const triDelta = b.instancedTris - a.instancedTris;
    console.log(
      `  ${"instanced triangles".padEnd(20)}${String(a.instancedTris).padStart(9)}  ->  ${String(b.instancedTris).padStart(9)}   ` +
        (triDelta === 0
          ? "same"
          : `differs ${triDelta > 0 ? "+" : ""}${triDelta} (${((100 * triDelta) / a.instancedTris).toFixed(3)}%) — Draco slivers; confirm with an image diff`)
    );
  }
  if (failures) {
    console.error(`\nFAIL: ${failures} surface-level difference(s) — this derivative is not acceptable.`);
    process.exit(1);
  }
  console.log("\nOK: every derivative keeps every surface-bearing node name.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
