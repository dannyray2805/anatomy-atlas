import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
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

/**
 * Document title and description per route, so a shared or indexed link says what that page is.
 * The root path is deliberately absent: the body pane owns its own title, because only it knows
 * which body and which structure are open (see BodyPage).
 */
const ROUTE_META: Record<string, { title: string; description: string }> = {
  "/volume": {
    title: "Heart tissue volume (S-20-29) — Anatomy Atlas",
    description:
      "The whole-heart HiP-CT volume of donor S-20-29, viewed live in its own viewer (DOI 10.15151/ESRF-DC-1773964017, 19.89 µm/voxel, CC BY 4.0). A fixed ex-vivo organ: camera motion only."
  },
  "/slices": {
    title: "Visible Human cross-sections — Anatomy Atlas",
    description:
      "Cryosection slices through the Visible Human body (NLM, 0.33 mm/pixel) — body-context images for orientation, not a labelled structure map."
  }
};

function Shell() {
  const { pathname } = useLocation();
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

  useEffect(() => {
    const meta = ROUTE_META[pathname];
    if (!meta) return;
    document.title = meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);
  }, [pathname]);

  return (
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
      {/*
        Document pages carry this global summary line. The body pane does NOT: its own fixed
        disclosure strip already states the sources, and a second in-flow footer would push the
        pane past the viewport — the one thing the pane is built to avoid.
      */}
      {pathname !== "/" && (
        <p className="site-credit">
          Body context: NLM Visible Human. Organ geometry: HuBMAP HRA (CC BY 4.0). Tissue volume:
          Human Organ Atlas (DOI 10.15151/ESRF-DC-1773964017). Named structures: Uberon/FMA. Not
          for diagnosis.
        </p>
      )}
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
