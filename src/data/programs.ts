import type { Program } from '../types'
import seed from './catalog.seed.json'

/**
 * Bundled seed catalog — the hand-curated program list, used until the
 * synced catalog (public/data/catalog.json, refreshed daily by
 * scripts/sync.mjs via GitHub Actions) loads at runtime. See useCatalog().
 */
export const SEED_LAST_SYNCED = seed.lastSynced
export const SEED_PROGRAMS = seed.programs as Program[]
