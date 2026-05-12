import React, { useState, useEffect, useRef } from 'react'
import type { DockPosition, ThemePref, SectionConfig } from '@/shared/types'
import { DEFAULT_SECTION_LAYOUT } from '@/shared/constants'

export function Options() {
  const [dock, setDock] = useState<DockPosition>('side')
  const [preferBeta, setPreferBeta] = useState(true)
  const [theme, setTheme] = useState<ThemePref>('auto')
  const [saved, setSaved] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    chrome.storage.local.get(['dockPosition', 'preferBeta', 'theme'], (r) => {
      if (r.dockPosition) setDock(r.dockPosition as DockPosition)
      if (r.preferBeta !== undefined) setPreferBeta(r.preferBeta as boolean)
      if (r.theme) setTheme(r.theme as ThemePref)
    })
  }, [])

  const save = () => {
    chrome.storage.local.set({ dockPosition: dock, preferBeta, theme }, () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  function exportLayout() {
    chrome.storage.local.get(['sectionLayout'], (r) => {
      const layout: SectionConfig[] = r.sectionLayout ?? DEFAULT_SECTION_LAYOUT
      const json = JSON.stringify({ sectionLayout: layout }, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'intunespector-layout.json'
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string)
        if (json.sectionLayout && Array.isArray(json.sectionLayout)) {
          chrome.storage.local.set({ sectionLayout: json.sectionLayout }, () => {
            setImportMsg('Layout imported — reload the portal tab to apply')
            setTimeout(() => setImportMsg(''), 4000)
          })
        } else {
          setImportMsg('Invalid layout file')
          setTimeout(() => setImportMsg(''), 3000)
        }
      } catch {
        setImportMsg('Failed to parse file')
        setTimeout(() => setImportMsg(''), 3000)
      }
      if (importRef.current) importRef.current.value = ''
    }
    reader.readAsText(file)
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 500, margin: '36px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>IntuneSpector Options</h1>

      <Field label="Panel dock position">
        <select value={dock} onChange={(e) => setDock(e.target.value as DockPosition)} style={selectStyle}>
          <option value="side">Side (right)</option>
          <option value="bottom">Bottom</option>
        </select>
      </Field>

      <Field label="Theme">
        <select value={theme} onChange={(e) => setTheme(e.target.value as ThemePref)} style={selectStyle}>
          <option value="auto">Auto (follow OS / browser preference)</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </Field>

      <Field label="API endpoints">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={preferBeta}
            onChange={(e) => setPreferBeta(e.target.checked)}
          />
          Use <code>/beta</code> Graph endpoints (recommended — the Intune portal uses beta exclusively)
        </label>
      </Field>

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={save} style={btnStyle}>Save</button>
        {saved && <span style={{ color: '#107c10', fontSize: 13 }}>Saved</span>}
      </div>

      <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #e0e0e0' }} />

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Section Layout</h2>
      <p style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>
        Export your section order and visibility settings to share with others or back them up. Import a layout file to apply it.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={exportLayout} style={btnStyle}>Export layout</button>
        <button onClick={() => importRef.current?.click()} style={{ ...btnStyle, background: '#fff', color: '#0078d4', border: '1px solid #0078d4' }}>
          Import layout
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImportFile}
          style={{ display: 'none' }}
        />
        {importMsg && <span style={{ fontSize: 13, color: importMsg.startsWith('Layout') ? '#107c10' : '#c50f1f' }}>{importMsg}</span>}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 500, marginBottom: 6, fontSize: 14 }}>{label}</div>
      {children}
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 4,
  border: '1px solid #ccc',
  fontSize: 13,
  minWidth: 160,
}

const btnStyle: React.CSSProperties = {
  background: '#0078d4',
  color: '#fff',
  border: 'none',
  padding: '8px 18px',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
}
