import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { ReferenceAtlasPage, VhBodyPeelPage } from "./bodyRoutes";
import { HoaVolume } from "./components/HoaVolume";
import { SliceViewer } from "./components/SliceViewer";

const NAV_ITEMS = [
  { to: "/", end: true, label: "HOA volume" },
  { to: "/body", label: "Visible Human body" },
  { to: "/reference", label: "Reference Atlas" },
  { to: "/slices", label: "Visible Human slices" }
];

/**
 * Shell + route table only. The per-route page configs (which body to build, and that route's
 * disclosures/attribution) live in bodyRoutes.tsx; the 3D lab view lives in BodyPage.tsx and its
 * guided-peel state machine in useGuidedPeel.ts. Keeping this file small is the point.
 */
export function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="topbar">
          <h1 className="brand">Anatomy Atlas</h1>
          <nav className="nav" aria-label="Sections">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <Routes>
          <Route
            path="/"
            element={
              <div className="doc-page">
                <HoaVolume />
              </div>
            }
          />
          <Route path="/body" element={<VhBodyPeelPage />} />
          <Route path="/heart-3d" element={<Navigate to="/body" replace />} />
          <Route path="/reference" element={<ReferenceAtlasPage />} />
          <Route path="/volume/heart" element={<Navigate to="/" replace />} />
          <Route
            path="/slices"
            element={
              <div className="doc-page">
                <SliceViewer />
              </div>
            }
          />
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
