import { useRef, useState } from 'react'
import type { AppState, Program } from '../types'
import { buildSnapshot, downloadSnapshot, parseImport } from '../lib/portability'

interface Props {
  state: AppState
  programs: Program[]
  onImport: (state: AppState) => void
}

/**
 * Progress (pipeline, starred, checklist, notes) lives only in this
 * browser's localStorage — nothing else, including an AI agent with full
 * repo access, can see it. Export produces a self-contained snapshot
 * (readable without the app or catalog.json) meant to be handed to a
 * person or agent, or committed to the repo for durable access.
 */
export function StatusSync({ state, programs, onImport }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const doExport = () => {
    downloadSnapshot(buildSnapshot(state, programs))
    setMsg('Exported')
    setTimeout(() => setMsg(null), 2000)
  }

  const doImport = async (file: File) => {
    try {
      const next = parseImport(await file.text())
      if (!confirm('Replace all current pipeline/checklist status with this file? This cannot be undone.')) return
      onImport(next)
      setMsg('Imported')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setTimeout(() => setMsg(null), 3000)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div className="status-sync" title="Your progress lives only in this browser — export to back it up or share with someone else">
      <button className="link-btn" onClick={doExport}>Export status</button>
      <span className="status-sync-sep">·</span>
      <button className="link-btn" onClick={() => fileInput.current?.click()}>Import</button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
      />
      {msg && <span className="status-sync-msg">{msg}</span>}
    </div>
  )
}
