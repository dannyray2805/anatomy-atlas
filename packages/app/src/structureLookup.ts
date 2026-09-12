import type { Structure } from "../../schema/src/structure";

/**
 * three.js does NOT hand back the node name a GLB file holds. GLTFLoader runs every node name
 * through `PropertyBinding.sanitizeNodeName`, which replaces whitespace with `_` and REMOVES
 * `[ ] . : /`, and it splits a multi-primitive mesh into a group plus children named
 * `<name>_1`, `<name>_2`, … So the file's `Kidney.l` arrives as `Kidneyl`, `Thyroid gland` as
 * `Thyroid_gland`, and `Inferior lobe of left lung` as `Inferior_lobe_of_left_lung_1`.
 *
 * The register therefore keeps the DATASET's own names (that is the truthful record — the source
 * object really is called "Kidney.l") and the comparison is done on the normalized form. Matching
 * literally instead meant a mapping that looked correct in the file silently never resolved in
 * the app: the mesh rendered, but clicking it said "not in this dataset".
 */
export function normalizeMeshName(name: string): string {
  // Mirrors PropertyBinding.sanitizeNodeName: whitespace -> "_", reserved characters removed.
  return name.replace(/\s/g, "_").replace(/[\[\]\.:\/]/g, "");
}

/** True when a scene-graph mesh name denotes the same mesh as a registered dataset name. */
export function meshNameMatches(sceneName: string, registeredName: string): boolean {
  if (sceneName === registeredName) return true;
  const a = normalizeMeshName(sceneName);
  const b = normalizeMeshName(registeredName);
  if (a === b) return true;
  // Multi-primitive meshes are split by the loader; the base name is what was registered.
  return a.replace(/_\d+$/, "") === b;
}

/**
 * Resolve a picked mesh name to a Structure, matching by id, then label, then the mesh node names
 * listed in mesh_names. Returns undefined when the mesh is not in the published graph; callers
 * must then render DATA_MISSING rather than guessing.
 */
export function lookupStructure(
  structures: Structure[],
  name: string | null
): Structure | undefined {
  if (!name) return undefined;
  return (
    structures.find((s) => s.id === name) ??
    structures.find((s) => s.label === name) ??
    structures.find((s) => s.mesh_names?.some((m) => meshNameMatches(name, m)))
  );
}
