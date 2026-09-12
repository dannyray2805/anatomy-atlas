/// <reference types="vite/client" />

declare module "*.json" {
  const value: import("../../schema/src/structure").Structure[];
  export default value;
}

interface ImportMetaEnv {
  /** URL of the HuBMAP HRA male heart GLB (v1.1 sex toggle). */
  readonly VITE_HEART_GLB_MALE?: string;
  /** URL of the HuBMAP HRA female heart GLB (v1.1 sex toggle). */
  readonly VITE_HEART_GLB_FEMALE?: string;
  /** URL of the Z-Anatomy skeletal-system GLB (whole layer; served via Worker /api/media). */
  readonly VITE_SKELETON_GLB?: string;
  /** URL of the Z-Anatomy muscular-system GLB (whole layer; served via Worker /api/media). */
  readonly VITE_MUSCLE_GLB?: string;
  /**
   * URL of the BodyParts3D whole-body skin GLB (layer 0 of the Reference Atlas body; the same
   * individual as the Z-Anatomy systems, with its frame translation already baked in).
   */
  readonly VITE_Z_ANATOMY_SKIN_GLB?: string;
  /** URL of the Z-Anatomy visceral-system GLB (organs; same body; Reference Atlas, starts hidden). */
  readonly VITE_VISCERAL_GLB?: string;
  /** URL of the Z-Anatomy cardiovascular-system GLB (heart + whole vessel tree; same body, starts hidden). */
  readonly VITE_CARDIOVASCULAR_GLB?: string;
  /** URL of the Z-Anatomy nervous-system GLB (brain, spinal cord, nerve tubes; same body, starts hidden). */
  readonly VITE_NERVOUS_GLB?: string;
  /** URL of the Z-Anatomy joints GLB (capsules, ligaments, menisci; same body, starts hidden). */
  readonly VITE_JOINTS_GLB?: string;
  /** URL of the Z-Anatomy lymphoid GLB (node groups, thymus, spleen, tonsils; same body, starts hidden). */
  readonly VITE_LYMPHOID_GLB?: string;
  /** URL of the HuBMAP VH-MALE whole-body skin GLB (same VH-M frame as the male heart; identity in the VH peel). */
  readonly VITE_SKIN_GLB_MALE?: string;
  /** URL of the HuBMAP VH-FEMALE whole-body skin GLB (same VH-F frame as the female heart; identity in the VH peel). */
  readonly VITE_SKIN_GLB_FEMALE?: string;
  /** URL of the HuBMAP VH-MALE blood-vasculature GLB (same VH-M frame as skin/heart; identity in the VH peel). */
  readonly VITE_VESSEL_GLB_MALE?: string;
  /** URL of the HuBMAP VH-FEMALE blood-vasculature GLB (same VH-F frame as skin/heart; identity in the VH peel). */
  readonly VITE_VESSEL_GLB_FEMALE?: string;
  /** Neuroglancer URL to iframe on the HOA volume view (landing route `/`, legacy `/volume/heart`). */
  readonly VITE_HOA_HEART_ZARR?: string;
  /** HOA dataset DOI, e.g. 10.5281/zenodo.XXXX. */
  readonly VITE_HOA_HEART_DOI?: string;
  /** HOA dataset voxel size in micrometres. */
  readonly VITE_HOA_HEART_VOXEL_UM?: string;
  /** HOA dataset license (e.g. CC-BY-4.0). */
  readonly VITE_HOA_HEART_LICENSE?: string;
  /** HOA portal page link. */
  readonly VITE_HOA_HEART_PORTAL?: string;
  /** Base URL for Visible Human slice images + metadata.json (default /vh-fixtures). */
  readonly VITE_VH_SLICE_BASE?: string;
  /** Worker origin that serves /api/media/* (preview WebM/poster) from R2. */
  readonly VITE_WORKER_URL?: string;
  /** Official HOA/UCL cinematic media URL (video or image). Empty => hero hidden (explorer first). */
  readonly VITE_HOA_HERO?: string;
  /** Poster frame for the hero <video> (optional). */
  readonly VITE_HOA_HERO_POSTER?: string;
  /** H.264 MP4 fallback for the hero <video> (optional; WebM is tried first). */
  readonly VITE_HOA_HERO_MP4?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
