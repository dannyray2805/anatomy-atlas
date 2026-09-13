/**
 * Viewing theme (light / dark).
 *
 * Dark is the app's "lab" identity (docs/ui-vision.md), but it is a poor surface for actually
 * reading anatomy: a dark backdrop flattens the shading of the meshes and the pale skeleton
 * loses contrast. Light is therefore a real viewing mode, not a nicety — and because it is a
 * viewing preference, the choice is remembered per device.
 *
 * Pure module (no DOM, no storage access) so node:test can import it; App.tsx owns the DOM side.
 */
export type Theme = "dark" | "light";

export const DEFAULT_THEME: Theme = "dark";

/** Storage key for the remembered choice. Versioned like the alignment-overrides key. */
export const THEME_STORAGE_KEY = "anatomy-atlas.theme.v1";

/** Anything that is not a known theme falls back to the default rather than throwing. */
export function parseTheme(value: string | null | undefined): Theme {
  return value === "light" || value === "dark" ? value : DEFAULT_THEME;
}

export function nextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

/** Title/aria for the switch — describes what pressing it DOES, not the current state. */
export function themeActionLabel(theme: Theme): string {
  return `Switch to ${themeName(nextTheme(theme))} theme`;
}

export function themeName(theme: Theme): string {
  return theme === "dark" ? "Dark" : "Light";
}
