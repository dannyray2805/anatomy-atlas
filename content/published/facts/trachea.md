---
id: trachea
uberon: UBERON:0003126
reviewed: true
reviewer: "GitHub Copilot — agent review; maintainer granted REVIEW_ACCEPT 2026-09-13"
date: 2026-09-13
citations:
  - "z-anatomy"
  - "hubmap-hra-glb"
  - "uberon"
  - "wikipedia-trachea"
---

## Identity

- The structure `trachea` is labelled "trachea" in Uberon (synonyms "cartilaginous trachea",
  "windpipe", "tracheal tubule") (uberon).
- Its Uberon identifier is `UBERON:0003126` (uberon).
- On the Reference Atlas body it is carried by the Z-Anatomy viscera layer as the mesh node
  `Trachea` (z-anatomy).

## Relations

- UBERON:0003126 is "the portion of the airway that attaches to the bronchi as it branches"
  (uberon).
- "The trachea, also known as the windpipe, is a cartilaginous tube that connects the larynx to the
  bronchi of the lungs, allowing the passage of air ... The trachea extends from the larynx and
  branches into the two primary bronchi. At the top of the trachea, the cricoid cartilage attaches
  it to the larynx. The trachea is formed by a number of horseshoe-shaped rings, joined together
  vertically by overlying ligaments, and by the trachealis muscle at their ends" (wikipedia-trachea).
- In this atlas it is mapped as part of the `viscera` row (layer `organ`) on the Reference Atlas
  body. The bronchi are a separate structure row (z-anatomy).

## Presence

- Present in the Reference Atlas body — one fixed male reference individual (Z-Anatomy, a
  retopologised BodyParts3D derivative) (z-anatomy).
- That source contains no larynx mesh at all, so the trachea is the only airway structure mapped
  from it; the epiglottis is a separate mesh and is not mapped (z-anatomy).
- Present in BOTH Visible Human donor bodies, as three named meshes each — the trachea, the
  carina and the cartilage of the tracheal wall (hubmap-hra-glb).
- The same donor asset also carries the laryngeal cartilages, which are NOT mapped to this
  structure: the larynx is not in the published graph, so clicking them opens no entry
  (hubmap-hra-glb).
