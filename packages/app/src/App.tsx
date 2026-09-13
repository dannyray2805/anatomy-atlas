import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { BodyPage } from "./BodyPage";
import { HoaVolume } from "./components/HoaVolume";
import { SliceViewer } from "./components/SliceViewer";
import { ThemeToggle } from "./components/ThemeToggle";
import { DEFAULT_THEME, THEME_STORAGE_KEY, nextTheme, parseTheme, type Theme } from "./theme";

/**
 * Shell + route table.
 *
 * The product is ONE pane: `BodyPage` — a single body you peel and click into. The two
 * deep-dive datasets are deliberately NOT peer tabs any more (they competed with the body for
 * attention and left a visitor unsure which one to open): they are reached from a structure's
 * drawer or the pane's Notes & licensing panel. They keep their own URLs, so a specific view
 * can still be linked and shared.
 *
 * The old multi-tab URLs are kept as redirects so existing links do not break, and each one
 * lands on the body the old tab actually showed.
 */
/** The remembered choice, if this browser allows reading it (private mode may not). */
function readStoredTheme(): Theme {
  try {
    return parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function App() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  // The theme is a document-level attribute, so CSS — including the 3D viewing surface —
  // switches without any component needing to know about it. colorScheme keeps native form
  // controls and scrollbars in the same scheme as the app.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage unavailable; the theme still applies for this session.
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <div className="app">
        <header className="topbar">
          <h1 className="brand">
            <Link to="/">Anatomy Atlas</Link>
          </h1>
          <p className="tagline">One body, peeled and clickable — every claim sourced.</p>
          <ThemeToggle theme={theme} onToggle={() => setTheme((t) => nextTheme(t))} />
        </header>
        <Routes>
          <Route path="/" element={<BodyPage />} />
          <Route
            path="/volume"
            element={
              <div className="doc-page">
                <HoaVolume />
              </div>
            }
          />
          <Route
            path="/slices"
            element={
              <div className="doc-page">
                <SliceViewer />
              </div>
            }
          />
          {/* Legacy multi-tab URLs -> the single pane, or the deep dive they used to point at. */}
          <Route path="/body" element={<Navigate to="/?body=donor-male" replace />} />
          <Route path="/reference" element={<Navigate to="/?body=reference" replace />} />
          <Route path="/heart-3d" element={<Navigate to="/?body=donor-male" replace />} />
          <Route path="/volume/heart" element={<Navigate to="/volume" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <p className="site-credit">
          Body context: NLM Visible Human. Organ geometry: HuBMAP HRA (CC BY 4.0). Tissue volume:
          Human Organ Atlas (DOI 10.15151/ESRF-DC-1773964017). Named structures: Uberon/FMA. Not
          for diagnosis.
        </p>
      </div>
    </BrowserRouter>
  );
}
