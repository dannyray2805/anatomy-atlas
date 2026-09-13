---
id: kidney
uberon: UBERON:0002113
reviewed: true
reviewer: "GitHub Copilot — agent review; maintainer granted REVIEW_ACCEPT 2026-09-13"
date: 2026-09-13
citations:
  - "z-anatomy"
  - "hubmap-hra-glb"
  - "uberon"
  - "wikipedia-kidney"
---

## Identity

- The structure `kidney` is labelled "kidney" in Uberon (synonym "reniculate kidney") (uberon).
- Its Uberon identifier is `UBERON:0002113` (uberon).
- On the Reference Atlas body it is carried by the Z-Anatomy viscera layer as the mesh nodes
  `Kidney.l` and `Kidney.r` (z-anatomy).

## Relations

- UBERON:0002113 is "a paired organ of the urinary tract that produces urine and maintains bodily
  fluid homeostasis, blood pressure, pH levels, red blood cell production and skeleton
  mineralization" (uberon).
- "In humans, the kidneys are two reddish-brown bean-shaped blood-filtering organs ... They are
  located on the left and right in the retroperitoneal space, and in adult humans are about 12
  centimetres in length. They receive blood from the paired renal arteries; blood exits into the
  paired renal veins. Each kidney is attached to a ureter, a tube that carries excreted urine to
  the bladder" (wikipedia-kidney).
- In this atlas it is mapped as part of the `viscera` row (layer `organ`) on the Reference Atlas
  body (z-anatomy).

## Presence

- Present in the Reference Atlas body — one fixed male reference individual (Z-Anatomy, a
  retopologised BodyParts3D derivative), as a left and a right mesh (z-anatomy).
- The renal pelvis is a separate mesh in that source and is NOT mapped to this structure, so
  clicking it does not open the kidney entry (z-anatomy).
- Present in BOTH Visible Human donor bodies — 71 named meshes on the male body and 79 on the
  female body, counting both sides (hubmap-hra-glb).
- On the donor bodies the renal pelvis, calyces and papillae ARE mapped to this structure, because
  they ship inside that donor's own kidney/ureter assets and belong to the kidney rather than the
  ureter. That differs from the Reference Atlas body above, where the renal pelvis is a separate
  unmapped mesh (hubmap-hra-glb).
