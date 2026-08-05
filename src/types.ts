export type FundingKind = 'grant' | 'vc'
export type Region = 'US' | 'TW'

export type PipelineStage =
  | 'none'
  | 'discovered'
  | 'researching'
  | 'preparing'
  | 'submitted'
  | 'in_review'
  | 'awarded'
  | 'passed'

export const PIPELINE_STAGES: { id: PipelineStage; label: string }[] = [
  { id: 'discovered', label: 'Discovered' },
  { id: 'researching', label: 'Researching' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'submitted', label: 'Submitted / Applied' },
  { id: 'in_review', label: 'In Review' },
  { id: 'awarded', label: 'Awarded / Funded' },
  { id: 'passed', label: 'Passed / Declined' },
]

export interface Money {
  /** Amount in the program's native currency */
  min?: number
  max?: number
  currency: 'USD' | 'TWD'
  note?: string
}

export interface Program {
  id: string
  kind: FundingKind
  region: Region
  name: string
  /** Official Chinese name where one exists (Taiwan programs) */
  nameZh?: string
  org: string
  description: string
  amount: Money
  /** ISO date of the next application deadline; undefined = rolling */
  deadline?: string
  deadlineNote?: string
  /** Does taking this money dilute founder equity? */
  dilutive: boolean
  equityNote?: string
  stage?: string[]
  focus: string[]
  url: string
  /** Date this item was first picked up by the daily source sync */
  firstSeen: string
  /** 'curated' for hand-maintained entries, else the sync source (e.g. 'grants.gov') */
  source?: string
  /** For VC/accelerators: intro/contact status is tracked in user state */
}

export interface ChecklistItem {
  id: string
  label: string
  group: string
  done: boolean
  note?: string
}

export interface Milestone {
  id: string
  date: string
  label: string
  done: boolean
}

export interface LogEntry {
  id: string
  date: string
  text: string
}

export interface ProgramUserState {
  stage: PipelineStage
  starred: boolean
  /** Free-form: contact / intro status, notes */
  contactStatus?: string
  notes?: string
}

export interface ProjectState {
  checklist: ChecklistItem[]
  milestones: Milestone[]
  log: LogEntry[]
}

export interface AppState {
  programs: Record<string, ProgramUserState>
  project: ProjectState
}
