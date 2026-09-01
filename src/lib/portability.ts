import type { AppState, Program } from '../types'
import { PIPELINE_STAGES } from '../types'

const SCHEMA_VERSION = 1

/**
 * A self-contained snapshot: readable on its own (by a human, or an AI
 * agent with no app context) without cross-referencing catalog.json, plus
 * the raw state for lossless re-import.
 */
export function buildSnapshot(state: AppState, programs: Program[]) {
  const byId = new Map(programs.map((p) => [p.id, p]))
  const stageLabel = new Map(PIPELINE_STAGES.map((s) => [s.id, s.label]))

  const pipeline = Object.entries(state.programs)
    .filter(([, us]) => us.stage !== 'none' || us.starred)
    .map(([id, us]) => {
      const p = byId.get(id)
      return {
        id,
        name: p?.name ?? '(no longer in catalog)',
        org: p?.org,
        kind: p?.kind,
        region: p?.region,
        stage: us.stage,
        stageLabel: stageLabel.get(us.stage) ?? us.stage,
        starred: us.starred,
        contactStatus: us.contactStatus,
        deadline: p?.deadline,
        deadlineConfidence: p?.deadlineConfidence,
        url: p?.url,
      }
    })

  const doneChecklist = state.project.checklist.filter((c) => c.done).length

  return {
    app: 'grants-and-funds',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    summary: {
      pipelineItems: pipeline.length,
      starred: pipeline.filter((p) => p.starred).length,
      snapSleepChecklist: `${doneChecklist}/${state.project.checklist.length}`,
    },
    pipeline,
    snapSleepProject: state.project,
    // Full-fidelity state for exact re-import, independent of the above.
    raw: { programs: state.programs, project: state.project },
  }
}

export type Snapshot = ReturnType<typeof buildSnapshot>

export function downloadSnapshot(snapshot: Snapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `snapsleep-funding-status-${snapshot.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Accepts either a full snapshot (from this app) or a bare `{programs, project}` state. */
export function parseImport(text: string): AppState {
  const data = JSON.parse(text)
  const raw = data.raw ?? data
  if (!raw.programs || !raw.project) throw new Error('Not a recognized status file')
  return { programs: raw.programs, project: raw.project }
}
