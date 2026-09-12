#!/usr/bin/env python3
"""Headless Blender export of named collections to glTF Binary (.glb).

Run with a Blender binary (3.x-5.x, glTF exporter enabled):

    blender --background --python packages/tools/export_layers.py -- \
        <input.blend> <collection1> <out1.glb> [<collection2> <out2.glb> ...]

Every second argument after the input .blend is a collection name; the following
argument is the output .glb path. Collections are exported EXACTLY as named -- never
renamed, merged, substituted, or reinterpreted here, and geometry is not simplified,
retopologized, or decimated.

Task N: exports are GEOMETRY ONLY. Within each named collection, MESH objects are
selected for the GLB and FONT (text labels) is excluded, so no floating label text
ships in the model. Label text is captured separately by
packages/tools/extract_labels.py. The source .blend is never modified on disk
(opened fresh in memory; never saved).

Phase 1a: CURVE objects are anatomical geometry in this source, not annotation -- 946
of 951 curves carry a bevel profile (bevel_depth 0.0005, i.e. 0.5 mm tubes at metre
scale) and are named tubular structures (nerves, vessels, bronchi). They are therefore
converted to MESH in memory and exported, with the authored bevel profile left exactly
as-is: no bevel_resolution change, no smoothing, no remeshing. A curve that yields no
surface (no bevel) cannot be represented in glTF, which has no line primitive, so it is
dropped with an explicit log line -- never silently. Before Phase 1a the wholesale
CURVE exclusion silently dropped the entire vessel/nerve/bronchus tree (the
cardiovascular collection alone is 654 CURVE vs 60 MESH).

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


def convert_curves_to_mesh(curves):
    """Replace CURVE objects with equivalent MESH objects, in the transient scene only.

    Conversion is done at the DATA level (``meshes.new_from_object`` on the evaluated
    object) instead of with ``bpy.ops.object.convert``. The operator was measured to
    return ``{'CANCELLED'}`` and change nothing for curves that live inside hidden layer
    collections -- which is most of this source -- so it would silently export nothing.
    Evaluating the object applies the authored bevel profile exactly as rendered: no
    resampling, smoothing, simplification, or remeshing.

    Each replacement keeps the original object's NAME (what ``structures.json``
    ``mesh_names`` resolve against), its world matrix, and its collection links, so the
    exported scene graph is unchanged apart from the object's data type. Parent
    relationships are deliberately not re-created: placement is baked into the world
    matrix, so the exported position is identical.

    Returns the replacement MESH objects plus the names of curves that produced no
    surface (an unbeveled curve has no surface, and glTF has no line primitive, so it
    cannot ship -- reported rather than dropped silently). A curve that fails to
    evaluate is a hard error rather than a silent omission.

    TWO PASSES, deliberately. Everything is evaluated FIRST, against a single depsgraph,
    and the scene is only mutated afterwards. Evaluating and mutating in the same loop
    forces a fresh ``evaluated_depsgraph_get()`` per curve, and on this source that means
    re-evaluating a ~7,200-object scene with geometry nodes once per curve -- measured at
    >10 minutes without completing a 654-curve collection. Since nothing is mutated while
    evaluating, one depsgraph stays valid for the whole first pass.
    """
    # Pass 1 -- evaluate only (no scene mutation, so one depsgraph stays valid).
    depsgraph = bpy.context.evaluated_depsgraph_get()
    prepared = []  # (name, matrix_world, collections, mesh)
    no_surface = []
    for obj in curves:
        evaluated = obj.evaluated_get(depsgraph)
        try:
            mesh = bpy.data.meshes.new_from_object(evaluated)
        except Exception as exc:  # noqa: BLE001 - surface any evaluation error
            err(f"ERROR: could not evaluate curve '{obj.name}' to a mesh: {exc}")
            sys.exit(1)
        if len(mesh.polygons) == 0:
            bpy.data.meshes.remove(mesh)
            no_surface.append(obj.name)
            continue
        prepared.append(
            (obj.name, obj.matrix_world.copy(), list(obj.users_collection), mesh)
        )

    # Pass 2 -- mutate. Removing objects invalidates the depsgraph and the view layer,
    # which is exactly why every evaluation above happens before this point.
    replaced = []
    for name, matrix_world, collections, mesh in prepared:
        # Objects are looked up by name rather than held by reference, so a reference
        # can never outlive the object it points at.
        original = bpy.data.objects.get(name)
        if original is None:
            err(f"ERROR: curve '{name}' vanished before conversion")
            sys.exit(1)
        # Remove the curve FIRST so the replacement can take the exact original name
        # (Blender would otherwise suffix it with .001 while the curve still exists).
        bpy.data.objects.remove(original, do_unlink=True)
        new = bpy.data.objects.new(name, mesh)
        new.matrix_world = matrix_world
        for coll in collections:
            coll.objects.link(new)
        replaced.append(new)

    missing = [o for o in replaced if o.type != "MESH"]
    if missing:
        err(
            "ERROR: curve -> mesh conversion did not yield a MESH for: "
            + ", ".join(sorted(o.name for o in missing)[:10])
        )
        sys.exit(1)

    # Removing and linking objects invalidates the view layer; without this the next
    # select/serialize pass can observe stale (None) object bases.
    bpy.context.view_layer.update()
    return replaced, no_surface


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

        # Task N + Phase 1a: export geometry only -- MESH objects, plus CURVE objects
        # converted to mesh below (they are real tubular anatomy here, not labels).
        # FONT (text) and every other object type stay excluded. Labels are captured
        # separately by packages/tools/extract_labels.py (never guessed by
        # proximity here).
        excluded_types = sorted({o.type for o in objs} - {"MESH", "CURVE"})
        objs = [o for o in objs if o.type in ("MESH", "CURVE")]
        if not objs:
            err(
                f'ERROR: collection "{col.name}" has no geometry to export '
                "(only " + ", ".join(excluded_types) + " present)"
            )
            sys.exit(1)
        if excluded_types:
            log(
                f'     "{col.name}": excluding non-geometry from export '
                f"({', '.join(excluded_types)})"
            )

        # Phase 1a: evaluate the beveled curves into mesh surfaces, using the authored
        # profile exactly as-is. Objects already of type MESH are passed through
        # UNTOUCHED -- this step never filters or rewrites them, so collections that
        # were exported before Phase 1a are unaffected.
        curves = [o for o in objs if o.type == "CURVE"]
        if curves:
            # Read the MESH list BEFORE converting: the conversion removes the CURVE
            # objects, so holding those references past it would raise ReferenceError.
            existing_meshes = [o for o in objs if o.type == "MESH"]
            log(
                f'     "{col.name}": converting {len(curves)} CURVE object(s) to MESH '
                "(authored bevel profile, no smoothing)"
            )
            converted, no_surface = convert_curves_to_mesh(curves)
            objs = existing_meshes + converted
            if no_surface:
                shown = sorted(no_surface)
                log(
                    f'     "{col.name}": dropping {len(shown)} unbeveled curve(s) with '
                    "no surface: "
                    + ", ".join(shown[:6])
                    + (" ..." if len(shown) > 6 else "")
                )
            if not objs:
                err(f'ERROR: collection "{col.name}" has nothing left to export')
                sys.exit(1)

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
