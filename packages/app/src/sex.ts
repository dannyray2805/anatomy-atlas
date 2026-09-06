// Sex is a UI axis for HRA reference meshes, NOT a physiology claim. HuBMAP HRA ships
// per-sex reference organs (CC BY 4.0). v1.1 ships only the heart: each sex loads its own
// heart GLB. Female mesh -> structure mappings are not in the published graph yet, so
// female node clicks resolve to DATA_MISSING (truth rules: never guess).

export type Sex = "male" | "female";
export const SEX_OPTIONS: Sex[] = ["male", "female"];
export const SEX_LABELS: Record<Sex, string> = { male: "Male", female: "Female" };

const GLB_MALE = (import.meta.env.VITE_HEART_GLB_MALE ?? "").trim();
const GLB_FEMALE = (import.meta.env.VITE_HEART_GLB_FEMALE ?? "").trim();

/** Per-sex HuBMAP HRA heart reference-mesh GLB. undefined when the env var is empty. */
export const HEART_GLB_URL: Record<Sex, string | undefined> = {
  male: GLB_MALE || undefined,
  female: GLB_FEMALE || undefined,
};

/**
 * True when a mesh node name carries HuBMAP's sex prefix (verified in the v1.3 heart GLBs:
 * male nodes are VH_M_*, female nodes are VH_F_*). This is a UI hint only — it never maps
 * a node to a Structure.id.
 */
export function hasHraSexPrefix(name: string, sex: Sex): boolean {
  return name.startsWith(sex === "male" ? "VH_M_" : "VH_F_");
}
