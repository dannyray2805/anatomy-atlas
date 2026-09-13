---
id: prostate
uberon: UBERON:0002367
reviewed: true
reviewer: "GitHub Copilot — agent review; maintainer granted REVIEW_ACCEPT 2026-09-13"
date: 2026-09-13
citations:
  - "hubmap-hra-glb"
  - "uberon"
  - "wikipedia-prostate"
---

## Identity

- The structure `prostate` is labelled "prostate gland" in Uberon (synonyms "prostate", "male
  prostate") (uberon).
- Its Uberon identifier is `UBERON:0002367` (uberon).
- On the Visible Human male donor body it is carried as the mesh nodes `VH_M_*` for the gland's
  zones, apex, base, stroma and prostatic ducts (hubmap-hra-glb).

## Relations

- UBERON:0002367 is "a partly muscular, partly glandular body that is situated near the base of the
  mammalian male urethra and secretes an alkaline viscid fluid which is a major constituent of the
  ejaculatory fluid" (uberon).
- "The prostate is an accessory gland of the male reproductive system ... It is found in all male
  mammals ... Anatomically, the prostate is found below the bladder, with the urethra passing
  through it. It is described in gross anatomy as consisting of lobes and in microanatomy by zone.
  It is surrounded by an elastic, fibromuscular capsule and contains glandular and connective
  tissue" (wikipedia-prostate).
- In this atlas it hangs directly off the `body` root row (layer `organ`) (hubmap-hra-glb).

## Presence

- Present in the Visible Human MALE donor body only (hubmap-hra-glb). The female donor's published
  set has no prostate, so on her body this structure is not shown and never substituted.
- The same asset also carries that individual's vas deferens, seminal vesicle, ejaculatory duct,
  prostatic utricle and seminal colliculus — those are DIFFERENT organs and are deliberately NOT
  mapped to this row, so clicking them does not open the prostate entry (hubmap-hra-glb).
