import {
  Component,
  Suspense,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, useProgress, type OrbitControlsImpl } from "@react-three/drei";
import { filterVisibleLayers, hasConfiguredUrl } from "../layerVisibility";
import { effectiveTransform, groupTransformProps, isSameFrame, type LayerTransform, OVERRIDES_STORAGE_KEY, parseOverrides, serializeOverrides } from "../layerTransform";
import { lookupStructure } from "../structureLookup";
import structures from "../../../../content/published/structures.json";
import { AlignPanel } from "./AlignPanel";

const HIGHLIGHT_HEX = 0xd4a017; // amber tint for the picked structure

/** Camera preset names for the P2 control rail (front / ¾ / top of the body). */
export type CameraPreset = "front" | "threequarter" | "top";

/** One searchable structure that actually exists as a named mesh in the current scene. */
export type InventoryItem = { name: string; structureId: string; label: string };

/** Imperative API BodyPage uses for search-to-fly and the guided journey. */
export type VolumeViewerHandle = {
  /** Fly the camera to a named mesh (present in the current scene) and frame it. */
  flyToName: (name: string) => void;
  /**
   * Fly to a real whole-organ heart mesh in the scene (e.g. VH_F_heart), falling back to the
   * first heart-named part if no whole-organ node is present. Uses only meshes actually in the
   * loaded GLB — never fabricated.
   */
  flyToHeartMesh: () => void;
};

/**
 * One independently toggleable 3D layer group: a single GLB rendered inside the shared
 * <Canvas>. `structureId` names the Structure the layer represents and `layer` its
 * AnatomyLayer ("organ" | "skeleton" | "muscle" | …). `transform` is an optional manual
 * registration offset (position / Y-rotation / scale) set through the dev alignment panel
 * (?align=1); when absent the layer renders at identity. Picking stays name-based, so any
 * mesh resolves through structureLookup exactly as before regardless of layer.
 */
export type LayerAsset = {
  structureId: string;
  layer: string;
  url: string;
  visible: boolean;
  /** Optional manual registration offset (dev alignment tool, ?align=1). Absent -> identity. */
  transform?: LayerTransform;
  /**
   * True when the layer's source shares the scene body's coordinate frame, so the identity
   * transform is the CORRECT registration (no manual alignment). Absent/false = different
   * frame -> may carry a human-chosen `transform` and is adjustable in ?align=1.
   */
  sameFrame?: boolean;
  /**
   * True for the heavy whole-body systems (nervous, cardiovascular, joints, lymphoid,
   * viscera): they start HIDDEN so the first paint stays light, and mount on demand when the
   * user switches them on (see layerVisibility.ts). Also marks them as the set the Layers
   * panel's "show all systems" control toggles together.
   */
  defaultHidden?: boolean;
};

type VolumeViewerProps = {
  selectedName: string | null;
  onPick: (name: string | null) => void;
  /** GLB layer groups to render in one shared <Canvas>. Empty, or every url unset -> empty state. */
  layers: LayerAsset[];
  /** Scene-wide opacity 0..1 applied to every mesh (per-layer opacity is future work). */
  opacity?: number;
  /** Currently hovered mesh name (P2) — highlighted with a lighter tint. */
  hoveredName?: string | null;
  /** Reports pointer-hover changes with viewport coordinates (for the floating label). */
  onHover?: (name: string | null, clientX?: number, clientY?: number) => void;
  /** One-shot camera preset request (P2). */
  presetRequest?: { preset: CameraPreset; n: number } | null;
  /** Idle auto-orbit around the framed body (P2). */
  autoOrbit?: boolean;
  /** Fired whenever the set of name-resolvable meshes in the scene changes (search feed). */
  onInventory?: (items: InventoryItem[]) => void;
};

