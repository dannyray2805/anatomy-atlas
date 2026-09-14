---
id: heart-left-ventricle
uberon: UBERON:0002084
reviewed: true
reviewer: "GitHub Copilot — agent review; maintainer granted REVIEW_ACCEPT 2026-09-13"
date: 2026-09-13
citations:
  - "z-anatomy"
  - "hubmap-asctb-heart"
  - "hubmap-hra-glb"
  - "hoa-heart-S-20-29"
---

## Identity

- The structure `heart-left-ventricle` is labelled "heart left ventricle" (hubmap-asctb-heart).
- Its Uberon identifier is `UBERON:0002084` (hubmap-asctb-heart).
- Its HuBMAP 3D reference object node name is `VH_M_heart_left_ventricle` (hubmap-asctb-heart).

## Relations

- `VH_M_heart_left_ventricle` is listed on the same male HRA heart 3D reference object as `VH_M_heart` (UBERON:0000948) (hubmap-asctb-heart).

## Presence

- Visible in the S-20-29 whole-heart HiP-CT volume: DOI `10.15151/ESRF-DC-1773964017`, 19.89 µm/voxel (hoa-heart-S-20-29).
- This volume is not a left-ventricle segmentation (hoa-heart-S-20-29).

- Present in BOTH Visible Human donor bodies: `VH_M_heart_left_ventricle` (male, ref-organ heart v1.3) and `VH_F_left_ventricle` (female, ref-organ heart v1.3), both confirmed with the app's own loader (hubmap-hra-glb). The female mesh carries a different node name from the male one, which is why this row resolved on the male body only until now.
- Present in the Reference body's Z-Anatomy cardiovascular layer as the mesh node `Left ventricle` — that layer is labelled 'Heart + vessels' (z-anatomy). The Reference body is a different individual from the Visible Human donors.
