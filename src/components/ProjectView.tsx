import { useMemo, useState } from 'react'
import type { LogEntry, Program, ProjectState } from '../types'
import { SEED_PROGRAMS } from '../data/programs'
import { SNAPSLEEP } from '../data/snapsleep'
import { daysUntil, formatDate, urgency } from '../lib/format'
import { DeadlineChip, DilutionBadge } from './Badges'

interface Props {
  project: ProjectState
  programs: Program[]
  onUpdate: (patch: Partial<ProjectState>) => void
}

export function ProjectView({ project, programs, onUpdate }: Props) {
  const target =
    programs.find((p) => p.id === SNAPSLEEP.targetProgramId) ??
    SEED_PROGRAMS.find((p) => p.id === SNAPSLEEP.targetProgramId)!
  const [newLog, setNewLog] = useState('')

  const doneCount = project.checklist.filter((c) => c.done).length
  const pct = Math.round((doneCount / project.checklist.length) * 100)
  const deadlineDays = target.deadline ? daysUntil(target.deadline) : null

  const groups = useMemo(() => {
    const order: string[] = []
    for (const c of project.checklist) if (!order.includes(c.group)) order.push(c.group)
    return order
  }, [project.checklist])

  const toggleItem = (id: string) =>
    onUpdate({
      checklist: project.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
    })

  const toggleMilestone = (id: string) =>
    onUpdate({
      milestones: project.milestones.map((m) => (m.id === id ? { ...m, done: !m.done } : m)),
    })

  const addLog = () => {
    const text = newLog.trim()
    if (!text) return
    const entry: LogEntry = {
      id: `l${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      text,
    }
    onUpdate({ log: [entry, ...project.log] })
    setNewLog('')
  }

  const deleteLog = (id: string) => onUpdate({ log: project.log.filter((l) => l.id !== id) })

  return (
    <div className="project">
      <div className="project-hero">
        <div>
          <h2>{SNAPSLEEP.name} — NIH SBIR Phase I</h2>
          <p className="project-tagline">{SNAPSLEEP.tagline}</p>
          <p className="project-status">
            <strong>Status:</strong> {SNAPSLEEP.status}
          </p>
          <div className="card-badges">
            <DeadlineChip deadline={target.deadline} note={target.deadlineNote} />
            <DilutionBadge dilutive={target.dilutive} note={target.equityNote} />
            <a className="link-btn" href={target.url} target="_blank" rel="noreferrer">
              PA-25-303 ↗
            </a>
          </div>
        </div>
        <div className="project-progress">
          <div className="progress-num">{pct}%</div>
          <div className="progress-label">{doneCount}/{project.checklist.length} steps done</div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          {deadlineDays != null && deadlineDays >= 0 && (
            <div className={`progress-deadline u-${urgency(deadlineDays)}`}>
              {deadlineDays} days to deadline
            </div>
          )}
        </div>
      </div>

      <div className="project-cols">
        <section className="panel">
          <h3>Application Checklist</h3>
          {groups.map((g) => (
            <div key={g} className="check-group">
              <div className="check-group-title">{g}</div>
              {project.checklist
                .filter((c) => c.group === g)
                .map((c) => (
                  <label key={c.id} className={`check-item ${c.done ? 'done' : ''}`}>
                    <input type="checkbox" checked={c.done} onChange={() => toggleItem(c.id)} />
                    <span>
                      {c.label}
                      {c.note && <em className="check-note"> — {c.note}</em>}
                    </span>
                  </label>
                ))}
            </div>
          ))}
        </section>

        <div className="project-col-right">
          <section className="panel">
            <h3>Timeline &amp; Milestones</h3>
            <div className="timeline">
              {project.milestones.map((m) => {
                const d = daysUntil(m.date)
                const state = m.done ? 'done' : d < 0 ? 'overdue' : d <= 7 ? 'imminent' : 'future'
                return (
                  <div key={m.id} className={`tl-item tl-${state}`} onClick={() => toggleMilestone(m.id)} title="Click to toggle done">
                    <div className="tl-dot" />
                    <div className="tl-date">{formatDate(m.date)}</div>
                    <div className="tl-label">
                      {m.label}
                      {!m.done && d >= 0 && <span className="tl-days">in {d}d</span>}
                      {!m.done && d < 0 && <span className="tl-days tl-late">{-d}d overdue</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="panel">
            <h3>Notes &amp; Activity Log</h3>
            <div className="log-add">
              <textarea
                placeholder="Log progress, calls, decisions… (e.g. 'Sent aims draft to Dr. Chen for feedback')"
                value={newLog}
                onChange={(e) => setNewLog(e.target.value)}
                rows={2}
              />
              <button className="primary" onClick={addLog} disabled={!newLog.trim()}>
                Add entry
              </button>
            </div>
            <div className="log-list">
              {project.log.map((l) => (
                <div key={l.id} className="log-entry">
                  <div className="log-date">{formatDate(l.date)}</div>
                  <div className="log-text">{l.text}</div>
                  <button className="log-del" title="Delete entry" onClick={() => deleteLog(l.id)}>×</button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
