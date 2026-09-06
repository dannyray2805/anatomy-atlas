# Authentic Multi-Scale Anatomy Explorer
## Personal implementation playbook (Cloudflare-first, DeepSeek Flash as coder)

Status: v1 specification  
Principle: datasets and identifiers are the source of truth. The LLM writes software and drafts text. It never invents anatomy.

Related product constraint: reuse the same Cloudflare account patterns as Numberra (Pages + R2 + Workers + D1).

---

## 0. What v1 ships

One sex. One deep organ (recommend **heart**).

User can:
1. See a whole-body context (Visible Human downsampled slices + HuBMAP organ GLBs).
2. Peel layers: skin / muscle / skeleton / viscera (coarse, sourced).
3. Click a named structure → fact card with Uberon/FMA id + citations.
4. Open the matching HOA HiP-CT volume (overview pyramid) with voxel size + dataset DOI on screen.
5. Open one registered high-resolution HOA volume-of-interest.
6. Ask an optional tutor that can only quote published fact cards.

Not in v1: living 4D physiology presented as scanned data, full-body cellular zoom, AI-generated organs, both sexes, every organ.

Footer on every view:

> Body context: NLM Visible Human. Organ geometry: HuBMAP HRA (CC BY 4.0). Tissue volume: Human Organ Atlas dataset [DOI], HiP-CT, [N] µm/voxel. Named structures: Uberon/FMA. Not for diagnosis.

---

## 1. Cloudflare mapping (use this, not a random stack)

| Concern | Product | Why |
|---|---|---|
| App + static UI | **Pages** (Vite or Next on Pages) | Same as Numberra; free/low; preview deploys |
| GLBs, Zarr chunks, VH slices, fact JSON | **R2** | Cheap storage, no egress to Workers/Pages on same account |
| Small API (facts, citations, chat proxy) | **Workers** | No always-on server |
| Structure graph + review flags | **D1** | SQLite at the edge; enough for thousands of structures |
| Secrets (DeepSeek key, never in frontend) | **Workers Secrets** | Chat only |
| Optional later RAG | **Vectorize** + Worker | Only over *your* published cards |
| Optional later jobs | **Queues** + Worker | Convert/validate pipelines |
| Custom domain | Same zone as Numberra or a subdomain e.g. `atlas.numberra.com.au` | Zero extra DNS vendor |

Do **not** put DeepSeek calls in the browser. Do **not** store raw HOA terabytes on R2. Do **not** use Workers AI as the anatomy oracle.

Local preview:

```bash
npm i -g wrangler
wrangler pages dev
wrangler dev   # worker
```

R2 public access: keep the bucket **private** and serve via a Worker with cache headers, or a custom domain with Cloudflare cache. Public R2 is possible but you want Cache-Control and easy takedown.

Suggested R2 key layout:

```
r2://anatomy-public/
  licenses/SOURCES.md
  hubmap/glb/heart-male.glb
  hubmap/glb/body-context-male.glb
  vh/male/zarr/overview/   # OME-Zarr pyramid, low res
  hoa/heart/<dataset-id>/overview/   # only low pyramid levels you chose
  hoa/heart/<dataset-id>/voi-<id>/
  content/published/structures.json
  content/published/facts/*.md
```

---

## 2. Repository layout

```
anatomy-atlas/
  README.md
  AGENTS.md                  # rules for DeepSeek
  docs/
    specs/
      00-truth-rules.md
      01-structure-schema.md
      02-body-map.md
      03-hoa-volume.md
    sources.md
  packages/
    schema/                  # zod types + fixtures
    graph/                   # load/validate structure graph
    app/                     # Vite + R3F Pages app
    worker/                  # facts + chat proxy
    tools/                   # python converters, validators
  content/
    published/               # working source of truth: structures.json + facts/ (author directly with reviewed: false; reviewed: true waits for REVIEW_ACCEPT)
  wrangler.toml
```

`AGENTS.md` is the file you always attach to DeepSeek.

---

## 3. Source register (create this first, by hand)

`docs/sources.md` — do not let the agent invent rows.

