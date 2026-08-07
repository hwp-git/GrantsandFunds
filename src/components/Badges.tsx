import type { Program } from '../types'
import { daysUntil, formatDate, urgency } from '../lib/format'

export function NewBadge() {
  return <span className="badge badge-new" title="First seen by the daily source sync within the last 7 days">NEW</span>
}

export function DilutionBadge({ dilutive, note }: { dilutive: boolean; note?: string }) {
  return (
    <span
      className={`badge ${dilutive ? 'badge-dilutive' : 'badge-nondilutive'}`}
      title={note ?? (dilutive ? 'Takes equity — dilutes founders' : 'Non-dilutive — no equity taken')}
    >
      {dilutive ? 'Dilutive (equity)' : 'Non-dilutive'}
    </span>
  )
}

interface DeadlineProps {
  deadline?: string
  note?: string
  confidence?: 'verified' | 'estimated'
}

export function DeadlineChip({ deadline, note, confidence }: DeadlineProps) {
  if (!deadline) {
    return <span className="badge badge-rolling" title={note}>Rolling / no deadline</span>
  }
  const days = daysUntil(deadline)

  // Estimated dates are inferred from past cycles, not confirmed. Show them as
  // a guide only — never as a countdown that could be trusted for planning.
  if (confidence === 'estimated') {
    return (
      <span
        className="badge badge-deadline-estimated"
        title={`Unconfirmed estimate based on previous cycles — check the official page.${note ? ` ${note}` : ''}`}
      >
        Est. {formatDate(deadline)} · unconfirmed
      </span>
    )
  }

  const u = urgency(days)
  const label =
    days < 0 ? `Passed (${formatDate(deadline)})`
    : days === 0 ? 'Due today!'
    : `${formatDate(deadline)} · ${days}d left`
  return (
    <span className={`badge badge-deadline-${u}`} title={note}>
      {label}
    </span>
  )
}

/** Surfaces link rot found by the daily link check. */
export function LinkStatusBadge({ program: p }: { program: Program }) {
  if (!p.linkStatus || p.linkStatus === 'ok') return null
  if (p.linkStatus === 'redirected') {
    return (
      <span
        className="badge badge-link-moved"
        title={`Official page redirects to ${p.linkFinalUrl} (checked ${p.linkCheckedAt})`}
      >
        Page moved
      </span>
    )
  }
  if (p.linkStatus === 'unverified') {
    return (
      <span
        className="badge badge-link-unverified"
        title={`The daily check couldn't reach this host (it may block automated traffic) — the page itself is probably fine. Last tried ${p.linkCheckedAt}.`}
      >
        Link unchecked
      </span>
    )
  }
  return (
    <span
      className="badge badge-link-broken"
      title={`The server returned an error for this URL when checked ${p.linkCheckedAt} — the page has likely moved or been removed.`}
    >
      Link broken
    </span>
  )
}
