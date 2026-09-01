# Grants & Funds — SnapSleep AI funding tracker

A web app for tracking non-dilutive grants and VC/accelerator funding across the
**US** and **Taiwan**, built around the SnapSleep AI fundraising effort
(currently: NIH SBIR Phase I, pre-submission).

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build to dist/
```

## What's inside

| View | What it does |
|---|---|
| **Discover** | All programs, with Grants ↔ VC/Accelerators and US ↔ Taiwan toggles, search, deadline / non-dilutive / new-this-week / starred filters. NEW badges mark items first seen by the daily sync within 7 days. |
| **Pipeline** | Kanban of programs you're pursuing: Discovered → Researching → Preparing → Submitted → In Review → Awarded / Passed. VC cards carry a contact/intro status field. |
| **SnapSleep AI** | NIH SBIR Phase I workspace: 20-step application checklist (registrations → strategy → documents → submission), milestone timeline against the Sep 5 deadline, and a notes/activity log. |

Every program card shows **application deadline** (color-coded by urgency),
**funding amount / check size** in native currency with an indicative
USD⇄TWD conversion, and whether the money is **dilutive (equity)** or
**non-dilutive**. Taiwanese programs carry their official Chinese names
(e.g. 台灣新創競技場, 小型企業創新研發計畫).

## Daily source sync

`scripts/sync.mjs` pulls live opportunities and merges them into
`public/data/catalog.json`, which the app fetches at runtime (falling back to
the bundled seed in `src/data/catalog.seed.json` when unreachable):

1. **Grants.gov Search2 API** (official, keyless) — sleep-related US federal
   grants, enriched with award floors/ceilings from the detail endpoint.
2. **Taiwan announcement pages** (sbir.org.tw, 經濟部 news) — HTML anchor scan
   filtered by funding keywords, with Chinese/ROC-calendar deadline parsing.

Merge rules: curated seed entries always win on id collisions; each
discovered item's `firstSeen` date is preserved across runs (this drives the
NEW badges); items whose deadline has passed are dropped; a failing source
keeps its previous items rather than wiping them.

The GitHub Action `.github/workflows/sync.yml` runs the sync daily at 05:00
Taipei time and commits the catalog when it changes. Note: GitHub only runs
scheduled workflows on the repository's **default branch**. Run manually with:

```bash
npm run sync        # real fetch (needs open network — e.g. CI)
npm run sync:test   # offline run against scripts/fixtures/
```

Auto-discovered amounts and deadlines come from the sources verbatim —
verify on the official pages before relying on them.

## Data access — for AI agents/assistants reading this repo

Two different things live in two different places:

- **Program data** (`public/data/catalog.json`) — grants, VC/accelerator
  programs, deadlines, link-check status. Static JSON, git-tracked, updated
  daily by the sync workflow. Read it directly via the repo or a plain HTTP
  fetch — no JS execution needed.
- **User progress** (pipeline stage, starred, checklist, notes, activity log)
  — lives **only in the browser's `localStorage`**, keyed `grantsandfunds:v1`.
  It is never committed to this repo and the live site is a client-rendered
  SPA, so a bare fetch of the page gets an empty shell, not this data.

To get current progress: ask the user to click **Export status** in the app
header. It downloads a self-contained JSON snapshot
(`src/lib/portability.ts` → `buildSnapshot`) with a human/agent-readable
`pipeline` array (program name, org, stage, deadline — no need to
cross-reference the catalog) plus a `raw` block for exact re-import via the
**Import** button. There is no live sync between the browser and this repo;
treat any snapshot as a point-in-time read, not a subscription.

The indicative FX rate (`src/lib/format.ts`) is the other piece to move
server-side if a real backend is added later.
