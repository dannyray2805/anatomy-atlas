import type { Structure } from "../../schema/src/structure";

/**
 * Resolve a picked mesh name to a Structure, matching by id, then label, then the
 * HuBMAP node names listed in mesh_names. Returns undefined when the mesh is not in
 * the published graph; callers must then render DATA_MISSING rather than guessing.
 */
export function lookupStructure(
  structures: Structure[],
  name: string | null
): Structure | undefined {
  if (!name) return undefined;
  return (
    structures.find((s) => s.id === name) ??
    structures.find((s) => s.label === name) ??
    structures.find((s) => s.mesh_names?.includes(name))
  );
}
