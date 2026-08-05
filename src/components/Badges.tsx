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

export function DeadlineChip({ deadline, note }: { deadline?: string; note?: string }) {
  if (!deadline) {
    return <span className="badge badge-rolling" title={note}>Rolling / no deadline</span>
  }
  const days = daysUntil(deadline)
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
