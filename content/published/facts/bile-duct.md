---
id: bile-duct
uberon: UBERON:0002394
reviewed: true
reviewer: "GitHub Copilot — agent review; maintainer granted REVIEW_ACCEPT 2026-09-13"
date: 2026-09-13
citations:
  - "z-anatomy"
  - "hubmap-hra-glb"
  - "uberon"
  - "wikipedia-bile-duct"
---

## Identity

- The structure `bile-duct` is labelled "bile duct" in Uberon (synonyms "bile tube", "biliary duct",
  "gall duct", "hepatic duct") (uberon).
- Its Uberon identifier is `UBERON:0002394` (uberon).
- On the Reference Atlas body it is carried by the Z-Anatomy viscera layer as the mesh node
  `Bile duct` (z-anatomy).

## Relations

- UBERON:0002394 is "Any of the ducts that form the biliary tree, carrying bile from the liver to the
  small intestine" (uberon).
- "A bile duct is any of a number of long tube-like structures that carry bile, and is present in
  most vertebrates" (wikipedia-bile-duct).
- Uberon classes this as a group of ducts rather than one duct, which is why the label is generic:
  the source's single `Bile duct` tube is mapped to it, and the more specific hepatic, cystic and
  common ducts are not named separately in this atlas (uberon, z-anatomy).
- It is mapped as part of the `viscera` row (layer `organ`) on the Reference Atlas body. The
  gallbladder, the liver and the pancreatic duct are separate structure rows (z-anatomy).

## Presence

- Present in the Reference Atlas body — one fixed male reference individual (Z-Anatomy, a
  retopologised BodyParts3D derivative) (z-anatomy).
- One mesh node, arriving as a converted curve tube rather than a modelling mesh (z-anatomy).
- The source also carries a project-typed object named `Extrahepatic bile ducts.j`. It holds no
  surface geometry, so it ships as a node without a mesh and is not mapped (z-anatomy).
- Present in BOTH Visible Human donor bodies, as a single mesh each — the common bile duct
  (hubmap-hra-glb).
- Not to be confused with `hepatic-duct` (UBERON:0005171) or `cystic-duct` (UBERON:0001152),
  which are separate rows (hubmap-hra-glb).
