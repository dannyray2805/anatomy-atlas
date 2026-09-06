#!/usr/bin/env python3
"""Headless Blender export of named collections to glTF Binary (.glb).

Run with a Blender binary (3.x-5.x, glTF exporter enabled):

    blender --background --python packages/tools/export_layers.py -- \
        <input.blend> <collection1> <out1.glb> [<collection2> <out2.glb> ...]

Every second argument after the input .blend is a collection name; the following
argument is the output .glb path. Collections are exported EXACTLY as named -- never
renamed, merged, substituted, or reinterpreted here, and geometry is not simplified,
retopologized, or decimated.

Task N: exports are GEOMETRY ONLY. Within each named collection only objects of
type 'MESH' are selected for the GLB; FONT (text labels) and CURVE/EMPTY annotation
objects are excluded so no floating label text ships in the model. The label text is
captured separately by packages/tools/extract_labels.py. The source .blend is never
modified on disk (opened fresh in memory; never saved).

Optional flag: `--exclude <object name>` may appear anywhere after the .blend (one
per object, applied to every exported collection). It drops a HUMAN-SPECIFIED
non-geometry MESH object that the type filter alone would keep -- e.g. a floating
collection-title text glyph stored as a MESH rather than a FONT. Exclusions are
explicit by exact object name; they are never inferred from geometry or proximity.

Exit codes: 0 = all pairs exported; 1 = usage / collection / export error; 2 = not
running inside Blender.
"""

import os
import sys

try:
    import bpy
except ImportError:  # pragma: no cover - only reachable outside Blender
    print(
        "ERROR: this script must run inside Blender "
        "(blender --background --python export_layers.py -- ...)",
        file=sys.stderr,
    )
    sys.exit(2)


def log(msg: str) -> None:
    print(msg, flush=True)


