#!/usr/bin/env python3
"""Render a GLB to a preview PNG with headless Blender, for visual QA.

    blender --background --python packages/tools/render_preview.py -- \
        <input.glb> <output.png> [three-quarter|along-x|along-y]

Frames the imported model's bounding sphere and renders an Eevee still. The model's
longest axis is treated as "up" so a standing figure renders upright regardless of the
file's axis convention. Camera labels are AXIS-based (along-x / along-y), never
anatomical (front/side) -- we do not claim which axis is ventral.
"""

import math
import os
import sys

try:
    import bpy
    from mathutils import Vector
except ImportError:  # pragma: no cover - only reachable outside Blender
    print("ERROR: run inside Blender (blender --background --python render_preview.py -- ...)",
          file=sys.stderr)
    sys.exit(2)


def log(msg: str) -> None:
    print(msg, flush=True)


def err(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if len(argv) < 2:
        err("usage: <input.glb> <output.png> [three-quarter|along-x|along-y]")
        sys.exit(1)
    glb = os.path.abspath(argv[0])
    png = os.path.abspath(argv[1])
    view = argv[2] if len(argv) > 2 else "three-quarter"
    return glb, png, view


def ensure_gltf_importer() -> bool:
    if hasattr(bpy.ops.import_scene, "gltf"):
        return True
    try:
        bpy.ops.preferences.addon_enable(module="io_scene_gltf2")
    except Exception:
        pass
    return hasattr(bpy.ops.import_scene, "gltf")


def clear_scene() -> None:
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def set_engine(scene) -> str:
    # Prefer Eevee (fast); fall back to Cycles if the engine id is absent.
    for name in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "CYCLES"):
        try:
            scene.render.engine = name
            return name
        except Exception:
            continue
    return scene.render.engine


def world_bounds(meshes):
    """Return (center, diagonal) of all mesh objects in world space."""
    if not meshes:
        return None
    lo = Vector((1e18, 1e18, 1e18))
    hi = Vector((-1e18, -1e18, -1e18))
    for o in meshes:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            for i in range(3):
                lo[i] = min(lo[i], w[i])
                hi[i] = max(hi[i], w[i])
    center = (lo + hi) * 0.5
    diag = (hi - lo).length
    return center, diag


def aim_object(obj, direction) -> None:
    """Rotate obj so its local -Z points along `direction` (sun/camera idiom)."""
    direction = direction.normalized()
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_sun(name, direction, energy) -> None:
    light = bpy.data.lights.new(name, "SUN")
    light.energy = energy
    obj = bpy.data.objects.new(name, light)
    bpy.context.scene.collection.objects.link(obj)
    aim_object(obj, direction)


def setup_world(scene) -> None:
    world = scene.world or bpy.data.worlds.new("Preview")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    bg = nt.nodes.get("Background")
    if bg is not None:
        bg.inputs[0].default_value = (0.85, 0.85, 0.88, 1.0)
        bg.inputs[1].default_value = 0.7


def build_camera(scene, center, diag, view) -> None:
    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.type = "PERSP"
    cam_data.angle = math.radians(45.0)
    cam_data.sensor_fit = "VERTICAL"
    cam = bpy.data.objects.new("PreviewCam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    radius = max(diag * 0.5, 1e-6)
    dist = radius / math.sin(math.radians(22.5)) * 1.15  # sphere fits inside 45 deg fov

    extents = None  # not needed; direction chosen below
    if view == "along-x":
        approach = Vector((1.0, 0.0, 0.25)).normalized()
    elif view == "along-y":
        approach = Vector((0.0, 1.0, 0.25)).normalized()
    else:
        approach = Vector((0.7, -0.7, 0.45)).normalized()

    cam.location = center + approach * dist
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam_data.clip_start = max(dist / 100.0, 1e-4)
    cam_data.clip_end = dist * 100.0


def main() -> None:
    glb, png, view = parse_args()
    if not os.path.isfile(glb):
        err(f"ERROR: input .glb not found: {glb}")
        sys.exit(1)
    if not ensure_gltf_importer():
        err("ERROR: glTF 2.0 importer not available in this Blender build.")
        sys.exit(1)

    scene = bpy.context.scene
    clear_scene()
    engine = set_engine(scene)
    log(f"engine: {engine}")

    log(f"importing {glb}")
    bpy.ops.import_scene.gltf(filepath=glb)

    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    if not meshes:
        err("ERROR: imported GLB contains no mesh objects.")
        sys.exit(1)
    center, diag = world_bounds(meshes)
    log(f"objects: {len(meshes)} | bbox diagonal: {diag:.3f}")

    setup_world(scene)
    # Key + fill sunlight so geometry is not pitch black (sun position is irrelevant;
    # only rotation matters).
    add_sun("KeySun", Vector((0.5, 0.6, -1.0)), 4.0)
    add_sun("FillSun", Vector((-0.6, -0.5, -0.4)), 1.5)

    build_camera(scene, center, diag, view)

    scene.render.resolution_x = 1280
    scene.render.resolution_y = 1280
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.filepath = png

    try:
        scene.eevee.taa_render_samples = 64
    except Exception:
        pass

    log(f"rendering -> {png}")
    bpy.ops.render.render(write_still=True)
    if not os.path.isfile(png):
        err(f"ERROR: render reported success but no file at {png}")
        sys.exit(1)
    log(f"ok: {png}")


if __name__ == "__main__":
    main()
