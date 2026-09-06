import { useState } from "react";

const ZARR_URL = import.meta.env.VITE_HOA_HEART_ZARR;
const DOI = import.meta.env.VITE_HOA_HEART_DOI;
const VOXEL_UM = import.meta.env.VITE_HOA_HEART_VOXEL_UM;
const LICENSE = import.meta.env.VITE_HOA_HEART_LICENSE ?? "CC BY 4.0";
const PORTAL = import.meta.env.VITE_HOA_HEART_PORTAL ?? "https://human-organ-atlas.esrf.eu";
const PORTAL_HOST = (() => {
  try {
    return new URL(PORTAL).host;
  } catch {
    return PORTAL;
  }
})();

// Official HOA/UCL cinematic hero. This slot is ONLY for media ESRF/UCL published for the
// S-20-29 heart (DOI 10.15151/ESRF-DC-1773964017, CC BY 4.0). It must NEVER hold a generated
// or mesh-reconstructed image. Set VITE_HOA_HERO (and optional VITE_HOA_HERO_POSTER) to the
// Worker/same-origin media URL once an OFFICIAL file (source: incoming/hoa-s20-29-hero.webm/.jpg)
// is published to R2. The caption below states exactly what the published media is (currently a
// CONTROL heart cinematic, NOT donor S-20-29). Empty => hero hidden, explorer is the first view.
const HERO_URL = (import.meta.env.VITE_HOA_HERO ?? "").trim();
const HERO_POSTER = (import.meta.env.VITE_HOA_HERO_POSTER ?? "").trim();
const HERO_MP4 = (import.meta.env.VITE_HOA_HERO_MP4 ?? "").trim();
const HERO_IS_IMAGE = /\.(jpe?g|png|webp|gif)$/i.test(HERO_URL);

const missing = <span className="missing">DATA_MISSING</span>;

export function HoaVolume() {
  const [iframeLoaded, setIframeLoaded] = useState(false);

  if (!ZARR_URL) {
    return (
      <div className="data-missing">
        <h2>DATA_MISSING</h2>
        <p>
          <code>VITE_HOA_HEART_ZARR</code> is not set. Add the HOA S-20-29 Neuroglancer URL in{" "}
          <code>packages/app/.env</code> to embed the volume. The URL is never guessed.
        </p>
      </div>
    );
  }

  const voxel = Number(VOXEL_UM);
  const hasVoxel = Number.isFinite(voxel) && voxel > 0;
  const isCellular = hasVoxel && voxel <= 2;

  return (
    <section className="volume-page">
      <p className="banner">
        HOA volume — S-20-29 complete scan{hasVoxel ? `, ${voxel} µm/voxel` : ""}
        {DOI ? `, DOI ${DOI}` : ""}.
      </p>
      <h2>Heart — HOA HiP-CT volume (male donor S-20-29)</h2>
      {HERO_URL && (
        <figure className="preview-figure">
          {HERO_IS_IMAGE ? (
            <img
              className="preview-video"
              src={HERO_URL}
              alt="Cinematic rendering of a control adult heart (Brunet et al., Radiology 2024, Movie 1) — not donor S-20-29"
            />
          ) : (
            <video
              className="preview-video"
              poster={HERO_POSTER || undefined}
              controls
              muted
              loop
              playsInline
              preload="metadata"
            >
              <source src={HERO_URL} type="video/webm" />
              {HERO_MP4 && <source src={HERO_MP4} type="video/mp4" />}
            </video>
          )}
          <figcaption>
            Cinematic rendering of a control adult heart from HiP-CT (Brunet et al.,{" "}
            <em>Radiology</em> 2024, Movie 1).
            <br />
            Render: Siemens Healthineers Cinematic Anatomy. Data: UCL-led ESRF beamtime 1290.
            <br />
            <strong>Not</strong> HOA donor S-20-29. The live explorer below is S-20-29 (
            {DOI ? `DOI ${DOI}` : "DOI 10.15151/ESRF-DC-1773964017"},{" "}
            {hasVoxel ? `${voxel} µm/voxel` : "19.89 µm/voxel"}, CC BY 4.0).
            <br />
            Fixed ex-vivo organ — camera motion only, not a beating heart.
          </figcaption>
        </figure>
      )}
      <div className="volume-iframe-wrap">
        {!iframeLoaded && (
          <div className="volume-loading">Loading live volume (S-20-29, 19.89 µm)…</div>
        )}
        <iframe
          title="HOA heart volume (Neuroglancer)"
          src={ZARR_URL}
          onLoad={() => setIframeLoaded(true)}
        />
      </div>
      <p className="portal-open">
        <a href={PORTAL} target="_blank" rel="noreferrer">
          Open this volume on human-organ-atlas.esrf.fr ↗
        </a>
      </p>
      <dl className="sidebar volume-meta">
        <dt>Dataset DOI</dt>
        <dd>{DOI ? <code>{DOI}</code> : missing}</dd>
        <dt>Voxel size</dt>
        <dd>{hasVoxel ? `${voxel} µm` : missing}</dd>
        <dt>License</dt>
        <dd>{LICENSE}</dd>
        <dt>Portal</dt>
        <dd>
          <a href={PORTAL} target="_blank" rel="noreferrer">
            {PORTAL_HOST}
          </a>
        </dd>
      </dl>
      {hasVoxel && (
        <p className="note">
          {isCellular
            ? "HiP-CT voxel ≤ 2 µm — the dataset claims cellular-level detail."
            : "HiP-CT voxel > 2 µm — tissue-scale data, not cellular resolution."}
        </p>
      )}
      <p className="note">Volume is embedded as-is; it is not converted to a GLB.</p>
    </section>
  );
}
