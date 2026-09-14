---
id: heart-right-ventricle
uberon: UBERON:0002080
reviewed: true
reviewer: "GitHub Copilot — agent review; maintainer granted REVIEW_ACCEPT 2026-09-13"
date: 2026-09-13
citations:
  - "z-anatomy"
  - "hubmap-hra-glb"
  - "uberon"
  - "wikipedia-ventricle-heart"
  - "hoa-heart-S-20-29"
---

## Identity

- The structure `heart-right-ventricle` is labelled "heart right ventricle" in Uberon (synonym "right ventricle") (uberon).
- Its Uberon identifier is `UBERON:0002080` (uberon).
- Its HuBMAP HRA heart node names are `VH_M_heart_right_ventricle` (male heart GLB) and `VH_F_right_ventricle` (female heart GLB), confirmed by direct GLB inspection (hubmap-hra-glb).

## Relations

- UBERON:0002080 is "a cardiac ventricle that is in the right side of the heart" (uberon).
- The right ventricle "receives deoxygenated blood from the right atrium via the tricuspid valve and pumps it into the pulmonary artery via the pulmonary valve, into the pulmonary circulation" (wikipedia-ventricle-heart).
- In this atlas it is mapped as part of the `heart` structure row (layer `organ`) on the HRA heart meshes for both sexes (hubmap-hra-glb).

## Presence

- Present in BOTH the male and female VH heart layers: `VH_M_heart_right_ventricle` (male, ref-organ heart v1.3) and `VH_F_right_ventricle` (female, ref-organ heart v1.3) — and `heart-left-ventricle` now resolves on both bodies too, once the female mesh `VH_F_left_ventricle` was added (hubmap-hra-glb).

## Source volume

- Visible in the S-20-29 whole-heart HiP-CT volume: DOI `10.15151/ESRF-DC-1773964017`, 19.89 µm/voxel (hoa-heart-S-20-29).
- This volume is not a right-ventricle segmentation (hoa-heart-S-20-29).

- Present in the Reference body's Z-Anatomy cardiovascular layer as the mesh node `Right ventricle` — that layer is labelled 'Heart + vessels' (z-anatomy). The Reference body is a different individual from the Visible Human donors.
