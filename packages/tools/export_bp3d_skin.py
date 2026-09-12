#!/usr/bin/env python3
"""Export the BodyParts3D whole-body skin to GLB, placed in the Z-Anatomy body frame.

Run with a Blender binary (3.x-5.x, glTF exporter enabled):

    blender --background --python packages/tools/export_bp3d_skin.py -- \
        <skin.obj> <out.glb>

Source: BodyParts3D 4.0, `partof_BP3D_4.0_obj_99.zip` entry `FJ2810.obj`
(Representation ID BP10155, Concept ID FMA7163 "Skin") -- the SINGLE whole-body skin in
that archive, hence the same individual as the Z-Anatomy systems (Z-Anatomy is a
retopologised BodyParts3D derivative). License CC BY-SA 2.1 Japan: the derived GLB is a
derivative and must be published under compatible terms (see docs/sources.md).

WHY A TRANSFORM IS NEEDED (measured, not assumed -- see the Phase 1d verification):

1. UNITS. The file is in MILLIMETRES; Z-Anatomy is in metres. scale = 0.001.
2. AXES. `forward_axis="Y", up_axis="Z"` is the mapping that reproduces the file's own
   header bounds exactly (i.e. identity). Two plausible-looking alternatives are WRONG:
   Blender's OBJ default (forward=-Z, up=Y) LAYS THE BODY DOWN, and forward=-Y/up=Z --
   the intuitive "this file is Z-up" choice -- silently ROTATES 180 degrees about Z.
3. TRANSLATION. The two sources do NOT share an origin. Placed at identity the skin sits
   11.6 cm off in Y and 8.5 cm off in Z. The translation below is the mean of what THREE
   NAMED LANDMARKS imply (Mandible FMA52748, Nasal bone.r FMA53647, Manubrium FMA7486,
   each measured in both sources; they agree with each other within ~7 mm), and an
   independent envelope-centring fit agrees with it within 5.5 mm.

   NO ROTATION and NO SCALE are applied: the landmark evidence shows the orientation is
   already identity (right-side structures are at -X in both sources, the face is at -Y in
   both), and per-structure size ratios scatter 0.97-1.20 -- i.e. sizes are not a usable
   scale estimator for this pair, while positions are.

   KNOWN RESIDUAL, deliberately not hidden: with this transform the skin contains the
   Z-Anatomy body on Y (+17.2 mm margin) and Z (+11.2 mm margin), but the body's MUSCLE
   surface is ~1.8 mm wider than the skin at the extreme X (0.3354 vs 0.334119 / 0.332825).
   That 1.8 mm is left as-is rather than scaled away, because a scale would not be
   supported by the landmark evidence.

The transform is BAKED into the mesh data, so the exported GLB is already in the Z-Anatomy
body frame with an identity node transform and can be layered as a same-frame asset.

WINDING REPAIR: the source mesh arrives with INCONSISTENT face winding -- recalculating
"outside" reverses ~46 % of its 203,382 faces (measured, not assumed). With backface culling,
which three.js does by default, those faces are invisible from outside, so the skin renders
with holes through which whatever is behind it shows. The export makes the winding consistent
and outward-facing. No vertex moves: the surface is identical, only which side is "front"
changes. (This also means a normal-based inside/outside test on the raw source is meaningless,
and the mesh is NOT watertight -- it has ~1,500 boundary edges.)
"""

import os
import sys

try:
    import bpy
    from mathutils import Matrix, Vector
except ImportError:  # pragma: no cover - only reachable outside Blender
    print(
        "ERROR: this script must run inside Blender "
        "(blender --background --python export_bp3d_skin.py -- ...)",
        file=sys.stderr,
    )
    sys.exit(2)

SCALE = 0.001  # millimetres -> metres

# Mean of the three landmark-implied translations (metres).
TRANSLATION = Vector((0.000507, 0.092159, 0.073328))

# The file's own header bounds, in millimetres (FJ2810.obj, "# Bounds(mm): ..."). Used as a
# self-check: if the import axes or the input file are wrong, these will not match and the
# script stops instead of exporting a misplaced body.
EXPECTED_RAW_MIN_MM = Vector((-334.119000, -246.783000, -78.111200))
EXPECTED_RAW_MAX_MM = Vector((332.825000, 45.248000, 1641.360000))
TOLERANCE_M = 1e-4


def log(msg: str) -> None:
    print(msg, flush=True)


def err(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if len(argv) < 2:
        return None
    return os.path.abspath(argv[0]), os.path.abspath(argv[1])


def repair_winding(obj) -> int:
    """Make face winding consistent and outward-facing. Returns the number of faces flipped.

    The BodyParts3D skin arrives with INCONSISTENT winding: about 46 % of its 203,382 faces
    are wound backwards (measured by recalculating and counting reversals). With a renderer
    that culls backfaces -- three.js does, by default -- those faces are invisible from
    outside, so the viewer sees THROUGH the skin to whatever is behind it. That is a
    rendering defect, not a fit problem, and it also invalidates any normal-based
    inside/outside test of this mesh.

    This changes winding and normals only; no vertex is moved, so the surface is unchanged.
    """
    mesh = obj.data
    before = [p.normal.copy() for p in mesh.polygons]

    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    try:
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode="OBJECT")
    except Exception as exc:  # noqa: BLE001 - surface any failure
        err(f"ERROR: could not recalculate normals: {exc}")
        sys.exit(1)

    flipped = sum(1 for old, p in zip(before, mesh.polygons) if old.dot(p.normal) < 0.0)
    mesh.update()
    return flipped


