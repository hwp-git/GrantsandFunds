import { useMemo, useState } from 'react'
import type { FundingKind, Program, ProgramUserState, Region } from '../types'
import { daysUntil, isNew } from '../lib/format'
import { ProgramCard } from './ProgramCard'

interface Props {
  programs: Program[]
  kind: FundingKind
  region: Region
  getUserState: (id: string) => ProgramUserState
  onUpdate: (id: string, patch: Partial<ProgramUserState>) => void
}

type DeadlineFilter = 'all' | '14' | '45' | 'rolling'

export function DiscoverView({ programs, kind, region, getUserState, onUpdate }: Props) {
  const [search, setSearch] = useState('')
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>('all')
  const [nonDilutiveOnly, setNonDilutiveOnly] = useState(false)
  const [starredOnly, setStarredOnly] = useState(false)
  const [newOnly, setNewOnly] = useState(false)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return programs
      .filter((p) => p.kind === kind && p.region === region)
      .filter((p) => !nonDilutiveOnly || !p.dilutive)
      .filter((p) => !starredOnly || getUserState(p.id).starred)
      .filter((p) => !newOnly || isNew(p.firstSeen))
      .filter((p) => {
        if (deadlineFilter === 'all') return true
        if (deadlineFilter === 'rolling') return !p.deadline
        if (!p.deadline) return false
        const d = daysUntil(p.deadline)
        return d >= 0 && d <= Number(deadlineFilter)
      })
      .filter(
        (p) =>
          !q ||
          [p.name, p.nameZh, p.org, p.description, ...p.focus]
            .filter(Boolean)
            .some((t) => t!.toLowerCase().includes(q)),
      )
      .sort((a, b) => {
        // NEW items first, then nearest deadline, rolling last
        const an = isNew(a.firstSeen) ? 0 : 1
        const bn = isNew(b.firstSeen) ? 0 : 1
        if (an !== bn) return an - bn
        const ad = a.deadline ? daysUntil(a.deadline) : Infinity
        const bd = b.deadline ? daysUntil(b.deadline) : Infinity
        return ad - bd
      })
  }, [programs, kind, region, search, deadlineFilter, nonDilutiveOnly, starredOnly, newOnly, getUserState])

  return (
    <div>
      <div className="filter-bar">
        <input
          className="search"
          placeholder="Search programs, orgs, focus areas…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={deadlineFilter} onChange={(e) => setDeadlineFilter(e.target.value as DeadlineFilter)}>
          <option value="all">Any deadline</option>
          <option value="14">Due ≤ 14 days</option>
          <option value="45">Due ≤ 45 days</option>
          <option value="rolling">Rolling only</option>
        </select>
        <label className="check">
          <input type="checkbox" checked={nonDilutiveOnly} onChange={(e) => setNonDilutiveOnly(e.target.checked)} />
          Non-dilutive only
        </label>
        <label className="check">
          <input type="checkbox" checked={newOnly} onChange={(e) => setNewOnly(e.target.checked)} />
          New this week
        </label>
        <label className="check">
          <input type="checkbox" checked={starredOnly} onChange={(e) => setStarredOnly(e.target.checked)} />
          ★ Starred
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="empty">No programs match the current filters.</div>
      ) : (
        <div className="card-grid">
          {visible.map((p) => (
            <ProgramCard
              key={p.id}
              program={p}
              userState={getUserState(p.id)}
              onUpdate={(patch) => onUpdate(p.id, patch)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
