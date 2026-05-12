import React, { useState, useEffect } from 'react'
import { css } from '@emotion/react'
import type { IntuneContext, DockPosition } from '@/shared/types'
import { DEFAULT_PANEL_SETTINGS } from '@/shared/constants'
import { Device360 } from '@/panel/modules/device360'

interface Props {
  context: IntuneContext
  hasToken: boolean
}

export function PanelShell({ context, hasToken }: Props) {
  const [visible, setVisible] = useState(true)
  const [dock, setDock] = useState<DockPosition>(DEFAULT_PANEL_SETTINGS.dockPosition)
  const [size, setSize] = useState({
    width: DEFAULT_PANEL_SETTINGS.width,
    height: DEFAULT_PANEL_SETTINGS.height,
  })

  useEffect(() => {
    chrome.storage.local.get(['dockPosition', 'panelWidth', 'panelHeight', 'isVisible'], (r) => {
      if (r.dockPosition) setDock(r.dockPosition as DockPosition)
      if (r.panelWidth) setSize((s) => ({ ...s, width: r.panelWidth as number }))
      if (r.panelHeight) setSize((s) => ({ ...s, height: r.panelHeight as number }))
      if (r.isVisible !== undefined) setVisible(r.isVisible as boolean)
    })
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key === 'I') setVisible((v) => !v)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    chrome.storage.local.set({ isVisible: visible })
  }, [visible])

  const toggleDock = () => {
    const next: DockPosition = dock === 'side' ? 'bottom' : 'side'
    setDock(next)
    chrome.storage.local.set({ dockPosition: next })
  }

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        title="Open IntuneSpector (Alt+Shift+I)"
        css={css`
          position: fixed;
          bottom: 20px;
          right: 20px;
          pointer-events: all;
          background: var(--is-accent);
          color: #fff;
          border: none;
          border-radius: 50%;
          width: 42px;
          height: 42px;
          font-size: 20px;
          cursor: pointer;
          box-shadow: 0 2px 10px var(--is-shadow);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
          &:hover {
            background: #106ebe;
          }
        `}
      >
        🔍
      </button>
    )
  }

  const panelCss =
    dock === 'side'
      ? css`
          position: fixed;
          top: 0;
          right: 0;
          width: ${size.width}px;
          height: 100vh;
          pointer-events: all;
        `
      : css`
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100vw;
          height: ${size.height}px;
          pointer-events: all;
        `

  return (
    <div
      css={css`
        ${panelCss};
        background: var(--is-bg);
        color: var(--is-text);
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        font-size: 13px;
        line-height: 1.5;
        display: flex;
        flex-direction: column;
        box-shadow: ${dock === 'side'
          ? '-3px 0 16px'
          : '0 -3px 16px'} var(--is-shadow);
        overflow: hidden;
        z-index: 1;
      `}
    >
      <Header dock={dock} onToggleDock={toggleDock} onClose={() => setVisible(false)} />
      <div css={css`flex: 1; overflow-y: auto; overflow-x: hidden;`}>
        <Content context={context} hasToken={hasToken} />
      </div>
    </div>
  )
}

function Header({
  dock,
  onToggleDock,
  onClose,
}: {
  dock: DockPosition
  onToggleDock: () => void
  onClose: () => void
}) {
  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 7px 12px;
        background: var(--is-accent);
        flex-shrink: 0;
        user-select: none;
      `}
    >
      <span css={css`font-weight: 600; font-size: 13px; letter-spacing: 0.2px;`}>
        IntuneSpector
      </span>
      <div css={css`display: flex; gap: 4px;`}>
        <HeaderBtn
          onClick={onToggleDock}
          title={`Dock ${dock === 'side' ? 'bottom' : 'side'}`}
        >
          {dock === 'side' ? '⬇' : '➡'}
        </HeaderBtn>
        <HeaderBtn onClick={onClose} title="Close (Alt+Shift+I)">
          ✕
        </HeaderBtn>
      </div>
    </div>
  )
}

function HeaderBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      css={css`
        background: rgba(255, 255, 255, 0.18);
        border: none;
        color: #fff;
        border-radius: 3px;
        padding: 2px 7px;
        cursor: pointer;
        font-size: 12px;
        line-height: 18px;
        &:hover {
          background: rgba(255, 255, 255, 0.32);
        }
      `}
    >
      {children}
    </button>
  )
}

function Content({ context, hasToken }: { context: IntuneContext; hasToken: boolean }) {
  if (!context) {
    return (
      <div
        css={css`
          padding: 32px 20px;
          text-align: center;
          color: var(--is-text-muted);
        `}
      >
        <div css={css`font-size: 36px; margin-bottom: 10px;`}>🔍</div>
        <div css={css`font-size: 13px;`}>
          Navigate to a device, user, or policy in the Intune portal to see enrichment data.
        </div>
        {!hasToken && (
          <div
            css={css`
              margin-top: 14px;
              font-size: 12px;
              color: #f8a500;
              background: rgba(248, 165, 0, 0.1);
              border: 1px solid rgba(248, 165, 0, 0.25);
              border-radius: 4px;
              padding: 8px 12px;
            `}
          >
            Waiting for session token — navigate anywhere in the portal to activate.
          </div>
        )}
      </div>
    )
  }

  if (context.type === 'device') {
    return <Device360 deviceId={context.deviceId} azureAdDeviceId={context.azureAdDeviceId} />
  }

  return (
    <div css={css`padding: 20px; color: var(--is-text-muted); font-size: 13px;`}>
      Support for <strong>{context.type}</strong> context coming soon.
    </div>
  )
}
