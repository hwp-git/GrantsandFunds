import { useEffect, useState } from 'react'
import type { AppState, ProgramUserState } from '../types'
import { DEFAULT_PROJECT } from '../data/snapsleep'

const KEY = 'grantsandfunds:v1'

const DEFAULT_STATE: AppState = {
  programs: {
    // SnapSleep's target grant starts in the pipeline, starred
    'nih-sbir-omnibus': { stage: 'preparing', starred: true },
  },
  project: DEFAULT_PROJECT,
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as AppState
    return {
      programs: parsed.programs ?? DEFAULT_STATE.programs,
      project: parsed.project ?? DEFAULT_STATE.project,
    }
  } catch {
    return DEFAULT_STATE
  }
}

/** Single-hook store persisted to localStorage (swap for API calls later). */
export function useAppState() {
  const [state, setState] = useState<AppState>(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])

  const getProgram = (id: string): ProgramUserState =>
    state.programs[id] ?? { stage: 'none', starred: false }

  const updateProgram = (id: string, patch: Partial<ProgramUserState>) =>
    setState((s) => ({
      ...s,
      programs: { ...s.programs, [id]: { ...getProgram(id), ...patch } },
    }))

  const updateProject = (patch: Partial<AppState['project']>) =>
    setState((s) => ({ ...s, project: { ...s.project, ...patch } }))

  return { state, getProgram, updateProgram, updateProject }
}
