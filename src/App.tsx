import { useMemo, useState } from 'react'
import type { FundingKind, Region } from './types'
import { useCatalog } from './lib/catalog'
import { useAppState } from './lib/store'
import { daysUntil, formatDate, isNew, urgency } from './lib/format'
import { DiscoverView } from './components/DiscoverView'
import { PipelineView } from './components/PipelineView'
import { ProjectView } from './components/ProjectView'
import { StatusSync } from './components/StatusSync'

type View = 'discover' | 'pipeline' | 'project'

export default function App() {
  const { state, getProgram, updateProgram, updateProject, replaceState } = useAppState()
  const { programs, lastSynced } = useCatalog()
  const [view, setView] = useState<View>('discover')
  const [kind, setKind] = useState<FundingKind>('grant')
  const [region, setRegion] = useState<Region>('US')

  const newCount = programs.filter((p) => isNew(p.firstSeen)).length

  // Alert strip: upcoming deadlines within 45 days for tracked/starred items,
  // plus anything ≤14 days regardless of tracking. Estimated dates are
  // excluded — an unconfirmed guess must never drive an urgency alert.
  const alerts = useMemo(
    () =>
      programs.filter((p) => p.deadline && p.deadlineConfidence !== 'estimated')
        .map((p) => ({ p, days: daysUntil(p.deadline!) }))
        .filter(({ p, days }) => {
          if (days < 0) return false
          const tracked = getProgram(p.id).stage !== 'none' || getProgram(p.id).starred
          return days <= 14 || (tracked && days <= 45)
        })
        .sort((a, b) => a.days - b.days),
    [state.programs, programs], // eslint-disable-line react-hooks/exhaustive-deps
  )

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◑</span>
          <div>
            <div className="brand-name">Grants &amp; Funds</div>
            <div className="brand-sub">SnapSleep AI funding tracker</div>
          </div>
        </div>

        <nav className="views">
          <button className={view === 'discover' ? 'active' : ''} onClick={() => setView('discover')}>
            Discover {newCount > 0 && <span className="nav-new">{newCount} new</span>}
          </button>
          <button className={view === 'pipeline' ? 'active' : ''} onClick={() => setView('pipeline')}>
            Pipeline
          </button>
          <button className={view === 'project' ? 'active' : ''} onClick={() => setView('project')}>
            SnapSleep AI
          </button>
        </nav>

        <div className="topbar-right">
          <div className="sync-note" title="The daily sync job scans US & Taiwan sources and stamps new items">
            Sources synced {formatDate(lastSynced.slice(0, 10))} · daily
          </div>
          <StatusSync state={state} programs={programs} onImport={replaceState} />
        </div>
      </header>

      {alerts.length > 0 && (
        <div className="alert-strip">
          <span className="alert-title">Upcoming deadlines:</span>
          {alerts.map(({ p, days }) => (
            <span key={p.id} className={`alert-chip u-${urgency(days)}`}>
              {p.name.split('(')[0].trim()} — {days === 0 ? 'today' : `${days}d`}
            </span>
          ))}
        </div>
      )}

      {view === 'discover' && (
        <>
          <div className="toggles">
            <div className="toggle-group">
              <button className={kind === 'grant' ? 'active' : ''} onClick={() => setKind('grant')}>
                Grants
              </button>
              <button className={kind === 'vc' ? 'active' : ''} onClick={() => setKind('vc')}>
                VC / Accelerators
              </button>
            </div>
            <div className="toggle-group">
              <button className={region === 'US' ? 'active' : ''} onClick={() => setRegion('US')}>
                United States
              </button>
              <button className={region === 'TW' ? 'active' : ''} onClick={() => setRegion('TW')}>
                Taiwan
              </button>
            </div>
          </div>
          <DiscoverView
            programs={programs}
            kind={kind}
            region={region}
            getUserState={getProgram}
            onUpdate={updateProgram}
          />
        </>
      )}

      {view === 'pipeline' && (
        <PipelineView
          programs={programs}
          getUserState={getProgram}
          onUpdate={updateProgram}
          onOpenProject={() => setView('project')}
        />
      )}

      {view === 'project' && (
        <ProjectView project={state.project} programs={programs} onUpdate={updateProject} />
      )}

      <footer className="footer">
        Dates marked <strong>“Est. … unconfirmed”</strong> are inferred from previous cycles and have
        not been verified — always open the official page before planning around them. Links are
        re-checked daily. FX shown at an indicative 1 USD ≈ 32.5 TWD.
      </footer>
    </div>
  )
}
