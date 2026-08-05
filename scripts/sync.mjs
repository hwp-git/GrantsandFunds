#!/usr/bin/env node
/**
 * Daily source sync. Pulls funding opportunities from:
 *   1. Grants.gov Search2 API (official, keyless) — US federal grants
 *   2. Taiwan announcement pages (經濟部 / SBIR) — HTML anchor scan
 *
 * Merges results into public/data/catalog.json on top of the curated seed
 * (src/data/catalog.seed.json), preserving each item's `firstSeen` stamp so
 * the app's NEW badges reflect genuine first discovery. Every source is
 * fetched independently; a failure logs a warning and keeps prior data.
 *
 * Usage: node scripts/sync.mjs           (real fetch — run from CI)
 *        node scripts/sync.mjs --fixtures scripts/fixtures
 *                                        (offline test with canned responses)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SEED_PATH = resolve(ROOT, 'src/data/catalog.seed.json')
const CATALOG_PATH = resolve(ROOT, 'public/data/catalog.json')

const fixtureDir = (() => {
  const i = process.argv.indexOf('--fixtures')
  return i === -1 ? null : resolve(ROOT, process.argv[i + 1])
})()

const TODAY = new Date().toISOString().slice(0, 10)

// Opportunity numbers already represented by curated seed entries — the API
// would return these as duplicates.
const CURATED_OPP_NUMBERS = new Set(['PA-25-303', 'PA-25-304'])

// ── helpers ──────────────────────────────────────────────────────

async function getText(url, init) {
  if (fixtureDir) {
    const name = url.replace(/[^a-z0-9]+/gi, '_').slice(0, 80) + '.txt'
    return readFileSync(resolve(fixtureDir, name), 'utf8')
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(30000), ...init })
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  return res.text()
}

const getJson = async (url, init) => JSON.parse(await getText(url, init))

/** "09/05/2026" → "2026-09-05" */
function usDateToIso(d) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d ?? '')
  return m ? `${m[3]}-${m[1]}-${m[2]}` : undefined
}

/** Extract a date from Chinese text: 2026/8/31, 2026年8月31日, or ROC 115年8月31日 */
function zhDateToIso(text) {
  const m = /(\d{2,4})[/年.](\d{1,2})[/月.](\d{1,2})/.exec(text ?? '')
  if (!m) return undefined
  let year = Number(m[1])
  if (year < 1000) year += 1911 // ROC calendar
  if (year < 2000 || year > 2100) return undefined
  return `${year}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
}

const stripTags = (html) =>
  (html ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&amp;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim()

// ── source 1: Grants.gov ─────────────────────────────────────────

const GRANTS_GOV_QUERIES = ['sleep apnea', 'sleep']

async function fetchGrantsGov() {
  const hits = new Map() // oppNumber → hit
  for (const keyword of GRANTS_GOV_QUERIES) {
    const body = JSON.stringify({ keyword, rows: 40, oppStatuses: 'forecasted|posted' })
    const json = await getJson('https://api.grants.gov/v1/api/search2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    for (const hit of json?.data?.oppHits ?? []) {
      if (!hit.number || CURATED_OPP_NUMBERS.has(hit.number)) continue
      if (!hits.has(hit.number)) hits.set(hit.number, hit)
    }
  }

  const programs = []
  for (const hit of [...hits.values()].slice(0, 30)) {
    const program = {
      id: `gg-${hit.number}`,
      kind: 'grant',
      region: 'US',
      name: `${hit.title} (${hit.number})`,
      org: hit.agency ?? hit.agencyCode ?? 'US federal agency',
      description: `${hit.oppStatus === 'forecasted' ? 'Forecasted opportunity. ' : ''}Auto-captured from Grants.gov — open the official page for the full synopsis.`,
      amount: { currency: 'USD' },
      deadline: usDateToIso(hit.closeDate),
      deadlineNote: hit.oppStatus === 'forecasted' ? 'Forecasted — dates may change' : undefined,
      dilutive: false,
      equityNote: 'Non-dilutive federal grant',
      focus: ['auto-discovered'],
      url: `https://www.grants.gov/search-results-detail/${hit.id}`,
      source: 'grants.gov',
    }
    // Enrich with award amounts from the detail endpoint; best-effort.
    try {
      const detail = await getJson('https://api.grants.gov/v1/api/fetchOpportunity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: hit.id }),
      })
      const syn = detail?.data?.synopsis ?? {}
      const floor = Number(syn.awardFloor)
      const ceiling = Number(syn.awardCeiling)
      if (ceiling > 0) program.amount = { min: floor > 0 ? floor : undefined, max: ceiling, currency: 'USD' }
      const desc = stripTags(syn.synopsisDesc)
      if (desc) program.description = desc.length > 300 ? desc.slice(0, 297) + '…' : desc
    } catch (e) {
      console.warn(`  detail fetch failed for ${hit.number}: ${e.message}`)
    }
    programs.push(program)
  }
  return programs
}

