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
const CURATED_OPP_NUMBERS = new Set(['PA-27-100', 'PA-25-303', 'PA-25-304'])

// ── helpers ──────────────────────────────────────────────────────

/**
 * Government sites (notably moea.gov.tw) reject requests without a browser
 * User-Agent, so send a realistic one and accept HTML explicitly.
 */
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
}

async function getText(url, init = {}) {
  if (fixtureDir) {
    const name = url.replace(/[^a-z0-9]+/gi, '_').slice(0, 80) + '.txt'
    return readFileSync(resolve(fixtureDir, name), 'utf8')
  }
  let lastError
  // Transient DNS/TLS failures against .tw hosts are common from CI; retry.
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1500 * attempt))
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(30000),
        redirect: 'follow',
        ...init,
        headers: { ...BROWSER_HEADERS, ...(init.headers ?? {}) },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.text()
    } catch (e) {
      lastError = e
    }
  }
  throw new Error(`${url} → ${lastError?.message ?? 'unknown error'}`)
}

const getJson = async (url, init = {}) =>
  JSON.parse(
    await getText(url, {
      ...init,
      headers: { Accept: 'application/json', ...(init.headers ?? {}) },
    }),
  )

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

const GRANTS_GOV_QUERIES = ['sleep apnea', 'sleep', 'SBIR sleep']

/**
 * Keyword search returns loosely-related results (a diabetes cohort study that
 * merely mentions sleep). Keep only titles that are actually on-topic, or that
 * are small-business vehicles we'd want to see regardless.
 */
const ON_TOPIC =
  /sleep|apnea|apnoea|insomnia|circadian|somn|snor|airway|respirat|wearable|digital health|remote monitoring|medical device/i
const SMALL_BUSINESS = /\b(SBIR|STTR|R4[123]|small business)\b/i

/** R41–R44 are SBIR/STTR (companies); R01/P01/U01 are institutional research. */
function eligibilityTag(number, title) {
  if (/\bR4[1234]\b/.test(number) || SMALL_BUSINESS.test(`${number} ${title}`)) {
    return 'small business eligible'
  }
  if (/\b(R01|P01|U01|R21|R35|K\d\d)\b/.test(`${number} ${title}`)) {
    return 'institutional (not SBIR)'
  }
  return 'check eligibility'
}

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
      if (!ON_TOPIC.test(hit.title ?? '') && !SMALL_BUSINESS.test(hit.title ?? '')) continue
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
      focus: ['auto-discovered', eligibilityTag(hit.number, hit.title ?? '')],
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

/** `pages` are tried in order until one responds; the rest are fallbacks. */
const TW_SOURCES = [
  {
    source: 'sbir.org.tw',
    org: '經濟部中小及新創企業署 — SBIR',
    pages: [
      'https://www.sbir.org.tw/announcements',
      'https://www.sbir.org.tw/',
      'https://sbir.org.tw/',
    ],
    base: 'https://www.sbir.org.tw',
  },
  {
    source: 'moea.gov.tw',
    org: '經濟部 (MOEA)',
    pages: [
      'https://www.moea.gov.tw/MNS/populace/news/News.aspx?kind=1&menu_id=40',
      'https://www.moea.gov.tw/Mns/populace/news/News.aspx?kind=1&menu_id=40',
    ],
    base: 'https://www.moea.gov.tw',
  },
  {
    source: 'smes.moea.gov.tw',
    org: '經濟部中小及新創企業署',
    pages: ['https://www.smes.moea.gov.tw/', 'https://www.sme.gov.tw/'],
    base: 'https://www.smes.moea.gov.tw',
  },
]

/** Announcements that represent an open call for applications. */
const TW_KEYWORDS = /(SBIR|補助|徵案|徵件|徵求|申請|受理|開放報名|研發計畫)/
/**
 * …minus the ones that only report on a closed round: approved-recipient
 * lists, selection results, info sessions, and press/outcome pieces.
 */
const TW_EXCLUDE = /(名單|核定|獲選|決審|花絮|成果發表|說明會|研討會|得獎|頒獎|報導)/

async function fetchTaiwanSource({ source, org, pages, base }) {
  let html, lastError
  for (const page of pages) {
    try {
      html = await getText(page)
      break
    } catch (e) {
      lastError = e
    }
  }
  if (html == null) throw lastError ?? new Error(`${source}: no candidate URL responded`)

  const programs = []
  const seen = new Set()
  const anchorRe = /<a\s[^>]*href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = anchorRe.exec(html)) && programs.length < 8) {
    const href = m[1]
    // Listings prefix each row with its publish date; that's not part of the title.
    const text = stripTags(m[2]).replace(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}\s*/, '')
    if (text.length < 10 || !TW_KEYWORDS.test(text) || TW_EXCLUDE.test(text)) continue
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
