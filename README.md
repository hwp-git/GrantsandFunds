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

## Hooking up real data later

The app is deliberately layered so live data can replace the seed data without
touching the UI:

- `src/data/programs.ts` — the program catalog. Shaped like what a daily
  source-sync job (Grants.gov / NIH Guide / 經濟部 / 國科會 / accelerator cohort
  pages) would emit. Replace the static array with a fetch; `firstSeen` +
  `LAST_SYNCED` drive the NEW badges and the "sources synced" indicator.
- `src/lib/store.ts` — user state (pipeline stages, stars, checklist,
  milestones, log) persisted to `localStorage`. Swap the load/save functions
  for API calls to add a backend.
- `src/lib/format.ts` — the indicative FX rate (`USD_TWD`) to replace with a
  live rate.

All amounts and deadlines in the seed data are modeled on the real programs
but must be verified on the official pages before relying on them.
