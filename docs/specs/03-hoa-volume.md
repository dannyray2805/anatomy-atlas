# 03 — HOA volume

Do not convert HiP-CT volumes to GLB.

v1 heart path:

1. Overview pyramid (lowest levels only) streamed from HOA or mirrored to R2.
2. One registered volume-of-interest.
3. UI must show dataset DOI, voxel size (µm), CC BY 4.0, and link to the HOA dataset page before the volume is treated as loaded.

Prefer embedding Neuroglancer or Vizarr.

Do not claim cellular resolution unless `voxel_size_um <= 2` for that view.

4D physiology is out of scope for volume data. Any animation must be labeled schematic, not scanned from the donor.
