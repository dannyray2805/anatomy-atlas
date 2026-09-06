#!/usr/bin/env python3
"""Extract Z-Anatomy text labels (FONT objects) from named collections to JSON.

Companion to export_layers.py (Task N). export_layers.py ships GEOMETRY only
(MESH objects, FONT excluded); this script records what those excluded labels
are so the label set is never lost and can be re-verified or re-added later.

    blender --background --python packages/tools/extract_labels.py -- \
        <input.blend> <collection1> <out1.json> [<collection2> <out2.json> ...]

Every second argument after the input .blend is a collection name; the following
argument is the output .json path. Within each named collection every object of
type 'FONT' is walked and recorded as:

    {
      "text": obj.data.body,
      "position": [x, y, z],
      "linked_mesh": obj.parent.name if obj.parent.type == 'MESH' else null,
      "link_method": "parent" if linked_mesh else "none_found"
    }

TRUTH RULES: where a FONT object has no MESH parent, linked_mesh stays null and
link_method is "none_found". No proximity or other heuristic is used to infer a
link. The source .blend is never modified (opened fresh in memory, never saved).

Exit codes: 0 = all pairs extracted; 1 = usage / collection / error; 2 = not
running inside Blender.
"""

import json
import os
import sys

try:
    import bpy
except ImportError:  # pragma: no cover - only reachable outside Blender
    print(
        "ERROR: this script must run inside Blender "
        "(blender --background --python extract_labels.py -- ...)",
        file=sys.stderr,
    )
    sys.exit(2)


def log(msg: str) -> None:
    print(msg, flush=True)


def err(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def parse_args():
    if "--" in sys.argv:
        argv = sys.argv[sys.argv.index("--") + 1 :]
    else:
        argv = []
    if not argv:
        return None
    blend = os.path.abspath(argv[0])
    rest = argv[1:]
    if len(rest) % 2 != 0:
        return None
    pairs = [(rest[i], os.path.abspath(rest[i + 1])) for i in range(0, len(rest), 2)]
    return blend, pairs


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


def extract_labels(col, scene_names):
    """Record every FONT object in `col` present in the active scene."""
    labels = []
    for o in col.all_objects:
        if o.name not in scene_names or o.type != "FONT":
            continue
        parent = o.parent
        linked = parent is not None and parent.type == "MESH"
        labels.append(
            {
                "text": o.data.body if (o.data is not None) else "",
                "position": [round(float(v), 4) for v in o.location],
                "linked_mesh": parent.name if linked else None,
                "link_method": "parent" if linked else "none_found",
            }
        )
    # Stable, deterministic ordering by text then position.
    labels.sort(key=lambda l: (l["text"] or "", tuple(l["position"])))
    return labels


def main() -> None:
    parsed = parse_args()
    if parsed is None:
        err(
            "usage: blender --background --python extract_labels.py -- "
            "<input.blend> <collection> <out.json> [<collection> <out.json> ...]"
        )
        sys.exit(1)

    blend, pairs = parsed
    if not os.path.isfile(blend):
        err(f"ERROR: input .blend not found: {blend}")
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

    # Resolve every requested collection up front so a typo never produces a
    # partial run or a silently skipped file.
    resolved = []
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
        labels = extract_labels(col, scene_names)
        os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
        with open(out, "w", encoding="utf-8") as fh:
            json.dump(labels, fh, ensure_ascii=False, indent=2)
            fh.write("\n")

        n_linked = sum(1 for l in labels if l["linked_mesh"] is not None)
        n_none = len(labels) - n_linked
        size = os.path.getsize(out)
        log(f'[ok] "{col.name}" -> {out}')
        log(
            f"     FONT labels: {len(labels)} | linked_mesh: {n_linked} | "
            f"none_found: {n_none} | file size: {size} bytes"
        )

    log("done.")
    sys.exit(0)


if __name__ == "__main__":
    main()