| id | name | license | access | used_for | citation |
|---|---|---|---|---|---|
| nlm-vhp-male | Visible Human Male | NLM terms; acknowledge NLM | https://data.lhncbc.nlm.nih.gov/public/Visible-Human/Male-Images/ | whole-body slices / coarse volume | NLM Visible Human Project |
| hubmap-hra-glb | HRA 3D Reference Objects | CC BY 4.0 | https://humanatlas.io / ccf-3d-reference-object-library | named organ meshes | HuBMAP HRA release X |
| hubmap-asctb-heart | ASCT+B heart table | CC BY 4.0 | humanatlas.io | partonomy / cell types later | HuBMAP ASCT+B |
| hoa-heart-<doi> | HOA heart dataset | CC BY 4.0 | https://human-organ-atlas.esrf.eu | tissue volume | Walsh et al. + dataset DOI |
| uberon | Uberon ontology | CC BY 3.0 | http://purl.obolibrary.org/obo/uberon.owl | ids | Haendel et al. |

Every derived file in R2 must point at one of these ids.

---

## 4. Canonical schema (lock this before UI)

`packages/schema/src/structure.ts`

```ts
export const StructureSchema = {
  id: "string",                 // stable app id, e.g. heart-left-ventricle
  uberon: "string | null",      // e.g. UBERON:0002084
  fma: "string | null",
  label: "string",
  layer: "skin|fascia|muscle|skeleton|organ|vessel|nerve|tissue|unknown",
  part_of: "string | null",     // app id
  sources: [
    { source_id: "hubmap-hra-glb", asset: "r2 key or URL", note: "mesh" }
  ],
  voxel_size_um: "number | null",
  hoa_dataset_doi: "string | null",
  facts_id: "string | null",    // points to published fact card
  reviewed: "boolean"
}
```

Validator rule: `reviewed === true` required to render a hotspot.  
If `layer === "tissue"` then `hoa_dataset_doi` and `voxel_size_um` are required.

Fact card (`content/published/facts/heart-left-ventricle.md`):

```md
---
id: heart-left-ventricle
uberon: UBERON:0002084
reviewed: true
reviewer: you
date: 2026-08-31
citations:
  - "Gray's Anatomy, open edition / specified page"
  - "HOA dataset DOI ..."
  - "HuBMAP ASCT+B heart"
---

## Function
(only sentences that appear in citations or are trivial definitions)

## Relations
part_of: heart
```

No citation → the sentence does not ship.

---

## 5. DeepSeek operating rules

### 5.1 Global system prompt (paste into every agent session)

```text
You are a software engineer implementing an educational anatomy atlas.

TRUTH RULES
1. You must not invent anatomical structures, measurements, vessel courses, innervation, variants, or physiology.
2. If a fact is not present in files I attached or in content/published/, say DATA_MISSING and stop.
3. Do not generate 3D organ meshes or “fix” geometry to look more complete.
4. Do not download or assume terabyte HOA datasets. Only use documented downsampled pyramids and one VOI.
5. Every UI label must bind to a Structure.id that exists in the schema/fixture.
6. Prefer Cloudflare Pages, R2, Workers, D1. Do not add AWS/GCP services unless I ask.
7. Write small diffs. Touch only the files I name.
8. Add or update a test when you change schema or loaders.
9. Author structure rows and fact cards directly in content/published/ with reviewed: false — that is the working source of truth, and placement is not the gate. Flipping a row/card to reviewed: true (and filling reviewer/date where the schema has them) is what waits for the user's explicit REVIEW_ACCEPT.
10. If you are unsure about anatomy, you are forbidden from guessing.

STACK
- App: Vite + React + TypeScript + React Three Fiber + drei
- Volume: embed Neuroglancer or Vizarr pointing at OME-Zarr on R2 / HOA
- API: Cloudflare Worker
- Data: R2 + D1
- Package manager: pnpm

OUTPUT
- Show the file path first.
- Keep functions short.
- No placeholder anatomy such as “typical length 12 cm” unless that number is in an attached source file.
```

### 5.2 AGENTS.md (repo file the agent always reads)

```md
# Agent rules

Read docs/specs/00-truth-rules.md before any task.

Never edit content/published/ unless the user explicitly says REVIEW_ACCEPT.

Cloudflare bind names (wrangler.toml):
- R2: ANATOMY_BUCKET
- D1: anatomy_graph
- Secret: DEEPSEEK_API_KEY

App public config may include R2 public Worker URL only. No API keys.
```

### 5.3 Task prompts (copy-paste)

**Task A — scaffold monorepo**

