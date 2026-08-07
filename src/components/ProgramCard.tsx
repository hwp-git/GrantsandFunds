import type { Program, PipelineStage, ProgramUserState } from '../types'
import { PIPELINE_STAGES } from '../types'
import { formatMoney, isNew } from '../lib/format'
import { DeadlineChip, DilutionBadge, LinkStatusBadge, NewBadge } from './Badges'

interface Props {
  program: Program
  userState: ProgramUserState
  onUpdate: (patch: Partial<ProgramUserState>) => void
}

export function ProgramCard({ program: p, userState, onUpdate }: Props) {
  const money = formatMoney(p.amount)
  return (
    <div className={`card ${userState.stage !== 'none' ? 'card-tracked' : ''}`}>
      <div className="card-head">
        <div className="card-title">
          <h3>
            {p.name}
            {p.nameZh && <span className="name-zh">{p.nameZh}</span>}
          </h3>
          <div className="card-org">{p.org}</div>
        </div>
        <button
          className={`star ${userState.starred ? 'starred' : ''}`}
          title={userState.starred ? 'Unstar' : 'Star / save'}
          onClick={() => onUpdate({ starred: !userState.starred })}
        >
          {userState.starred ? '★' : '☆'}
        </button>
      </div>

      <div className="card-badges">
        {isNew(p.firstSeen) && <NewBadge />}
        <DeadlineChip deadline={p.deadline} note={p.deadlineNote} confidence={p.deadlineConfidence} />
        <DilutionBadge dilutive={p.dilutive} note={p.equityNote} />
        <LinkStatusBadge program={p} />
      </div>

      <p className="card-desc">{p.description}</p>

      <div className="card-facts">
        <div>
          <span className="fact-label">{p.kind === 'grant' ? 'Funding' : 'Check size'}</span>
          <span className="fact-value">{money.primary}</span>
          {money.secondary && <span className="fact-sub">{money.secondary}</span>}
          {p.amount.note && <span className="fact-sub">{p.amount.note}</span>}
        </div>
        {p.stage && (
          <div>
            <span className="fact-label">Stage</span>
            <span className="fact-value">{p.stage.join(', ')}</span>
          </div>
        )}
      </div>

      <div className="card-tags">
        {p.focus.map((f) => (
          <span key={f} className="tag">{f}</span>
        ))}
      </div>

      <div className="card-actions">
        <select
          value={userState.stage}
          onChange={(e) => onUpdate({ stage: e.target.value as PipelineStage })}
          title="Pipeline stage"
        >
          <option value="none">＋ Add to pipeline…</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <a className="link-btn" href={p.url} target="_blank" rel="noreferrer">
          Official page ↗
        </a>
      </div>

      {p.kind === 'vc' && userState.stage !== 'none' && (
        <input
          className="contact-input"
          placeholder="Contact / intro status (e.g. warm intro via Dr. Lin, emailed 8/2)…"
          value={userState.contactStatus ?? ''}
          onChange={(e) => onUpdate({ contactStatus: e.target.value })}
        />
      )}
    </div>
  )
}
