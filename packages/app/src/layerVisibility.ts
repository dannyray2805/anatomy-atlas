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

/**
 * Resolve a layer's on/off state: an explicit user choice wins, otherwise the layer's own
 * default (the heavy systems start off; everything else starts on). Pure so the page component
 * stays presentation and this rule stays unit-tested.
 */
export function isLayerVisible(
  layer: LayerAsset,
  choices: Record<string, boolean>
): boolean {
  return choices[layer.layer] ?? !layer.defaultHidden;
}

/** Apply the visibility choices to a layer list (used to build the rendered scene). */
export function applyVisibility(
  layers: LayerAsset[],
  choices: Record<string, boolean>
): LayerAsset[] {
  return layers.map((layer) => ({ ...layer, visible: isLayerVisible(layer, choices) }));
}

/** The optional heavy systems — the set the "all systems" control switches together. */
export function systemLayers(layers: LayerAsset[]): LayerAsset[] {
  return layers.filter((layer) => layer.defaultHidden);
}

/** True when every available system layer is currently switched on. */
export function allSystemsShown(
  layers: LayerAsset[],
  choices: Record<string, boolean>
): boolean {
  const systems = systemLayers(layers).filter((l) => l.url.length > 0);
  return systems.length > 0 && systems.every((l) => isLayerVisible(l, choices));
}

/** New choice map with every available system layer set to `on` (other layers untouched). */
export function setSystemsVisibility(
  layers: LayerAsset[],
  choices: Record<string, boolean>,
  on: boolean
): Record<string, boolean> {
  const next = { ...choices };
  for (const layer of systemLayers(layers)) {
    if (layer.url.length > 0) next[layer.layer] = on;
  }
  return next;
}
