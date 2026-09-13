---
id: pancreatic-duct
uberon: UBERON:0007329
reviewed: true
reviewer: "GitHub Copilot — agent review; maintainer granted REVIEW_ACCEPT 2026-09-13"
date: 2026-09-13
citations:
  - "z-anatomy"
  - "hubmap-hra-glb"
  - "uberon"
  - "wikipedia-pancreatic-duct"
---

## Identity

- The structure `pancreatic-duct` is labelled "pancreatic duct" in Uberon (synonyms "duct of
  pancreas", "ductus pancreaticus", "pancreas duct") (uberon).
- Its Uberon identifier is `UBERON:0007329` (uberon).
- On the Reference Atlas body it is carried by the Z-Anatomy viscera layer as the mesh node
  `Pancreatic duct` (z-anatomy).

## Relations

- UBERON:0007329 is "A duct that collects and carries secretions of the exocrine pancreas to the
  intestine" (uberon).
- "The pancreatic duct or duct of Wirsung is a duct joining the pancreas to the common bile duct.
  This supplies it with pancreatic juice from the exocrine pancreas, which aids in digestion"
  (wikipedia-pancreatic-duct).
- It is mapped as part of the `viscera` row (layer `organ`) on the Reference Atlas body. The
  pancreas and the bile duct are separate structure rows (z-anatomy).

## Presence

- Present in the Reference Atlas body — one fixed male reference individual (Z-Anatomy, a
  retopologised BodyParts3D derivative) (z-anatomy).
- One mesh node, arriving as a converted curve tube rather than a modelling mesh (z-anatomy).
- The source names a second, separate mesh, `Accessory pancreatic duct`, which is NOT mapped to this
  structure. This is a deliberate choice and not a missing term: Uberon notes that UBERON:0007329 is
  a grouping class that "groups together accessory (dorsal) and main (ventral) pancreatic ducts", so
  folding two separately named ducts into one row would make a single entry stand for both. Clicking
  the accessory duct reports it as not in this dataset (uberon, z-anatomy).
- Present in BOTH Visible Human donor bodies, as two named meshes each — the dorsal and ventral
  pancreatic ducts (hubmap-hra-glb).
- The accessory pancreatic duct is deliberately NOT mapped to this row: one row must not silently
  stand for two ducts that drain to different papillae (hubmap-hra-glb).
