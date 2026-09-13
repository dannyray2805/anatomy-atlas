import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  nextTheme,
  parseTheme,
  themeActionLabel,
  themeName
} from "./theme.ts";

describe("theme (light / dark viewing preference)", () => {
  it("defaults to the app's identity theme", () => {
    assert.equal(DEFAULT_THEME, "dark");
  });

  it("parses a stored choice, and falls back for anything else", () => {
    assert.equal(parseTheme("light"), "light");
    assert.equal(parseTheme("dark"), "dark");
    // Missing or junk must never leave the pane unstyled or throw.
    for (const junk of [null, undefined, "", "Light", "LIGHT", "solarized", "0"]) {
      assert.equal(parseTheme(junk as string | null | undefined), "dark", `junk: ${String(junk)}`);
    }
  });

  it("always toggles to the other theme", () => {
    assert.equal(nextTheme("dark"), "light");
    assert.equal(nextTheme("light"), "dark");
    assert.equal(nextTheme(nextTheme("dark")), "dark");
  });

  it("names each theme for display", () => {
    assert.equal(themeName("dark"), "Dark");
    assert.equal(themeName("light"), "Light");
  });

  it("labels the switch by what pressing it does", () => {
    assert.equal(themeActionLabel("dark"), "Switch to Light theme");
    assert.equal(themeActionLabel("light"), "Switch to Dark theme");
  });

  it("uses a versioned storage key, so a future shape change cannot misread an old value", () => {
    assert.match(THEME_STORAGE_KEY, /\.v\d+$/);
  });
});
