// Optional headless-browser smoke — runs only when the workflow is manually dispatched with
// run_browser_smoke=true. A lightweight version of the manual fresh-tab check:
//   /body loads, the structure inventory populates, and no console errors fire.
// Does NOT walk the full guide — that stays a manual QA pass.

import { chromium } from "playwright";

const BASE_URL = (process.env.BASE_URL || "https://anatomy-atlas-5ca.pages.dev").replace(/\/+$/, "");
const errors = [];
const browser = await chromium.launch();

try {
  const page = await browser.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${BASE_URL}/body`, { waitUntil: "domcontentloaded", timeout: 120000 });
  // The search glass (with its datalist) only appears once the scene's inventory has populated.
  await page.waitForSelector(".glass--search input", { timeout: 120000 });
  await page.waitForTimeout(1000);

  const opts = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".glass--search datalist option")).map((o) => o.value)
  );
  if (!opts.length) throw new Error("inventory never populated on /body");
  console.log(`ok  /body loaded; inventory (${opts.length}): ${opts.slice(0, 8).join(", ")}${opts.length > 8 ? ", …" : ""}`);
} finally {
  await browser.close();
}

if (errors.length) {
  console.error("console errors:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("BROWSER SMOKE PASSED — /body rendered with zero console errors.");