// Frame the union of every currently-visible layer so its combined bounding sphere fills
// the view regardless of each GLB's units or origin offset (HRA models are authored in
// millimetres). The OrbitControls target must be aligned with the camera, otherwise the
// controls' per-frame update keeps looking at the scene origin.
function FrameScene({
  groupRef,
  frameKey,
  controlsRef
}: {
  groupRef: React.RefObject<THREE.Group | null>;
  frameKey: string;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const box = new THREE.Box3().setFromObject(group);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius, 0.001);
    const dir = new THREE.Vector3(0.3, 0.25, 1).normalize();
    const dist = (radius / Math.tan(((camera.fov ?? 45) * Math.PI) / 360)) * 1.15;
    camera.position.copy(sphere.center).addScaledVector(dir, dist);
    camera.near = Math.max(dist / 100, 0.0001);
    camera.far = dist * 100;
    camera.lookAt(sphere.center);
    camera.updateProjectionMatrix();
    const orbit = controlsRef.current;
    if (orbit) {
      orbit.target.copy(sphere.center);
      orbit.update();
    }
    invalidate();
  }, [groupRef, frameKey, camera, controlsRef, invalidate]);

  return null;
}

type LayerModelProps = {
  url: string;
  selectedName: string | null;
  hoveredName: string | null;
  onPick: (name: string | null) => void;
  onHover: (name: string | null, clientX?: number, clientY?: number) => void;
  opacity: number;
};

const WHITE = new THREE.Color(0xffffff);
function lighten(hex: number, amount: number) {
  return new THREE.Color(hex).lerp(WHITE, amount).getHex();
}

/** Load one layer GLB and attach it to the shared scene with picking + tinting hooks. */
function LayerModel({ url, selectedName, hoveredName, onPick, onHover, opacity = 1 }: LayerModelProps) {
  const { scene } = useGLTF(url);
  const invalidate = useThree((s) => s.invalidate);

  // Clone per-mesh materials once so the selection/hover tint + layer opacity never mutate the
  // shared GLB materials, then apply scene-wide opacity, selection amber, and hover lighten.
  useEffect(() => {
    const op = Number.isFinite(opacity) ? opacity : 1;
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (!mesh.userData._atlasCloned) {
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => m.clone());
        } else {
          mesh.material = mesh.material.clone();
        }
        mesh.userData._atlasCloned = true;
      }
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (!("_atlasBase" in m.userData)) {
          const c = (m as { color?: THREE.Color }).color;
          m.userData._atlasBase = c ? c.getHex() : 0xffffff;
        }
        const color = (m as { color?: THREE.Color }).color;
        if (color) {
          const base = m.userData._atlasBase as number;
          let hex = base;
          if (mesh.name === selectedName) hex = HIGHLIGHT_HEX;
          else if (mesh.name === hoveredName) hex = lighten(base, 0.32);
          color.setHex(hex);
        }
        if (op >= 1) {
          // Full opacity = fully opaque, depth-writing shell. An outer layer (skin) must
          // occlude inner layers (heart) — never let a baked transparent GLB material or a
          // stray alpha test show what should be hidden underneath.
          m.transparent = false;
          m.opacity = 1;
          m.depthWrite = true;
          m.depthTest = true;
          if ("alphaTest" in m) m.alphaTest = 0;
        } else {
          m.transparent = true;
          m.opacity = op;
          m.depthWrite = false;
        }
      }
    });
    invalidate();
  }, [scene, selectedName, hoveredName, opacity, invalidate]);

  return (
    <primitive
      object={scene}
      onClick={(e) => {
        e.stopPropagation();
        onPick(e.object.name || null);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if ((e.object as THREE.Mesh).isMesh) {
          onHover(e.object.name || null, e.nativeEvent.clientX, e.nativeEvent.clientY);
          document.body.style.cursor = "pointer";
        }
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        if ((e.object as THREE.Mesh).isMesh) {
          onHover(e.object.name || null, e.nativeEvent.clientX, e.nativeEvent.clientY);
        }
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = "auto";
      }}
    />
  );
}

