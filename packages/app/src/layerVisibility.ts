import type { LayerAsset } from "./components/VolumeViewer";

/**
 * Pure visibility helpers shared by VolumeViewer so the show/hide behaviour can be unit
 * tested without a DOM. A layer is "on screen" only when it is flagged visible AND has a
 * usable url — hidden layers are excluded from rendering AND from FrameScene's bounding
 * sphere (the camera frames only what remains visible).
 */

/** Layers that actually mount into the scene (rendered + framed). */
export function filterVisibleLayers(layers: LayerAsset[]): LayerAsset[] {
  return layers.filter((layer) => layer.visible && layer.url.length > 0);
}

/** True when at least one layer is configured with a usable url (i.e. not the env-unset case). */
export function hasConfiguredUrl(layers: LayerAsset[]): boolean {
  return layers.some((layer) => layer.url.length > 0);
}
