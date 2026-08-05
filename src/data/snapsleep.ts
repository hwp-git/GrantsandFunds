import type { ProjectState } from '../types'

export const SNAPSLEEP = {
  name: 'SnapSleep AI',
  tagline:
    'Sleep tech utilizing AI software and airway hardware — camera and TRDs — to revolutionize the industry.',
  targetProgramId: 'nih-sbir-omnibus',
  status: 'Pre-submission — preparing NIH SBIR Phase I application',
}

/**
 * Default NIH SBIR Phase I application workspace for SnapSleep AI.
 * Loaded on first run; afterwards the user's saved state takes over.
 */
export const DEFAULT_PROJECT: ProjectState = {
  checklist: [
    // Registrations — these are sequential and slow; start earliest
    { id: 'sam', group: 'Registrations', label: 'SAM.gov entity registration (obtain UEI)', done: false, note: 'Can take 2–6 weeks — start immediately' },
    { id: 'sba', group: 'Registrations', label: 'SBA Company Registry (obtain SBC Control ID)', done: false },
    { id: 'era', group: 'Registrations', label: 'eRA Commons account (org + PI)', done: false },
    { id: 'grantsgov', group: 'Registrations', label: 'Grants.gov registration', done: false },
    { id: 'orcid', group: 'Registrations', label: 'ORCID iD for PI, linked to eRA Commons', done: false },

    // Pre-submission strategy
    { id: 'foa', group: 'Strategy', label: 'Confirm FOA (PA-27-100) & pick institute (NHLBI vs NIBIB)', done: false },
    { id: 'po-contact', group: 'Strategy', label: 'Email program officer — pitch aims, confirm fit', done: false },
    { id: 'clinical-trial', group: 'Strategy', label: 'Determine clinical-trial status (human subjects study design)', done: false },

    // Core science documents
    { id: 'aims', group: 'Application Documents', label: 'Specific Aims page (1 page)', done: false },
    { id: 'strategy-doc', group: 'Application Documents', label: 'Research Strategy (6 pages: Significance, Innovation, Approach)', done: false },
    { id: 'summary', group: 'Application Documents', label: 'Project Summary / Abstract (30 lines)', done: false },
    { id: 'narrative', group: 'Application Documents', label: 'Project Narrative (3 sentences, public health relevance)', done: false },
    { id: 'biosketch', group: 'Application Documents', label: 'Biosketches for PI & key personnel (NIH format)', done: false },
    { id: 'budget', group: 'Application Documents', label: 'Budget & justification (R&R form)', done: false },
    { id: 'facilities', group: 'Application Documents', label: 'Facilities & Other Resources + Equipment', done: false },
    { id: 'letters', group: 'Application Documents', label: 'Letters of support (sleep clinics, advisors, consultants)', done: false },
    { id: 'human-subjects', group: 'Application Documents', label: 'Human Subjects / PHS forms (if applicable)', done: false },

    // Submission
    { id: 'assist-draft', group: 'Submission', label: 'Assemble application in ASSIST', done: false },
    { id: 'internal-review', group: 'Submission', label: 'Internal red-team review of full draft', done: false },
    { id: 'submit-early', group: 'Submission', label: 'Submit ≥3 days early; verify assembled image in eRA Commons', done: false },
  ],
  milestones: [
    { id: 'm-reg', date: '2026-08-15', label: 'All federal registrations complete', done: false },
    { id: 'm-po', date: '2026-08-14', label: 'Program officer conversation done', done: false },
    { id: 'm-aims', date: '2026-08-18', label: 'Specific Aims finalized', done: false },
    { id: 'm-draft', date: '2026-08-26', label: 'Full Research Strategy draft', done: false },
    { id: 'm-review', date: '2026-08-31', label: 'Internal review complete, revisions in', done: false },
    { id: 'm-submit', date: '2026-09-02', label: 'Submit in ASSIST (3 days before deadline)', done: false },
    { id: 'm-deadline', date: '2026-09-05', label: 'NIH SBIR deadline — Sep 5, 5:00pm', done: false },
    { id: 'm-study', date: '2026-11-15', label: 'Study section review (est.)', done: false },
    { id: 'm-council', date: '2027-01-20', label: 'Advisory council review (est.)', done: false },
    { id: 'm-award', date: '2027-04-01', label: 'Earliest award start (est.)', done: false },
  ],
  log: [
    {
      id: 'l1',
      date: '2026-08-05',
      text: 'Project workspace created. Target: NIH SBIR Phase I, Sep 5 deadline. Status: pre-submission.',
    },
  ],
}
