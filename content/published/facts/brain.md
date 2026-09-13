---
id: brain
uberon: UBERON:0000955
reviewed: false
reviewer: null
date: 2026-09-13
citations:
  - "hubmap-hra-glb"
  - "uberon"
  - "wikipedia-brain"
---

## Identity

- The structure `brain` is labelled "brain" in Uberon (uberon).
- Its Uberon identifier is `UBERON:0000955` (uberon).
- It is carried on the Visible Human donor bodies by a contributed brain atlas as 283 individually
  named region nodes (`Allen_`-prefixed, e.g. `Allen_olfactory_bulb_L`), plus one
  `VH_M_optic_chiasm` / `VH_F_optic_chiasm` node in each body's own asset (hubmap-hra-glb).

## Relations

- UBERON:0000955 is "the center of the nervous system in all vertebrate, and most invertebrate,
  animals" (uberon).
- "The brain is an organ that serves as the center of the nervous system in all vertebrate and most
  invertebrate animals. It consists of nervous tissue and is typically located in the head ...
  Being the most specialized organ, it is responsible for receiving information from the sensory
  nervous system, processing that information (thought, cognition, and intelligence) and the
  coordination of motor control (muscle activity) and the endocrine system" (wikipedia-brain).
- In this atlas it hangs directly off the `body` root row (layer `nerve`) (hubmap-hra-glb).

## Presence

- Present in BOTH Visible Human donor bodies (hubmap-hra-glb).
- CONTRIBUTOR/PROVENANCE: this is the Allen Institute brain atlas published inside the HuBMAP CCF
  reference library and registered into each donor's frame. It is not HuBMAP-authored, and it is an
  ATLAS of the brain rather than that donor's scanned brain. The source publishes it separately for
  each sex (hubmap-hra-glb).
- All 283 region nodes map to this one row, so clicking any region (thalamus, cerebellum, a cortical
  gyrus ...) opens the brain as a whole. Publishing per-region structures is a future addition
  (hubmap-hra-glb).
- The Reference Atlas body carries a brain too, but its nervous layer is published as one
  whole-layer row and is not mapped to this structure — the brainstem structures there are separate
  rows (z-anatomy).
