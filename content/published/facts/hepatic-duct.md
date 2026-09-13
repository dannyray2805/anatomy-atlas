---
id: hepatic-duct
uberon: UBERON:0005171
reviewed: false
reviewer: null
date: 2026-09-13
citations:
  - "hubmap-hra-glb"
  - "uberon"
  - "wikipedia-common-hepatic-duct"
---

## Identity

- The structure `hepatic-duct` is labelled "hepatic duct" in Uberon (uberon).
- Its Uberon identifier is `UBERON:0005171` (uberon).
- On the Visible Human female donor body it is carried as the mesh nodes `VH_F_right_hepatic_duct`,
  `VH_F_left_hepatic_duct` and `VH_F_common_hepatic_duct` (hubmap-hra-glb).

## Relations

- UBERON:0005171 covers "any portion of the ducts that carry bile from the liver to the common bile
  duct. This may include both intrahapetic components (parts of left and right hepatic ducts) and
  extrahapetic components (common hepatic duct, plus hilar portion)" (uberon) — so the right, left
  and common hepatic ducts mapped here all fall inside this one term.
- "The common hepatic duct is the first part of the biliary tract. It joins the cystic duct coming
  from the gallbladder to form the common bile duct ... It is formed by the union of the right
  hepatic duct (which drains bile from the right functional lobe of the liver) and the left hepatic
  duct (which drains bile from the left functional lobe of the liver)" (wikipedia-common-hepatic-duct).
- In this atlas it hangs directly off the `body` root row (layer `organ`) (hubmap-hra-glb).

## Presence

- Mapped from the Visible Human FEMALE donor body only, so far (hubmap-hra-glb). Her source publishes
  the three ducts both on a dedicated liver-duct asset and inside her combined biliary-tree asset;
  both carry the same meshes, so the single biliary-tree asset is the one mounted and the names are
  listed once (hubmap-hra-glb).
- The MALE donor's biliary-tree asset carries the same three mesh names, but his row set has not been
  mapped for them yet, so clicking them on his body opens no entry. That is a gap, not a claim that
  the structure is absent from him (hubmap-hra-glb).
- Not to be confused with `bile-duct` (UBERON:0002394), which is the common bile duct and is a
  separate row (hubmap-hra-glb).
