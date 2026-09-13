---
id: ureter
uberon: UBERON:0000056
reviewed: true
reviewer: "GitHub Copilot — agent review; maintainer granted REVIEW_ACCEPT 2026-09-13"
date: 2026-09-13
citations:
  - "z-anatomy"
  - "hubmap-hra-glb"
  - "uberon"
  - "wikipedia-ureter"
---

## Identity

- The structure `ureter` is labelled "ureter" in Uberon (synonym "metanephric duct") (uberon).
- Its Uberon identifier is `UBERON:0000056` (uberon).
- On the Reference Atlas body it is carried by the Z-Anatomy viscera layer as the two mesh nodes
  `Ureter.l` and `Ureter.r` (z-anatomy).

## Relations

- UBERON:0000056 is "Muscular duct that propels urine from the kidneys to the urinary bladder, or
  related organs" (uberon).
- Uberon records that in humans the ureter consists of adventitial, muscular and mucosal layers
  (uberon).
- "The ureters are tubes composed of smooth muscle that transport urine from the kidneys to the
  urinary bladder. In adult humans, the ureters are typically 20–30 centimeters long and 3–4
  millimeters in diameter. They are lined with urothelial cells, a form of transitional epithelium,
  and feature an extra layer of smooth muscle in the lower third to aid peristalsis"
  (wikipedia-ureter).
- In this atlas it is mapped as part of the `viscera` row (layer `organ`) on the Reference Atlas
  body. The kidney, the urinary bladder and the urethra are separate structure rows (z-anatomy).

## Presence

- Present in the Reference Atlas body — one fixed male reference individual (Z-Anatomy, a
  retopologised BodyParts3D derivative) (z-anatomy).
- Two mesh nodes, one per side, each arriving as a converted curve tube rather than a modelling mesh
  (z-anatomy).
- Present in BOTH Visible Human donor bodies, as one mesh per side in each, named
  `VH_M_ureter_L`/`.R` and `VH_F_left_ureter`/`VH_F_right_ureter` — note the two sources word
  the names differently (hubmap-hra-glb).
- The renal pelvis, calyces and papillae that ship inside those same ureter assets are NOT mapped
  here: they belong to the kidney, and they open the `kidney` entry instead (hubmap-hra-glb).
