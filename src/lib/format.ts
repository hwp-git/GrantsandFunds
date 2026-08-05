import type { Money } from '../types'

/** Indicative rate for the secondary display only — real FX comes later. */
export const USD_TWD = 32.5

const fmt = (n: number, currency: 'USD' | 'TWD') => {
  const s = new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'zh-TW', {
    maximumFractionDigits: n >= 1_000_000 ? 1 : 0,
    notation: n >= 1_000_000 ? 'compact' : 'standard',
  }).format(n)
  return currency === 'USD' ? `$${s}` : `NT$${s}`
}

export function formatMoney(m: Money): { primary: string; secondary?: string } {
  const { min, max, currency } = m
  if (min == null && max == null) return { primary: m.note ?? '—' }
  const range = (lo?: number, hi?: number, c: 'USD' | 'TWD' = currency) =>
    lo != null && hi != null && lo !== hi
      ? `${fmt(lo, c)}–${fmt(hi, c)}`
      : fmt((hi ?? lo)!, c)
  const other: 'USD' | 'TWD' = currency === 'USD' ? 'TWD' : 'USD'
  const conv = (n: number) => (currency === 'USD' ? n * USD_TWD : n / USD_TWD)
  return {
    primary: `${range(min, max)}${max != null && min == null ? ' max' : ''}`,
    secondary: `≈ ${range(min && conv(min), max && conv(max), other)}`,
  }
}

export function daysUntil(iso: string, from = new Date()): number {
  const d = new Date(iso + 'T23:59:59')
  return Math.ceil((d.getTime() - from.getTime()) / 86_400_000)
}

export function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function isNew(firstSeen: string, windowDays = 7): boolean {
  return -daysUntil(firstSeen) <= windowDays - 1
}

export type Urgency = 'overdue' | 'critical' | 'soon' | 'ok'
export function urgency(days: number): Urgency {
  if (days < 0) return 'overdue'
  if (days <= 14) return 'critical'
  if (days <= 45) return 'soon'
  return 'ok'
}