// ── source 2: Taiwan announcement pages ──────────────────────────

const TW_SOURCES = [
  {
    source: 'sbir.org.tw',
    org: '經濟部中小及新創企業署 — SBIR',
    page: 'https://www.sbir.org.tw/',
    base: 'https://www.sbir.org.tw',
  },
  {
    source: 'moea.gov.tw',
    org: '經濟部 (MOEA)',
    page: 'https://www.moea.gov.tw/MNS/populace/news/News.aspx?kind=1&menu_id=40',
    base: 'https://www.moea.gov.tw',
  },
]

const TW_KEYWORDS = /(SBIR|補助|徵案|申請|新創|研發計畫|公告|徵件)/

async function fetchTaiwanSource({ source, org, page, base }) {
  const html = await getText(page)
  const programs = []
  const seen = new Set()
  const anchorRe = /<a\s[^>]*href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = anchorRe.exec(html)) && programs.length < 8) {
    const href = m[1]
    const text = stripTags(m[2])
    if (text.length < 10 || !TW_KEYWORDS.test(text)) continue
    const url = href.startsWith('http') ? href : base + (href.startsWith('/') ? '' : '/') + href
    if (seen.has(url)) continue
    seen.add(url)
    const deadline = zhDateToIso(text)
    programs.push({
      id: `tw-ann-${simpleHash(url)}`,
      kind: 'grant',
      region: 'TW',
      name: text.length > 80 ? text.slice(0, 77) + '…' : text,
      org,
      description: '自動擷取的公告 — auto-captured announcement; open the linked page and verify details before acting.',
      amount: { currency: 'TWD', note: 'See announcement' },
      deadline: deadline && deadline >= TODAY ? deadline : undefined,
      dilutive: false,
      equityNote: 'Non-dilutive government program',
      focus: ['announcement'],
      url,
      source,
    })
  }
  return programs
}

function simpleHash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

// ── merge & write ────────────────────────────────────────────────

async function main() {
  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'))
  const previous = existsSync(CATALOG_PATH)
    ? JSON.parse(readFileSync(CATALOG_PATH, 'utf8'))
    : { programs: [] }
  const prevById = new Map(previous.programs.map((p) => [p.id, p]))

  const discovered = []
  const succeededSources = []
  const runSource = async (label, fn) => {
    try {
      const items = await fn()
      console.log(`✓ ${label}: ${items.length} items`)
      discovered.push(...items)
      succeededSources.push(label)
    } catch (e) {
      console.warn(`✗ ${label} failed: ${e.message} — keeping previous data`)
      // Retain previously discovered items from this source
      discovered.push(...previous.programs.filter((p) => p.source === label))
    }
  }

  await runSource('grants.gov', fetchGrantsGov)
  for (const src of TW_SOURCES) await runSource(src.source, () => fetchTaiwanSource(src))

  // Curated seed always wins on id collisions; drop discovered items whose
  // deadline has passed; stamp firstSeen (preserved for known ids).
  const curatedIds = new Set(seed.programs.map((p) => p.id))
  const byId = new Map()
  for (const p of discovered) {
    if (curatedIds.has(p.id) || byId.has(p.id)) continue
    if (p.deadline && p.deadline < TODAY) continue
    byId.set(p.id, { ...p, firstSeen: prevById.get(p.id)?.firstSeen ?? TODAY })
  }

  const catalog = {
    lastSynced: new Date().toISOString(),
    programs: [...seed.programs, ...byId.values()],
  }

  const changed =
    JSON.stringify(catalog.programs) !== JSON.stringify(previous.programs)
  if (!changed && succeededSources.length === 0) {
    console.log('No source succeeded and no changes — leaving catalog untouched.')
    process.exitCode = 1
    return
  }
  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n')
  console.log(
    `Catalog written: ${catalog.programs.length} programs ` +
      `(${byId.size} discovered), sources ok: ${succeededSources.join(', ') || 'none'}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
