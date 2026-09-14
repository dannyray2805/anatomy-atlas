---
id: heart-right-atrium
uberon: UBERON:0002078
reviewed: true
reviewer: "GitHub Copilot — agent review; maintainer granted REVIEW_ACCEPT 2026-09-13"
date: 2026-09-13
citations:
  - "z-anatomy"
  - "hubmap-hra-glb"
  - "uberon"
  - "wikipedia-atrium-heart"
  - "hoa-heart-S-20-29"
---

## Identity

- The structure `heart-right-atrium` is labelled "right cardiac atrium" in Uberon (synonym "right atrium") (uberon).
- Its Uberon identifier is `UBERON:0002078` (uberon).
- Its HuBMAP HRA heart node names are `VH_M_right_cardiac_atrium` (male heart GLB) and `VH_F_right_cardiac_atrium` (female heart GLB), confirmed by direct GLB inspection (hubmap-hra-glb).

## Relations

- UBERON:0002078 is "a cardiac atrium that is in the right side of the heart. It receives deoxygenated blood. In mammals, this comes from the superior and inferior vena cava and the coronary sinus, and pumps it into the right ventricle through the tricuspid valve" (uberon).
- The right atrium "receives and holds deoxygenated blood from the superior vena cava, inferior vena cava, anterior cardiac veins, smallest cardiac veins and the coronary sinus, which it then sends down to the right ventricle through the tricuspid valve" (wikipedia-atrium-heart).
- In this atlas it is mapped as part of the `heart` structure row (layer `organ`) on the HRA heart meshes for both sexes (hubmap-hra-glb).

## Presence

- Present in BOTH the male and female VH heart layers: `VH_M_right_cardiac_atrium` (male, ref-organ heart v1.3) and `VH_F_right_cardiac_atrium` (female, ref-organ heart v1.3) (hubmap-hra-glb).

## Source volume

- Visible in the S-20-29 whole-heart HiP-CT volume: DOI `10.15151/ESRF-DC-1773964017`, 19.89 µm/voxel (hoa-heart-S-20-29).
- This volume is not a right-atrium segmentation (hoa-heart-S-20-29).

- Present in the Reference body's Z-Anatomy cardiovascular layer as the mesh node `Right atrium` — that layer is labelled 'Heart + vessels' (z-anatomy). The Reference body is a different individual from the Visible Human donors.