def err(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def parse_args():
    # Blender consumes its own flags up to the first `--`; script args follow it.
    if "--" in sys.argv:
        argv = sys.argv[sys.argv.index("--") + 1 :]
    else:
        argv = []
    if not argv:
        return None
    blend = os.path.abspath(argv[0])
    rest = argv[1:]
    pairs = []
    excludes = []
    i = 0
    while i < len(rest):
        tok = rest[i]
        if tok == "--exclude":
            if i + 1 >= len(rest):
                return None
            excludes.append(rest[i + 1])
            i += 2
            continue
        # Otherwise the next two tokens are a (collection, out) pair.
        if i + 1 >= len(rest):
            return None
        pairs.append((tok, os.path.abspath(rest[i + 1])))
        i += 2
    if not pairs:
        return None
    return blend, pairs, excludes


def ensure_gltf_exporter() -> bool:
    if hasattr(bpy.ops.export_scene, "gltf"):
        return True
    try:
        bpy.ops.preferences.addon_enable(module="io_scene_gltf2")
    except Exception:
        pass
    return hasattr(bpy.ops.export_scene, "gltf")


def find_collection(root, name):
    """Find a collection by exact name under `root`, recursively."""
    for child in root.children:
        if child.name == name:
            return child
    for child in root.children:
        hit = find_collection(child, name)
        if hit is not None:
            return hit
    return None


def select_only(objs) -> None:
    """Deselect everything, then select exactly `objs` in the active view layer."""
    view_layer = bpy.context.view_layer
    for o in list(view_layer.objects):
        o.select_set(False, view_layer=view_layer)
    for o in objs:
        try:
            o.hide_set(False)
        except Exception:
            pass
        o.select_set(True, view_layer=view_layer)
    if objs and view_layer.objects.active not in objs:
        view_layer.objects.active = objs[0]


def mesh_stats(objs):
    """Return (mesh_count, vertex_count, triangle_count) over unique mesh data."""
    verts = 0
    tris = 0
    seen = set()
    for o in objs:
        if o.type != "MESH":
            continue
        m = o.data
        if m is None or id(m) in seen:
            continue
        seen.add(id(m))
        verts += len(m.vertices)
        for p in m.polygons:
            if len(p.vertices) >= 3:
                tris += len(p.vertices) - 2
    return len(seen), verts, tris


def main() -> None:
    parsed = parse_args()
    if parsed is None:
        err(
            "usage: blender --background --python export_layers.py -- "
            "<input.blend> <collection> <out.glb> [<collection> <out.glb> ...] "
            "[--exclude <object name> ...]"
        )
        sys.exit(1)

    blend, pairs, excludes = parsed
    if not os.path.isfile(blend):
        err(f"ERROR: input .blend not found: {blend}")
        sys.exit(1)
    if not ensure_gltf_exporter():
        err(
            "ERROR: glTF 2.0 exporter is not available in this Blender build "
            "(io_scene_gltf2). Enable it and retry."
        )
        sys.exit(1)

    log(f"opening {blend}")
    try:
        bpy.ops.wm.open_mainfile(filepath=blend)
    except Exception as exc:  # noqa: BLE001 - surface any Blender open error
        err(f"ERROR: failed to open {blend}: {exc}")
        sys.exit(1)

    scene = bpy.context.scene
    root = scene.collection
    scene_names = {o.name for o in root.all_objects}

    # Resolve every requested collection up front so a typo never produces a partial
    # run or a silently skipped export.
    resolved = []  # (collection, out_path)
    missing = []
    for name, out in pairs:
        col = find_collection(root, name)
        if col is None:
            missing.append(name)
        else:
            resolved.append((col, out))

    if missing:
        for name in missing:
            err(f'ERROR: collection not found: "{name}"')
        err("No files were written. Fix the collection name(s) above and rerun.")
        sys.exit(1)

    for col, out in resolved:
        # Only objects actually present in the active scene.
        objs = [o for o in col.all_objects if o.name in scene_names]
        if not objs:
            err(
                f'ERROR: collection "{col.name}" contains no objects in the '
                "active scene"
            )
            sys.exit(1)

        # Task N: export geometry only. FONT (text labels) and any CURVE/annotation
        # objects are excluded from the GLB. Labels are captured separately by
        # packages/tools/extract_labels.py (never guessed by proximity here).
        excluded_types = sorted({o.type for o in objs} - {"MESH"})
        objs = [o for o in objs if o.type == "MESH"]
        if not objs:
            err(
                f'ERROR: collection "{col.name}" has no MESH objects to export '
                "(only " + ", ".join(excluded_types) + " present)"
            )
            sys.exit(1)
        if excluded_types:
            log(
                f'     "{col.name}": excluding non-MESH from export '
                f"({', '.join(excluded_types)})"
            )

        # Human-specified exclusions (exact object names, never inferred).
        if excludes:
            dropped = [o for o in objs if o.name in excludes]
            if dropped:
                objs = [o for o in objs if o.name not in excludes]
                log(
                    f'     "{col.name}": dropping --exclude object(s) '
                    + ", ".join(sorted(o.name for o in dropped))
                )
        if not objs:
            err(f'ERROR: collection "{col.name}" has nothing left to export')
            sys.exit(1)

        select_only(objs)
        os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
        try:
            bpy.ops.export_scene.gltf(
                filepath=out,
                export_format="GLB",
                use_selection=True,
            )
        except Exception as exc:  # noqa: BLE001 - surface any export error
            err(f'ERROR: glTF export failed for "{col.name}" -> {out}: {exc}')
            sys.exit(1)

        if not os.path.isfile(out):
            err(f'ERROR: export reported success but no file at {out}')
            sys.exit(1)

        n_mesh_data, verts, tris = mesh_stats(objs)
        size = os.path.getsize(out)
        log(f'[ok] "{col.name}" -> {out}')
        log(
            f"     MESH objects selected: {len(objs)} | unique mesh data: "
            f"{n_mesh_data} | vertices: {verts} | triangles: {tris}"
        )
        log(f"     file size: {size} bytes")

    log("done.")
    sys.exit(0)


if __name__ == "__main__":
    main()
