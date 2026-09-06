import { useState, type ChangeEvent, type CSSProperties } from "react";
import {
  effectiveTransform,
  isSameFrame,
  serializeOverrides,
  type LayerTransform
} from "../layerTransform";
import type { LayerAsset } from "./VolumeViewer";

type AlignPanelProps = {
  /** Visible configured layers the human can pick from (by structureId). */
  layers: LayerAsset[];
  /** Per-structureId overrides currently applied to the scene (persisted locally). */
  overrides: Record<string, LayerTransform>;
  /** Push a new transform for a layer — applied live to the rendered scene. */
  onApply: (structureId: string, t: LayerTransform) => void;
  /** Drop every override so layers fall back to their committed layers.ts transforms. */
  onClear: () => void;
};

const boxStyle: CSSProperties = {
  border: "1px solid #d8d2c5",
  borderRadius: 6,
  background: "#faf7f0",
  padding: "0.55rem 0.75rem",
  marginBottom: "0.75rem",
  fontSize: "0.85rem"
};
const rowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem 0.9rem",
  alignItems: "center",
  marginTop: "0.35rem"
};
const labelStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.25rem"
};
const numStyle: CSSProperties = { width: 72 };

function toFinite(s: string, fallback: number): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Dev-only manual per-layer alignment panel (?align=1). Only layers from a DIFFERENT
 * coordinate frame than the body appear here — same-frame layers (e.g. Z-Anatomy parts into
 * the Z-Anatomy body) are identity-correct and are listed but not adjustable. Tweaks are
 * scratch overrides persisted to localStorage; "Copy all overrides (JSON)" is the single
 * hand-off to bake the whole set into committed layers.ts.
 */
export function AlignPanel({ layers, overrides, onApply, onClear }: AlignPanelProps) {
  const alignable = layers.filter((l) => !isSameFrame(l));
  const sameFrame = layers.filter(isSameFrame);
  const [selectedId, setSelectedId] = useState<string | undefined>(() => alignable[0]?.structureId);
  const [copied, setCopied] = useState(false);
  const selected = alignable.find((l) => l.structureId === selectedId) ?? alignable[0];

  const flash = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash();
    } catch {
      /* clipboard unavailable (e.g. non-secure context) — ignore */
    }
  };

  const hasOverrides = Object.keys(overrides).length > 0;
  const copyAllOverrides = () => copyText(serializeOverrides(overrides));

  const actionRow = (
    <div style={rowStyle}>
      <button type="button" onClick={() => void copyAllOverrides()} disabled={!hasOverrides}>
        Copy all overrides (JSON)
      </button>
      <button type="button" onClick={onClear} disabled={!hasOverrides}>
        Clear overrides
      </button>
      {copied && <span style={{ color: "#2a6a2a" }}>copied</span>}
    </div>
  );

  if (!selected) {
    return (
      <div style={boxStyle} role="group" aria-label="Align layers (dev)">
        <strong>Align layers (dev)</strong> — manual registration only, never automatic.
        <div style={rowStyle}>
          All layers share the body&apos;s coordinate frame — identity is correct, so no
          manual registration is needed here.
        </div>
        {sameFrame.length > 0 && (
          <div style={rowStyle}>
            Same-frame layers: {sameFrame.map((l) => l.structureId).join(", ")}.
          </div>
        )}
        {actionRow}
      </div>
    );
  }

  const current = effectiveTransform(selected, overrides[selected.structureId]);

  const update = (t: LayerTransform) => {
    onApply(selected.structureId, {
      position: [t.position[0], t.position[1], t.position[2]],
      rotationY: t.rotationY,
      scale: t.scale
    });
  };

  const setPosition =
    (axis: 0 | 1 | 2) => (e: ChangeEvent<HTMLInputElement>) => {
      const p: [number, number, number] = [
        current.position[0],
        current.position[1],
        current.position[2]
      ];
      p[axis] = toFinite(e.target.value, current.position[axis]);
      update({ ...current, position: p });
    };

  const setNumber =
    (field: "rotationY" | "scale") => (e: ChangeEvent<HTMLInputElement>) => {
      const v = toFinite(e.target.value, current[field]);
      update({ ...current, [field]: v });
    };

  const copySingleJson = () =>
    copyText(
      JSON.stringify({
        position: current.position,
        rotationY: current.rotationY,
        scale: current.scale
      })
    );

  const axes: Array<0 | 1 | 2> = [0, 1, 2];
  const axisNames = ["x", "y", "z"] as const;

  return (
    <div style={boxStyle} role="group" aria-label="Align layers (dev)">
      <strong>Align layers (dev)</strong> — manual registration only, never automatic.
      {sameFrame.length > 0 && (
        <div style={rowStyle}>
          Same-frame (no registration): {sameFrame.map((l) => l.structureId).join(", ")}.
        </div>
      )}
      <div style={rowStyle}>
        <label style={labelStyle}>
          Layer{" "}
          <select value={selected.structureId} onChange={(e) => setSelectedId(e.target.value)}>
            {alignable.map((l) => (
              <option key={l.structureId} value={l.structureId}>
                {l.structureId} ({l.layer})
              </option>
            ))}
          </select>
        </label>
        {axes.map((axis, i) => (
          <label key={axisNames[i]} style={labelStyle}>
            pos.{axisNames[i]}
            <input
              type="number"
              step={0.01}
              style={numStyle}
              value={current.position[axis]}
              onChange={setPosition(axis)}
            />
          </label>
        ))}
        <label style={labelStyle}>
          rotY°
          <input
            type="number"
            step={1}
            style={numStyle}
            value={current.rotationY}
            onChange={setNumber("rotationY")}
          />
        </label>
        <label style={labelStyle}>
          scale
          <input
            type="number"
            step={0.01}
            style={numStyle}
            value={current.scale}
            onChange={setNumber("scale")}
          />
        </label>
        <button type="button" onClick={() => void copySingleJson()}>
          Copy transform JSON
        </button>
      </div>
      <div style={rowStyle}>
        <code>
          {JSON.stringify({
            position: current.position,
            rotationY: current.rotationY,
            scale: current.scale
          })}
        </code>
      </div>
      {actionRow}
    </div>
  );
}

