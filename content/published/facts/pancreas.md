---
id: pancreas
uberon: UBERON:0001264
reviewed: true
reviewer: "GitHub Copilot — agent review; maintainer granted REVIEW_ACCEPT 2026-09-13"
date: 2026-09-13
citations:
  - "z-anatomy"
  - "hubmap-hra-glb"
  - "uberon"
  - "wikipedia-pancreas"
---

## Identity

- The structure `pancreas` is labelled "pancreas" in Uberon (uberon).
- Its Uberon identifier is `UBERON:0001264` (uberon).
- On the Reference Atlas body it is carried by the Z-Anatomy viscera layer as the mesh node
  `Pancreas` (z-anatomy).

## Relations

- UBERON:0001264 is "an endoderm derived structure that produces precursors of digestive enzymes
  and blood glucose regulating hormones" (uberon).
- "The pancreas is an organ of the digestive system and endocrine system of vertebrates. In humans,
  it is located in the abdomen behind the stomach and functions as a gland. The pancreas is a mixed
  or heterocrine gland, i.e., it has both an endocrine and a digestive exocrine function ... As an
  endocrine gland, it functions mostly to regulate blood sugar levels, secreting the hormones
  insulin, glucagon, somatostatin and pancreatic polypeptide. As a part of the digestive system, it
  functions as an exocrine gland secreting pancreatic juice into the duodenum through the pancreatic
  duct" (wikipedia-pancreas).
- In this atlas it is mapped as part of the `viscera` row (layer `organ`) on the Reference Atlas
  body (z-anatomy).

## Presence

- Present in the Reference Atlas body — one fixed male reference individual (Z-Anatomy, a
  retopologised BodyParts3D derivative) (z-anatomy).
- The pancreatic duct and the accessory pancreatic duct ARE separate meshes in that source (they
  arrive as converted curve tubes, not as modelling meshes) and are NOT mapped to this structure, so
  clicking a duct does not open the pancreas entry (z-anatomy).
- Present in BOTH Visible Human donor bodies, as five named meshes each — head, neck, body, tail
  and uncinate process (hubmap-hra-glb).
