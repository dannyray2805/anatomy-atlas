---
id: lung
uberon: UBERON:0002048
reviewed: true
reviewer: "GitHub Copilot — agent review; maintainer granted REVIEW_ACCEPT 2026-09-13"
date: 2026-09-13
citations:
  - "z-anatomy"
  - "hubmap-hra-glb"
  - "uberon"
  - "wikipedia-lung"
---

## Identity

- The structure `lung` is labelled "lung" in Uberon (synonym "pulmo") (uberon).
- Its Uberon identifier is `UBERON:0002048` (uberon).
- On the Reference Atlas body it is carried by the Z-Anatomy viscera layer as five lobe meshes —
  superior and inferior of the left lung, and superior, middle and inferior of the right
  (z-anatomy).

## Relations

- UBERON:0002048 is a "respiration organ that develops as an outpocketing of the esophagus"
  (uberon).
- "The lungs are the primary organs of the respiratory system in many animals, including humans.
  In mammals and most other tetrapods, two lungs are located near the backbone on either side of
  the heart. Their function in the respiratory system is to extract oxygen from the atmosphere and
  transfer it into the bloodstream, and to release carbon dioxide from the bloodstream into the
  atmosphere, in a process of gas exchange" (wikipedia-lung).
- In this atlas it is mapped as part of the `viscera` row (layer `organ`) on the Reference Atlas
  body (z-anatomy).

## Presence

- Present in the Reference Atlas body — one fixed male reference individual (Z-Anatomy, a
  retopologised BodyParts3D derivative) (z-anatomy).
- That source contains no single whole-lung mesh: the lungs exist only as their lobes, which is why
  this structure maps to five meshes (z-anatomy).
- The pleura is a separate mesh in that source and is NOT mapped to this structure (z-anatomy).
- Present in BOTH Visible Human donor bodies, as 27 named meshes each — the hilum regions and
  every bronchopulmonary segment (hubmap-hra-glb).
- IMPORTANT DIFFERENCE: unlike the Reference Atlas source above, the donor lung assets publish NO
  lobe meshes at all — only bronchopulmonary segments. So on the donor bodies a click resolves to a
  segment or a hilum, never to a lobe (hubmap-hra-glb).
- The donors' airways are mapped to their own rows rather than to this one: the trachea and carina
  open `trachea`, and the main, lobar and segmental bronchi open `bronchus` (hubmap-hra-glb).
