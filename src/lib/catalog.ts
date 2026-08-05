import { useEffect, useState } from 'react'
import type { Program } from '../types'
import { SEED_LAST_SYNCED, SEED_PROGRAMS } from '../data/programs'

export interface Catalog {
  lastSynced: string
  programs: Program[]
}

declare global {
  interface Window {
    /** A host page may bake a synced catalog in ahead of time */
    __CATALOG__?: Catalog
  }
}

const isCatalog = (c: unknown): c is Catalog =>
  !!c && typeof c === 'object' && Array.isArray((c as Catalog).programs)

/**
 * The program catalog: starts from the bundled seed (or a host-injected
 * window.__CATALOG__), then swaps in the daily-synced catalog.json when
 * reachable. Failures are silent — the seed keeps the app working.
 */
export function useCatalog(): Catalog {
  const [catalog, setCatalog] = useState<Catalog>(() =>
    isCatalog(window.__CATALOG__)
      ? window.__CATALOG__
      : { lastSynced: SEED_LAST_SYNCED, programs: SEED_PROGRAMS },
  )

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}data/catalog.json`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (isCatalog(c)) setCatalog(c)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  return catalog
}
