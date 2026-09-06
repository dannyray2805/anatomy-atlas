import { useEffect, useState } from "react";

// An empty/unset VITE_VH_SLICE_BASE must fall back to the local fixtures base.
const BASE = (import.meta.env.VITE_VH_SLICE_BASE ?? "").trim() || "/vh-fixtures";

type SliceMetadata = {
  source_id: string;
  acknowledgment: string;
  region: string;
  width_px: number;
  height_px: number;
  pixel_size_mm: number;
  slice_spacing_mm: number;
  interpolation: string;
  fixtures?: boolean;
  fixture_note?: string;
  slices: string[];
};

export function SliceViewer() {
  const [meta, setMeta] = useState<SliceMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch(`${BASE}/metadata.json`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`metadata.json ${r.status}`);
        return r.json() as Promise<SliceMetadata>;
      })
      .then(setMeta)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) {
    return (
      <div className="data-missing">
        <h2>DATA_MISSING</h2>
        <p>Slice metadata failed to load: <code>{error}</code></p>
      </div>
    );
  }

  if (!meta) {
    return <div className="data-missing"><p>Loading slice metadata…</p></div>;
  }

  const src = `${BASE}/${meta.slices[index]}`;

  return (
    <section className="slices-page">
      <h2>Visible Human — {meta.region} axial slices</h2>
      {meta.fixtures && (
        <p className="fixture-badge">FIXTURE — placeholder images, not real VH slices</p>
      )}
      <figure className="slice-frame">
        <img src={src} alt={`slice ${index}`} className="slice-img" />
        <figcaption>
          {meta.slices[index]} — nearest-neighbour only, no interpolated slices
        </figcaption>
      </figure>
      <div className="slice-controls">
        <label htmlFor="slice-index">
          Z index: {index} / {meta.slices.length - 1}
        </label>
        <input
          id="slice-index"
          type="range"
          min={0}
          max={meta.slices.length - 1}
          step={1}
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
        />
      </div>
      <dl className="sidebar slice-meta">
        <dt>Source</dt>
        <dd>{meta.source_id}</dd>
        <dt>Pixel size</dt>
        <dd>{meta.pixel_size_mm} mm</dd>
        <dt>Slice spacing</dt>
        <dd>{meta.slice_spacing_mm} mm</dd>
        <dt>Interpolation</dt>
        <dd>{meta.interpolation}</dd>
      </dl>
      <p className="note">{meta.acknowledgment}.</p>
      {meta.fixture_note && <p className="note">{meta.fixture_note}</p>}
    </section>
  );
}
