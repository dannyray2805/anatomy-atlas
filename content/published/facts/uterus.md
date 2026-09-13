---
id: uterus
uberon: UBERON:0000995
reviewed: true
reviewer: "GitHub Copilot — agent review; maintainer granted REVIEW_ACCEPT 2026-09-13"
date: 2026-09-13
citations:
  - "hubmap-hra-glb"
  - "uberon"
  - "wikipedia-uterus"
---

## Identity

- The structure `uterus` is labelled "uterus" in Uberon (uberon).
- Its Uberon identifier is `UBERON:0000995` (uberon).
- On the Visible Human female donor body it is carried as the mesh nodes `VH_F_body_of_uterus`,
  `VH_F_fundus_of_uterus`, `VH_F_cornua`, `VH_F_lower_uterine_segment`,
  `VH_F_anterior_wall_of_uterus` and `VH_F_posterior_wall_of_uterus` (hubmap-hra-glb).

## Relations

- UBERON:0000995 is "the female muscular organ of gestation in which the developing embryo or fetus
  is nourished until birth" (uberon).
- "The uterus ... or womb is the organ in the reproductive system of most female mammals, including
  humans, that accommodates the embryonic and fetal development of one or more fertilized eggs
  until birth ... In humans, the lower end of the uterus is a narrow part known as the isthmus that
  connects to the cervix, the anterior gateway leading to the vagina" (wikipedia-uterus).
- In this atlas it hangs directly off the `body` root row (layer `organ`) (hubmap-hra-glb).

## Presence

- Present in the Visible Human FEMALE donor body only (hubmap-hra-glb). The male donor's published
  set has no uterus, so on his body this structure is not shown and never substituted.
- The same asset also carries this individual's cervix and its internal and external openings, which
  are a SEPARATE row (`uterine-cervix`) and open their own entry (hubmap-hra-glb).
- Her source also publishes a placenta and a uterus/ovary ligament set. Neither is mapped here: the
  placenta is a pregnancy-specific organ and placing it on a non-pregnant body would assert a state
  that is not there, and the ligament set has no matching structure row yet (hubmap-hra-glb).
