---
id: fallopian-tube
uberon: UBERON:0003889
reviewed: true
reviewer: "GitHub Copilot — agent review; maintainer granted REVIEW_ACCEPT 2026-09-13"
date: 2026-09-13
citations:
  - "hubmap-hra-glb"
  - "uberon"
  - "wikipedia-fallopian-tube"
---

## Identity

- The structure `fallopian-tube` is labelled "fallopian tube" in Uberon (synonym "uterine tube
  (sensu Mammalia)") (uberon).
- Its Uberon identifier is `UBERON:0003889` (uberon).
- On the Visible Human female donor body it is carried as the mesh nodes `VH_F_ampulla_of_uterine_tube_*`,
  `VH_F_isthmus_of_fallopian_tube_*`, `VH_F_uterine_tube_infundibulum_*`,
  `VH_F_fibria_of_uterine_tube_*` (one set per side) and `VH_F_abdominal_ostium_of_uterine_tube`
  (hubmap-hra-glb).

## Relations

- UBERON:0003889 is the "initial section of the oviduct through which the ova pass from the ovary to
  the uterus" (uberon).
- "The fallopian tubes, also known as uterine tubes, oviducts or salpinges, are paired tubular sex
  organs in the human female body that stretch from the ovaries to the uterus ... It has four
  described parts: the intramural part, isthmus, ampulla, and infundibulum with associated
  fimbriae" (wikipedia-fallopian-tube).
- In this atlas it hangs directly off the `body` root row (layer `organ`) (hubmap-hra-glb).

## Presence

- Present in the Visible Human FEMALE donor body only (hubmap-hra-glb). The male donor's published
  set has no uterine tube, so on his body this structure is not shown and never substituted.
- Nine named meshes cover both sides. The abdominal opening of each tube ships inside the UTERUS
  asset rather than the tube asset; it is part of the tube, so it is mapped here rather than to
  `uterus` (hubmap-hra-glb).
- The source misspells one fimbria mesh as `VH_F_fibria_of_uterine_tube_*`; the name is reported
  exactly as the source publishes it (hubmap-hra-glb).