def mesh_bounds(objects):
    lo = Vector((1e18, 1e18, 1e18))
    hi = Vector((-1e18, -1e18, -1e18))
    for o in objects:
        for v in o.data.vertices:
            w = o.matrix_world @ v.co
            for i in range(3):
                lo[i] = min(lo[i], w[i])
                hi[i] = max(hi[i], w[i])
    return lo, hi


def main() -> None:
    parsed = parse_args()
    if parsed is None:
        err("usage: blender --background --python export_bp3d_skin.py -- <skin.obj> <out.glb>")
        sys.exit(1)
    src, out = parsed
    if not os.path.isfile(src):
        err(f"ERROR: input not found: {src}")
        sys.exit(1)
    if not hasattr(bpy.ops.wm, "obj_import"):
        err("ERROR: bpy.ops.wm.obj_import is unavailable (Blender 4.0+ required)")
        sys.exit(1)

    # Start from an empty scene: the default startup objects would otherwise be exported too.
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    before = set(bpy.data.objects)
    bpy.ops.wm.obj_import(
        filepath=src, forward_axis="Y", up_axis="Z", global_scale=SCALE
    )
    imported = [o for o in bpy.data.objects if o not in before]
    if not imported:
        err("ERROR: import produced no objects")
        sys.exit(1)

    raw_lo, raw_hi = mesh_bounds(imported)
    log(f"imported {len(imported)} object(s) from {src}")
    log(f"  raw bounds (m): min=({raw_lo.x:.6f},{raw_lo.y:.6f},{raw_lo.z:.6f}) "
        f"max=({raw_hi.x:.6f},{raw_hi.y:.6f},{raw_hi.z:.6f})")

    # Self-check: the imported bounds must equal the file's own header bounds / 1000.
    exp_lo = EXPECTED_RAW_MIN_MM * SCALE
    exp_hi = EXPECTED_RAW_MAX_MM * SCALE
    if (raw_lo - exp_lo).length > TOLERANCE_M or (raw_hi - exp_hi).length > TOLERANCE_M:
        err(
            "ERROR: imported bounds do not match the source file's declared bounds -- "
            "wrong file, or wrong axis mapping. Expected "
            f"min=({exp_lo.x:.6f},{exp_lo.y:.6f},{exp_lo.z:.6f}) "
            f"max=({exp_hi.x:.6f},{exp_hi.y:.6f},{exp_hi.z:.6f}); aborting rather than "
            "exporting a misplaced body."
        )
        sys.exit(1)
    log("  self-check ok: bounds match FJ2810.obj header / 1000 (identity axes)")

    for o in imported:
        flipped = repair_winding(o)
        log(
            f"  winding repaired: {flipped} of {len(o.data.polygons)} faces reversed "
            f"({100.0 * flipped / len(o.data.polygons):.2f} %) so normals face outward"
        )

    # Bake: existing object transform into the mesh, then the frame translation, so the
    # exported node transform is identity. Done at the data level to avoid operator context.
    for o in imported:
        o.data.transform(o.matrix_world)
        o.matrix_world = Matrix.Identity(4)
        o.data.transform(Matrix.Translation(TRANSLATION))
        o.data.update()

    placed_lo, placed_hi = mesh_bounds(imported)
    log(f"  placed bounds (m): min=({placed_lo.x:.6f},{placed_lo.y:.6f},{placed_lo.z:.6f}) "
        f"max=({placed_hi.x:.6f},{placed_hi.y:.6f},{placed_hi.z:.6f})")
    log(f"  translation applied: ({TRANSLATION.x:+.6f},{TRANSLATION.y:+.6f},{TRANSLATION.z:+.6f})")

    verts = sum(len(o.data.vertices) for o in imported)
    tris = 0
    for o in imported:
        for p in o.data.polygons:
            if len(p.vertices) >= 3:
                tris += len(p.vertices) - 2

    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    try:
        bpy.ops.export_scene.gltf(filepath=out, export_format="GLB")
    except Exception as exc:  # noqa: BLE001 - surface any export error
        err(f"ERROR: glTF export failed: {exc}")
        sys.exit(1)
    if not os.path.isfile(out):
        err(f"ERROR: export reported success but no file at {out}")
        sys.exit(1)

    log(f"[ok] {out}")
    log(f"     objects: {len(imported)} | vertices: {verts} | triangles: {tris}")
    log(f"     file size: {os.path.getsize(out)} bytes")
    sys.exit(0)


if __name__ == "__main__":
    main()