type CameraAnimatorProps = {
  groupRef: React.RefObject<THREE.Group | null>;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  cmdRef: React.RefObject<{ n: number; kind: "fly" | "preset"; name?: string; preset?: CameraPreset }>;
  autoOrbit: boolean;
};

const EASE = (k: number) => (k < 0.5 ? 2 * k * k : -1 + (4 - 2 * k) * k);

function presetDir(preset: CameraPreset) {
  const d = new THREE.Vector3();
  if (preset === "front") d.set(0, 0.12, 1);
  else if (preset === "threequarter") d.set(0.55, 0.3, 1);
  else d.set(0, 1, 0.18);
  return d.normalize();
}

/**
 * Lives inside the Canvas: (a) tweens the camera for one-shot preset/fly commands posted to
 * cmdRef, and (b) applies idle auto-orbit (skipped while the user is dragging the camera).
 */
function CameraAnimator({ groupRef, controlsRef, cmdRef, autoOrbit }: CameraAnimatorProps) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const lastN = useRef(0);
  const anim = useRef<null | {
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    t: number;
    dur: number;
  }>(null);
  const interacting = useRef(false);
  const orbitOn = useRef(autoOrbit);
  orbitOn.current = autoOrbit;

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const start = () => (interacting.current = true);
    const end = () => (interacting.current = false);
    const change = () => invalidate();
    controls.addEventListener("start", start);
    controls.addEventListener("end", end);
    controls.addEventListener("change", change);
    return () => {
      controls.removeEventListener("start", start);
      controls.removeEventListener("end", end);
      controls.removeEventListener("change", change);
    };
  }, [controlsRef, invalidate]);

  // Demand frameloop: starting idle auto-orbit needs a kick so its first useFrame runs.
  useEffect(() => {
    invalidate();
  }, [autoOrbit, invalidate]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // 1) One-shot preset / fly command.
    const cmd = cmdRef.current;
    if (cmd && cmd.n !== lastN.current) {
      lastN.current = cmd.n;
      const center = controls.target.clone();
      let endPos: THREE.Vector3 | null = null;
      let endTarget = center.clone();
      if (cmd.kind === "fly" && cmd.name) {
        const obj = groupRef.current ? groupRef.current.getObjectByName(cmd.name) : null;
        if (obj) {
          const box = new THREE.Box3().setFromObject(obj);
          endTarget = box.getCenter(new THREE.Vector3());
          const radius = Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 0.005);
          const dir = camera.position.clone().sub(center);
          if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
          dir.normalize();
          const dist = (radius / Math.tan(((camera.fov ?? 45) * Math.PI) / 360)) * 2.4;
          endPos = endTarget.clone().addScaledVector(dir, Math.max(dist, 0.08));
        }
      } else if (cmd.kind === "preset") {
        const dist = Math.max(camera.position.distanceTo(center), 0.05);
        endPos = center.clone().addScaledVector(presetDir(cmd.preset ?? "front"), dist);
      }
      if (endPos) {
        anim.current = {
          startPos: camera.position.clone(),
          endPos,
          startTarget: center.clone(),
          endTarget,
          t: 0,
          dur: 0.55
        };
      }
    }

    // 2) Animate any in-flight camera tween.
    const a = anim.current;
    if (a) {
      a.t += delta;
      const k = EASE(Math.min(a.t / a.dur, 1));
      camera.position.lerpVectors(a.startPos, a.endPos, k);
      controls.target.lerpVectors(a.startTarget, a.endTarget, k);
      if (k >= 1) anim.current = null;
    } else if (orbitOn.current && !interacting.current) {
      // 3) Idle auto-orbit around the vertical axis through the controls target.
      const d = Math.min(delta, 0.05);
      const rel = camera.position.clone().sub(controls.target);
      const r = Math.hypot(rel.x, rel.z);
      if (r > 1e-6) {
        const ang = Math.atan2(rel.x, rel.z) + d * 0.4;
        camera.position.set(
          controls.target.x + Math.sin(ang) * r,
          controls.target.y + rel.y,
          controls.target.z + Math.cos(ang) * r
        );
      }
    }

    // Keep frames alive (demand frameloop) while anything is animating: an in-flight camera
    // tween, idle auto-orbit, or an active user drag. Once idle with nothing pending, stop.
    if (anim.current || orbitOn.current || interacting.current) invalidate();
  });

  return null;
}

class ViewerErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="viewer-error">
          GLB failed to load: <code>{this.state.error}</code>
        </div>
      );
    }
    return this.props.children;
  }
}

function VolumeViewerInner({
  selectedName,
  onPick,
  layers,
  opacity = 1,
  hoveredName = null,
  onHover,
  presetRequest,
  autoOrbit = false,
  onInventory,
  handle
}: VolumeViewerProps & { handle: React.Ref<VolumeViewerHandle> }) {
  const { active, progress } = useProgress();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const cmdRef = useRef<{ n: number; kind: "fly" | "preset"; name?: string; preset?: CameraPreset }>({
    n: 0,
    kind: "preset"
  });
  // Under frameloop="demand" nothing draws until invalidate() is called. Capture the store's
  // invalidate (set in onCreated) so imperative camera commands can request the frames a tween needs.
  const invalidateRef = useRef<() => void>(() => undefined);
  // Dev-only per-layer registration overrides (?align=1), keyed by structureId. The numbers
  // come from the human via AlignPanel — never from an automatic alignment heuristic.
  const [overrides, setOverrides] = useState<Record<string, LayerTransform>>(() => {
    if (typeof localStorage === "undefined") return {};
    return parseOverrides(localStorage.getItem(OVERRIDES_STORAGE_KEY));
  });
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    if (Object.keys(overrides).length === 0) {
      localStorage.removeItem(OVERRIDES_STORAGE_KEY);
    } else {
      localStorage.setItem(OVERRIDES_STORAGE_KEY, serializeOverrides(overrides));
    }
  }, [overrides]);

  useImperativeHandle(handle, () => ({
    flyToName(name: string) {
      cmdRef.current = { n: cmdRef.current.n + 1, kind: "fly", name };
      invalidateRef.current?.();
    },
    flyToHeartMesh() {
      const g = groupRef.current;
      if (!g) return;
      const find = (re: RegExp) => {
        let found: string | null = null;
        g.traverse((o) => {
          if (!found && (o as THREE.Mesh).isMesh && o.name && re.test(o.name)) found = o.name;
        });
        return found;
      };
      const name = find(/^VH_[MF]_heart$/) ?? find(/heart/i);
      if (name) {
        cmdRef.current = { n: cmdRef.current.n + 1, kind: "fly", name };
        invalidateRef.current?.();
      }
    }
  }));

  // A preset request from BodyPage posts a one-shot preset command into the camera animator.
  useEffect(() => {
    if (presetRequest) {
      cmdRef.current = {
        n: cmdRef.current.n + 1,
        kind: "preset",
        preset: presetRequest.preset
      };
      invalidateRef.current?.();
    }
  }, [presetRequest]);

  const alignMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("align") === "1";
  const applyOverride = (structureId: string, t: LayerTransform) =>
    setOverrides((prev) => ({ ...prev, [structureId]: t }));
  const clearOverrides = () => setOverrides({});

  // Only visible, configured layers mount into the scene group, so a hidden layer is fully
  // excluded from BOTH rendering and FrameScene's bounding-sphere calculation (the camera
  // reframes to fit only what remains visible via frameKey below).
  const visible = filterVisibleLayers(layers);
  const frameKey = visible.map((l) => `${l.structureId}:${l.url}`).join("|");

  // Feed BodyPage the set of name-resolvable meshes that are actually in the scene, so its
  // search only ever offers real structures present on this body/sex/layer-state.
  const scanInventory = () => {
    const g = groupRef.current;
    if (!g) return;
    const items: InventoryItem[] = [];
    const seen = new Set<string>();
    g.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.name) {
        const s = lookupStructure(structures, mesh.name);
        if (s && !seen.has(mesh.name)) {
          seen.add(mesh.name);
          items.push({ name: mesh.name, structureId: s.id, label: s.label });
        }
      }
    });
    onInventory?.(items);
  };
  useEffect(() => {
    if (active) return;
    const t = setTimeout(scanInventory, 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameKey, active]);

  // Same empty state as the single-url viewer: nothing is configured at all.
  if (!hasConfiguredUrl(layers)) {
    return (
      <div className="viewer-empty">
        <p>
          <code>VITE_HEART_GLB_MALE</code> / <code>VITE_HEART_GLB_FEMALE</code> and{" "}
          <code>VITE_SKIN_GLB_MALE</code> / <code>VITE_SKIN_GLB_FEMALE</code> are not set.
          Point them at HuBMAP VH heart + skin GLB URLs (per sex) to enable the 3D viewer.
        </p>
      </div>
    );
  }

  // Every configured layer is hidden by the user — show the same empty panel instead of an
  // empty canvas (do not crash on an empty visible set).
  if (visible.length === 0) {
    return (
      <div className="viewer-empty">
        <p>All layers are hidden. Use the Layers controls to show a layer.</p>
      </div>
    );
  }

  return (
    <>
      {alignMode && (
        <AlignPanel
          layers={visible}
          overrides={overrides}
          onApply={applyOverride}
          onClear={clearOverrides}
        />
      )}
      <ViewerErrorBoundary>
        <div className="viewer">
          {active && (
            <div className="viewer-loading">Loading body model… {Math.round(progress)}%</div>
          )}
          <Canvas
            dpr={[1, 1.5]}
            frameloop="demand"
            onCreated={({ invalidate }) => {
              invalidateRef.current = invalidate;
            }}
            camera={{ position: [0, 0, 2.4], fov: 45 }}
            onPointerMissed={() => {
              onPick(null);
              onHover?.(null);
            }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[2, 4, 3]} intensity={1.2} />
            <directionalLight position={[-3, -1, -2]} intensity={0.4} />
            <Suspense fallback={null}>
              <FrameScene groupRef={groupRef} frameKey={frameKey} controlsRef={controlsRef} />
              <group ref={groupRef}>
                {visible.map((layer) => {
                  // Same-frame layers are identity-correct by construction (Path 1: per-sex VH
                  // peel + Reference Atlas). Never apply a stored dev override to them, so a
                  // stale ?align=1 value cannot displace a correctly-nested layer.
                  const t = isSameFrame(layer)
                    ? undefined
                    : effectiveTransform(layer, overrides[layer.structureId]);
                  const g = t ? groupTransformProps(t) : undefined;
                  return (
                    <group
                      key={`${layer.structureId}:${layer.url}`}
                      position={g ? g.position : [0, 0, 0]}
                      rotation={g ? g.rotation : [0, 0, 0]}
                      scale={g ? g.scale : 1}
                    >
                      <LayerModel
                        url={layer.url}
                        selectedName={selectedName}
                        hoveredName={hoveredName}
                        onPick={onPick}
                        onHover={(name, x, y) => onHover?.(name, x, y)}
                        opacity={opacity}
                      />
                    </group>
                  );
                })}
              </group>
              <CameraAnimator
                groupRef={groupRef}
                controlsRef={controlsRef}
                cmdRef={cmdRef}
                autoOrbit={autoOrbit}
              />
            </Suspense>
            <OrbitControls ref={controlsRef} enableRotate enableZoom enablePan />
          </Canvas>
        </div>
      </ViewerErrorBoundary>
    </>
  );
}

export const VolumeViewer = forwardRef<VolumeViewerHandle, VolumeViewerProps>((props, ref) => (
  <VolumeViewerInner {...props} handle={ref} />
));
