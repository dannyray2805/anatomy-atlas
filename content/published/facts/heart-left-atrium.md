---
id: heart-left-atrium
uberon: UBERON:0002079
reviewed: false
reviewer: null
date: 2026-09-14
citations:
  - "hubmap-hra-glb"
  - "uberon"
  - "wikipedia-atrium-heart"
  - "z-anatomy"
---

## Identity

- The structure `heart-left-atrium` is labelled "left cardiac atrium" in Uberon (synonym "left atrium") (uberon).
- Its Uberon identifier is `UBERON:0002079` (uberon).
- Its mesh nodes are `VH_M_left_cardiac_atrium` (male VH heart asset) and `VH_F_left_cardiac_atrium` (female VH heart asset), both confirmed present with the app's own loader (hubmap-hra-glb), and `Left atrium` on the Reference body's Z-Anatomy cardiovascular layer, which the viewer labels "Heart + vessels" (z-anatomy).

## Relations

- UBERON:0002079 is "a cardiac atrium that is in the left side of the heart. It receives oxygenated blood from the pulmonary veins, In mammals this is pumped into the left ventricle, via the Mitral valve" (uberon).
- "There are two atria in the human heart – the left atrium receives blood from the pulmonary circulation, and the right atrium receives blood from the venae cavae of the systemic circulation" (wikipedia-atrium-heart).
- In this atlas it is mapped as a part of the `heart` structure row (layer `organ`) (hubmap-hra-glb).

## Presence

- Present in BOTH Visible Human donor bodies, as `VH_M_left_cardiac_atrium` and `VH_F_left_cardiac_atrium`, each in that individual's own HRA heart asset (hubmap-hra-glb). Both meshes have been in those assets since the hearts were first mapped; what was missing was the row claiming them, which is why this chamber went unlabelled until now.
- Present in the Reference body's Z-Anatomy cardiovascular layer as the mesh node `Left atrium` (z-anatomy) — a different individual from the donors.
