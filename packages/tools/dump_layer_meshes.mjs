// Group every Mesh in a layer GLB by the object it came from, using the loader's own structure.
//
// `node packages/tools/dump_layer_meshes.mjs <glb> <out.tsv>`
// The owner is the parent Group when the node had several primitives, else the mesh itself — which
// is the only way to recover identity, because three's GLTFLoader names a multi-primitive object
// after the MESH DATA and its children carry the shared mesh name (so "Femur.l" and "Femur.r" both
// arrive as "Femur"). Everything written to structures.json must come from this, not the file.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const resolved = require.resolve("three", { paths: ["packages/app"] });
let root = path.dirname(resolved);
while (!existsSync(path.join(root, "examples/jsm/loaders/GLTFLoader.js"))) {
  const up = path.dirname(root);
  if (up === root) throw new Error("could not locate the three package root");
  root = up;
}
const { GLTFLoader } = await import(
  "file://" + path.join(root, "examples/jsm/loaders/GLTFLoader.js").replace(/\\/g, "/")
);

const [glb, out] = process.argv.slice(2);
if (!glb || !out) {
  console.error("usage: node incoming/dump_layer_meshes.mjs <glb> <out.tsv>");
  process.exit(2);
}

const bytes = readFileSync(glb);
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

new GLTFLoader().parse(buffer, "", (gltf) => {
  const owners = new Map();
  gltf.scene.traverse((obj) => {
    if (!obj.isMesh) return;
    const parent = obj.parent && obj.parent !== gltf.scene ? obj.parent.name : null;
    const owner = parent ?? obj.name;
    if (!owners.has(owner)) owners.set(owner, new Set());
    owners.get(owner).add(obj.name);
  });

  const rows = [...owners.entries()]
    .map(([owner, meshes]) => ({ owner, meshes: [...meshes].sort() }))
    .sort((a, b) => a.owner.localeCompare(b.owner));

  writeFileSync(out, rows.map((r) => [r.owner, r.meshes.join(" ")].join("\t")).join("\n") + "\n", "utf8");

  const total = rows.reduce((n, r) => n + r.meshes.length, 0);
  const multi = rows.filter((r) => r.meshes.length > 1).length;
  console.log(`${path.basename(glb)}: ${rows.length} objects, ${total} Mesh objects (${multi} with several primitives)`);
  console.log(`wrote ${out}`);
  console.log("--- first 8 ---");
  rows.slice(0, 8).forEach((r) => console.log(`  ${r.owner}  ->  ${r.meshes.join(", ")}`));
});