```text
Context: empty repo anatomy-atlas. Use pnpm workspaces.
Create packages/app (Vite React TS), packages/worker (Wrangler), packages/schema, packages/tools (python placeholder), wrangler.toml with Pages project + R2 binding ANATOMY_BUCKET + D1 anatomy_graph.
Add AGENTS.md from my spec.
Do not add Three.js yet.
Do not invent sample organs beyond fixture structures: body, heart, heart-left-ventricle with reviewed=false.
```

**Task B — schema + validator**

```text
Implement packages/schema with zod StructureSchema and FactCard frontmatter schema.
Add packages/graph/validate.ts that fails if:
- reviewed true but sources empty
- tissue layer missing hoa_dataset_doi or voxel_size_um
- part_of points at missing id
Add fixtures under packages/{schema,graph}/src/fixtures/. Tests use node:test (repo standard, not vitest).
Do not fill real anatomy facts.
```

**Task C — HuBMAP GLB viewer**

```text
In packages/app add a R3F canvas that loads ONE glb URL from import.meta.env.VITE_HEART_GLB.
Controls: orbit, zoom, click mesh → show sidebar with Structure fields from structures.json.
If the picked mesh name is not in the graph, show DATA_MISSING, do not guess a label.
No environment-map beauty lighting that hides that this is a reference model.
```

**Task D — Visible Human slice explorer**

```text
Add a slice viewer for a numbered PNG/Zarr overview stored on R2.
UI: slider for z index, display pixel size from metadata.json (I will supply metadata.json).
Do not interpolate fake slices. Nearest-neighbor only.
Show source banner: NLM Visible Human Male.
```

**Task E — HOA Neuroglancer embed**

```text
Add route /volume/heart that iframes Neuroglancer with a source URL I will put in VITE_HOA_HEART_ZARR.
On the same page render a panel:
- dataset DOI
- voxel size µm
- license CC BY 4.0
- link to human-organ-atlas.esrf.eu dataset page
Do not convert the volume to GLB.
Do not claim cellular resolution unless voxel_size_um <= 2.
```

**Task F — Worker facts API**

```text
Worker routes:
GET /api/structures
GET /api/structures/:id
GET /api/facts/:id
POST /api/chat
Chat: send user message + current structure id to DeepSeek.
System prompt for chat MUST include the fact card text only.
If fact card missing, return { error: "DATA_MISSING" } without calling DeepSeek.
Use env.DEEPSEEK_API_KEY. Model deepseek-v4-flash. Temperature 0.2.
Cache GET responses at the edge (max-age=3600).
```

**Task G — draft fact card (text only)**

```text
Attached: ASCT+B excerpt and HOA dataset metadata.
Draft content/drafts/facts/heart-left-ventricle.md
Rules: every sentence needs a citation key from the attachments.
If a relation is not in the attachments, omit it.
Do not add clinical advice.
reviewed: false
```

**Task H — refuse hallucination test**

```text
Write a unit test that mocks DeepSeek and asserts POST /api/chat for unknown id never calls fetch and returns DATA_MISSING.
```

---

## 6. Step-by-step build (you do the data; Flash does the code)

### Step 1 — Cloudflare pieces (30–60 min)

In the existing Cloudflare account used by Numberra:

1. Create R2 bucket `anatomy-public`.
2. Create D1 `anatomy_graph`.
3. Create Pages project `anatomy-atlas`.
4. Create Worker `anatomy-api`.
5. Bind R2 + D1 to the Worker and Pages (via wrangler).
6. `wrangler secret put DEEPSEEK_API_KEY` on the Worker only.

Cost: near zero until R2 stores a few GB.

### Step 2 — freeze sources (you, not the agent)

Fill `docs/sources.md` with the exact HOA heart dataset you pick on https://human-organ-atlas.esrf.eu (note DOI, voxel size, donor metadata, license).

Download only:
- HuBMAP heart (+ lungs/aorta if needed for context) GLB
- ASCT+B heart CSV
- HOA **lowest overview pyramid** and metadata (hoa-tools / portal downsample ≤400 MB class)
- A small Visible Human region first (thorax PNGs), not the entire 15 GB male set

Put files in `incoming/` locally. Do not commit binaries. Sync to R2:

```bash
wrangler r2 object put anatomy-public/hubmap/glb/heart-male.glb --file incoming/heart.glb
```

### Step 3 — agent scaffold

New session. Attach AGENTS.md + Task A prompt. After it runs:

