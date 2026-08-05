import type { PipelineStage, Program, ProgramUserState } from '../types'
import { PIPELINE_STAGES } from '../types'
import { DeadlineChip, DilutionBadge } from './Badges'

interface Props {
  programs: Program[]
  getUserState: (id: string) => ProgramUserState
  onUpdate: (id: string, patch: Partial<ProgramUserState>) => void
  onOpenProject: () => void
}

export function PipelineView({ programs, getUserState, onUpdate, onOpenProject }: Props) {
  const tracked = programs.filter((p) => getUserState(p.id).stage !== 'none')

  if (tracked.length === 0) {
    return (
      <div className="empty">
        Nothing in the pipeline yet — add programs from the Discover tab using the
        “Add to pipeline” dropdown on each card.
      </div>
    )
  }

  return (
    <div className="pipeline">
      {PIPELINE_STAGES.map((stage) => {
        const items = tracked.filter((p) => getUserState(p.id).stage === stage.id)
        return (
          <div key={stage.id} className="pipeline-col">
            <div className="pipeline-col-head">
              {stage.label} <span className="count">{items.length}</span>
            </div>
            {items.map((p) => {
              const us = getUserState(p.id)
              return (
                <div key={p.id} className="pipeline-card">
                  <div className="pipeline-card-title">
                    {us.starred && <span className="mini-star">★</span>}
                    {p.name}
                  </div>
                  <div className="pipeline-card-meta">
                    <span className="tag">{p.kind === 'grant' ? 'Grant' : 'VC'}</span>
                    <span className="tag">{p.region === 'US' ? 'US' : 'Taiwan'}</span>
                  </div>
                  <div className="pipeline-card-badges">
                    <DeadlineChip deadline={p.deadline} note={p.deadlineNote} />
                    <DilutionBadge dilutive={p.dilutive} note={p.equityNote} />
                  </div>
                  {us.contactStatus && <div className="pipeline-contact">Contact: {us.contactStatus}</div>}
                  <div className="pipeline-card-actions">
                    <select
                      value={us.stage}
                      onChange={(e) => onUpdate(p.id, { stage: e.target.value as PipelineStage })}
                    >
                      {PIPELINE_STAGES.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                      <option value="none">Remove from pipeline</option>
                    </select>
                    {p.id === 'nih-sbir-omnibus' && (
                      <button className="link-btn" onClick={onOpenProject}>
                        SnapSleep workspace →
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {items.length === 0 && <div className="pipeline-empty">—</div>}
          </div>
        )
      })}
    </div>
  )
}
