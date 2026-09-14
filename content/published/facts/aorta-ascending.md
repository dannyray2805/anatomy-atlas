---
id: aorta-ascending
uberon: UBERON:0001496
reviewed: true
reviewer: "GitHub Copilot — agent review; maintainer granted REVIEW_ACCEPT 2026-09-13"
date: 2026-09-13
citations:
  - "z-anatomy"
  - "hubmap-hra-glb"
  - "uberon"
  - "wikipedia-ascending-aorta"
---

## Identity

- The structure `aorta-ascending` is labelled "ascending aorta" (uberon).
- Its Uberon identifier is `UBERON:0001496` (uberon).
- Its HuBMAP VH vasculature node names are `VH_M_ascending_aorta` (male) and `VH_F_ascending_aorta` (female) (hubmap-hra-glb).

## Relations

- The ascending aorta is "the portion of the aorta ... that lies between the heart and the arch of aorta", commencing at the upper part of the base of the left ventricle (uberon).
- Its only branches are the two coronary arteries, which arise near the commencement of the aorta; the ascending aorta continues upward to the aortic arch (wikipedia-ascending-aorta).
- In this atlas it is mapped as part of the whole-layer `blood-vasculature` structure row. No finer aortic-tree hierarchy (aorta → arch → descending) is asserted in the graph (hubmap-hra-glb).

## Presence

- Present in BOTH the male and female VH blood-vasculature layers: `VH_M_ascending_aorta` on `VH_M_Blood_Vasculature.glb` and `VH_F_ascending_aorta` on `VH_F_Blood_Vasculature.glb` (hubmap-hra-glb). A structure that is absent from one sex would not claim this.

- Present in the Reference body's Z-Anatomy cardiovascular layer as the mesh node `Ascending aorta` — that layer is labelled 'Heart + vessels' (z-anatomy). The Reference body is a different individual from the Visible Human donors.