```bash
pnpm i
pnpm --filter schema test
wrangler pages project list
```

You review diffs. No anatomy yet.

### Step 4 — schema

New session. Attach schema spec + Task B. You add 3 real rows by hand to `content/published/structures.json` only when ids and sources are known. Keep `reviewed: false` until you read the citations.

### Step 5 — mesh viewer

Task C. Point `VITE_HEART_GLB` at the Worker asset URL that streams the R2 GLB.

Quality bar: mesh loads, click shows DATA_MISSING for unnamed primitives. That is success. Naming comes after you map mesh node names → Uberon using HuBMAP metadata, not by asking Flash “what is this bump”.

### Step 6 — slice body context

Task D. Convert a thorax subset of Visible Human PNGs to a tiny Zarr or just numbered WebP on R2 (WebP is cheaper to serve). Record `pixel_size_mm` from NLM docs in `metadata.json` yourself.

### Step 7 — HOA volume

Task E. Prefer embedding the official Neuroglancer demo with your zarr source rather than writing a renderer.

If HOA already hosts OME-Zarr/N5 for Neuroglancer, **stream from them** in v1 and only mirror low levels to R2 if their CORS/availability is painful. Mirroring full data is how costs explode.

### Step 8 — Worker + gated chat

Task F + H. Chat prompt on the Worker:

```text
You are a tutor for a public-domain anatomy atlas.
Answer ONLY using FACT_CARD below.
If the user asks something not in FACT_CARD, say you do not have a sourced answer in this atlas.
Do not give medical advice.
Always repeat the dataset citation at the end.

FACT_CARD:
{{fact_card}}
```

### Step 9 — one reviewed fact card

You pick left ventricle. Run Task G. You edit the draft, add `reviewed: true`, move to `content/published/`. Only then the sidebar shows prose.

### Step 10 — registration (slow, high value)

Do not ask Flash to “align the GLB to HOA”.  
You do a coarse alignment:
- Place HuBMAP heart GLB in a unit scene.
- When user clicks “Open HiP-CT”, switch route; do not pretend the cameras are voxel-accurate in v1.
- v1.1: store a manual transform matrix you measured (scale/rotation/translation) in `content/published/transforms/heart.json` after comparing landmarks.

Document the transform error estimate (e.g. “visual registration, landmark error not quantified”).

---

## 7. Quality gates (run before every deploy)

```bash
pnpm --filter graph validate
pnpm --filter worker test
pnpm --filter app build
```

`validate` must fail the release if any `reviewed: true` node lacks sources.

Manual QA checklist:
- [ ] Heart GLB source banner visible
- [ ] HOA DOI + µm/voxel visible before volume loads
- [ ] Unknown click → DATA_MISSING
- [ ] Chat on unpublished id → no DeepSeek call (check Worker logs)
- [ ] Footer disclaimer present
- [ ] Licenses page lists NLM, HuBMAP, HOA CC BY

---

## 8. Cost envelope (quality kept)

Expected v1 storage:
- GLBs: tens of MB
- VH thorax WebP + metadata: 0.5–3 GB
- HOA overview low levels: 0.4–2 GB
- One VOI downsample: 0.5–3 GB

R2 storage is cheap. The bill risk is **accidentally uploading full-res HOA**. Never sync scale-0 of a brain.

DeepSeek: coding sessions + rare chat. Keep chat temperature low and facts short so prompts stay small. Cache fact GET on Worker.

Pages + Workers free tier is enough for a personal atlas with modest traffic.

Compute you pay once:
- A short Hetzner/local machine to convert VH slices and inspect HOA with `hoa-tools` / Fiji. Not Cloudflare.

---

## 9. What you personally must do (agent cannot)

1. Choose the exact HOA heart DOI.
2. Read HuBMAP mesh names and map them to Uberon.
3. Review every fact card.
4. Accept or reject transforms.
5. Write the public methodology page.

If those five stay human, DeepSeek Flash can build the rest without turning the atlas into Anatomy Atelier.

---

## 10. First command block (today)

```bash
mkdir anatomy-atlas && cd anatomy-atlas
git init
# paste AGENTS.md and docs/specs/00-truth-rules.md
# open DeepSeek agent with Global system prompt + Task A
```

Then stop. Verify the scaffold. Do not chain Tasks B–F in one context window. Fresh session per task keeps Flash cheap and less likely to “complete” missing anatomy.
