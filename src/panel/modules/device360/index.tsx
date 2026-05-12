import React, { useEffect, useState, useCallback, useRef } from 'react'
import { css } from '@emotion/react'
import type { Device360Data, SectionConfig, SectionId } from '@/shared/types'
import type {
  DeviceHealthScriptState,
  DeviceAuditEvent,
  DetectedApp,
  Group,
  BitLockerRecoveryKey,
  AutopatchAlertGroup,
} from '@/shared/graph-types'
import { DEFAULT_SECTION_LAYOUT, SECTION_LABELS } from '@/shared/constants'

// ─── Status helpers ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  compliant: '#4caf50',
  success: '#4caf50',
  notdefective: '#4caf50',
  noncompliant: '#f44336',
  error: '#f44336',
  failed: '#f44336',
  conflict: '#ff5722',
  notapplicable: '#888',
  unknown: '#888',
  pending: '#ff9800',
  pendinginstallation: '#ff9800',
  pendingreboot: '#ff9800',
  uptodate: '#4caf50',
  notencrypted: '#f44336',
  encrypted: '#4caf50',
  notready: '#f44336',
  ready: '#4caf50',
}

const STATUS_DISPLAY: Record<string, string> = {
  noncompliant: 'Non-compliant',
  notapplicable: 'N/A',
  pendinginstallation: 'Pending install',
  pendingreboot: 'Pending reboot',
  notencrypted: 'Not encrypted',
  notdefective: 'Not defective',
  notready: 'Not ready',
  uptodate: 'Up to date',
  scriptfailed: 'Script failed',
  remediationfailed: 'Remediation failed',
  notregistered: 'Not registered',
  notsecure: 'Not secure',
}

function statusColor(status: string | undefined): string {
  return STATUS_COLORS[status?.toLowerCase() ?? ''] ?? '#888'
}

function formatStatus(status: string | undefined): string {
  if (!status) return '—'
  const lower = status.toLowerCase()
  if (STATUS_DISPLAY[lower]) return STATUS_DISPLAY[lower]
  // Split camelCase into words and capitalise first letter
  return status
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function fmtBytes(n: number | undefined): string {
  if (n == null) return '—'
  if (n >= 1_073_741_824) return `${(n / 1_073_741_824).toFixed(1)} GB`
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(0)} MB`
  return `${n} B`
}

// ─── Shared UI primitives ──────────────────────────────────────────────────────

function KV({ label, value, mono, title }: { label: string; value: React.ReactNode; mono?: boolean; title?: string }) {
  return (
    <div
      title={title}
      css={css`
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 6px;
        padding: 3px 0;
        border-bottom: 1px solid var(--is-border-subtle);
        align-items: baseline;
        &:last-child { border-bottom: none; }
      `}
    >
      <span css={css`color: var(--is-text-subtle); font-size: 11px; flex-shrink: 0;`}>{label}</span>
      <span
        css={css`
          color: var(--is-text-2);
          font-size: 12px;
          word-break: break-all;
          ${mono ? 'font-family: monospace; font-size: 11px;' : ''}
        `}
      >
        {value ?? <span css={css`color: var(--is-text-faintest);`}>—</span>}
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <span css={css`color: var(--is-text-faintest);`}>—</span>
  const color = statusColor(status)
  return (
    <span
      css={css`
        display: inline-block;
        font-size: 10px;
        font-weight: 500;
        padding: 1px 7px;
        border-radius: 4px;
        background: ${color}1a;
        color: ${color};
        border: 1px solid ${color}3a;
        white-space: nowrap;
        letter-spacing: 0.1px;
      `}
    >
      {formatStatus(status)}
    </span>
  )
}

function BoolBadge({ value, trueLabel = 'Yes', falseLabel = 'No' }: { value: boolean | undefined; trueLabel?: string; falseLabel?: string }) {
  if (value == null) return <span css={css`color: var(--is-text-faintest);`}>—</span>
  const color = value ? '#4caf50' : '#f44336'
  return (
    <span css={css`color: ${color}; font-size: 12px;`}>
      {value ? trueLabel : falseLabel}
    </span>
  )
}

function SectionHeader({ label, badge }: { label: string; badge?: string | number }) {
  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: var(--is-accent);
        margin-bottom: 10px;
        padding-bottom: 5px;
        border-bottom: 1px solid var(--is-border);
      `}
    >
      {label}
      {badge != null && (
        <span
          css={css`
            background: var(--is-badge-bg);
            color: var(--is-badge-text);
            border-radius: 10px;
            padding: 1px 7px;
            font-size: 10px;
            font-weight: 500;
            letter-spacing: 0;
          `}
        >
          {badge}
        </span>
      )}
    </div>
  )
}

function Section({
  title,
  badge,
  alertBadge,
  children,
  defaultExpanded = true,
  dim,
}: {
  title: string
  badge?: string | number
  alertBadge?: number
  children: React.ReactNode
  defaultExpanded?: boolean
  dim?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  return (
    <div css={css`border-bottom: 1px solid var(--is-border-subtle);`}>
      <button
        onClick={() => setExpanded((e) => !e)}
        css={css`
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px 14px;
          background: var(--is-bg-section);
          border: none;
          color: var(--is-text);
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: left;
          &:hover { background: var(--is-bg-raised); }
        `}
      >
        <span css={css`display: flex; align-items: center; gap: 8px;`}>
          <span css={css`color: ${dim ? 'var(--is-text-faint)' : 'var(--is-accent)'};`}>{title}</span>
          {badge != null && (
            <span
              css={css`
                background: var(--is-badge-bg);
                color: var(--is-badge-text);
                border-radius: 10px;
                padding: 1px 7px;
                font-size: 10px;
                font-weight: 500;
                letter-spacing: 0;
              `}
            >
              {badge}
            </span>
          )}
          {alertBadge != null && alertBadge > 0 && (
            <span
              css={css`
                background: #ff980022;
                color: #ff9800;
                border: 1px solid #ff980055;
                border-radius: 10px;
                padding: 1px 7px;
                font-size: 10px;
                font-weight: 600;
                letter-spacing: 0;
              `}
            >
              ⚠ {alertBadge}
            </span>
          )}
        </span>
        <span
          css={css`
            color: var(--is-text-faintest);
            font-size: 13px;
            display: inline-block;
            transition: transform 0.15s ease;
            transform: rotate(${expanded ? '90deg' : '0deg'});
            line-height: 1;
          `}
        >›</span>
      </button>
      {expanded && <div css={css`padding: 10px 14px;`}>{children}</div>}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <div css={css`color: var(--is-text-faint); font-size: 11px; padding: 4px 0;`}>{message}</div>
}

function PolicyStatusBar({ statuses }: { statuses: string[] }) {
  if (statuses.length === 0) return null
  // Bucket each status into a color lane; preserve insertion order for display
  const lanes = new Map<string, number>()
  const ORDER = ['#4caf50', '#f44336', '#ff5722', '#ff9800', '#888']
  for (const s of statuses) {
    const color = STATUS_COLORS[s.toLowerCase()] ?? '#888'
    lanes.set(color, (lanes.get(color) ?? 0) + 1)
  }
  const segments = ORDER.map((color) => ({ color, count: lanes.get(color) ?? 0 })).filter((s) => s.count > 0)
  return (
    <div
      css={css`
        display: flex;
        height: 3px;
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 10px;
        gap: 1px;
      `}
    >
      {segments.map((seg) => (
        <div
          key={seg.color}
          css={css`background: ${seg.color}; flex: ${seg.count}; min-width: 3px;`}
          title={`${seg.count} ${seg.color === '#4caf50' ? 'compliant' : seg.color === '#f44336' ? 'error/failed' : seg.color === '#ff5722' ? 'conflict' : seg.color === '#ff9800' ? 'pending' : 'other'}`}
        />
      ))}
    </div>
  )
}

function SectionError({ sectionKey, errors }: { sectionKey: string; errors: Record<string, string> }) {
  const raw = errors[sectionKey]
  if (!raw) return null
  const msg = raw.startsWith('auth:')
    ? 'Insufficient permissions to load this section'
    : raw
  return (
    <div
      css={css`
        font-size: 11px;
        color: #f44336;
        background: rgba(244,67,54,0.08);
        border-radius: 3px;
        padding: 5px 8px;
        margin-top: 4px;
      `}
    >
      {msg}
    </div>
  )
}

// ─── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, label }: { score: number | undefined; label: string }) {
  const value = score ?? 0
  const color = value >= 80 ? '#4caf50' : value >= 50 ? '#ff9800' : '#f44336'
  return (
    <div css={css`display: flex; flex-direction: column; align-items: center; gap: 4px;`}>
      <div
        css={css`
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: conic-gradient(${color} ${value * 3.6}deg, var(--is-border) 0deg);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          &::after {
            content: '';
            position: absolute;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: var(--is-bg);
          }
        `}
      >
        <span
          css={css`
            font-size: 14px;
            font-weight: 700;
            color: ${score != null ? color : 'var(--is-text-faint)'};
            position: relative;
            z-index: 1;
          `}
        >
          {score != null ? Math.round(value) : '—'}
        </span>
      </div>
      <span css={css`font-size: 10px; color: var(--is-text-muted); text-align: center; max-width: 60px; line-height: 1.3;`}>
        {label}
      </span>
    </div>
  )
}

// ─── Device 360 root component ─────────────────────────────────────────────────

interface Props {
  deviceId: string
  azureAdDeviceId?: string
}

type LoadState = 'idle' | 'loading' | 'ready' | 'auth-error' | 'no-token' | 'error'

export function Device360({ deviceId, azureAdDeviceId }: Props) {
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [data, setData] = useState<Device360Data | null>(null)

  const load = useCallback(() => {
    if (!deviceId) return
    setLoadState('loading')
    chrome.runtime.sendMessage(
      { type: 'FETCH_DEVICE360', deviceId, azureAdDeviceId },
      (res: { success: boolean; data?: Device360Data; error?: string }) => {
        if (chrome.runtime.lastError) { setLoadState('error'); return }
        if (!res?.success) {
          if (res?.error === 'auth-error') setLoadState('auth-error')
          else if (res?.error === 'no-token') setLoadState('no-token')
          else setLoadState('error')
          return
        }
        setData(res.data ?? null)
        setLoadState('ready')
      }
    )
  }, [deviceId, azureAdDeviceId])

  useEffect(() => { setData(null); load() }, [load])

  if (!deviceId) {
    return <div css={css`padding: 12px 14px; color: var(--is-text-faint); font-size: 12px;`}>Detecting device…</div>
  }

  if (loadState === 'loading' || loadState === 'idle') {
    return (
      <div css={css`padding: 20px 14px; display: flex; flex-direction: column; gap: 6px;`}>
        <LoadSkeleton />
        <LoadSkeleton width="80%" />
        <LoadSkeleton width="60%" />
      </div>
    )
  }

  if (loadState === 'auth-error') {
    return <AlertBanner color="#f44336">Session expired — reload the Intune portal tab.</AlertBanner>
  }

  if (loadState === 'no-token') {
    return <AlertBanner color="#ff9800">Waiting for session token — navigate to any page in the portal to activate.</AlertBanner>
  }

  if (loadState === 'error' || !data) {
    return (
      <AlertBanner color="#f44336">
        Failed to load device data.{' '}
        <button
          onClick={load}
          css={css`background: none; border: none; color: var(--is-accent); cursor: pointer; font-size: 12px; padding: 0; text-decoration: underline;`}
        >
          Retry
        </button>
      </AlertBanner>
    )
  }

  return <Device360Sections data={data} onRefresh={load} />
}

function LoadSkeleton({ width = '100%' }: { width?: string }) {
  return (
    <div
      css={css`
        height: 14px;
        width: ${width};
        background: linear-gradient(90deg, var(--is-bg-raised) 25%, var(--is-border) 50%, var(--is-bg-raised) 75%);
        background-size: 200% 100%;
        animation: shimmer 1.4s infinite;
        border-radius: 3px;
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
      `}
    />
  )
}

function AlertBanner({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div
      css={css`
        margin: 12px 14px;
        padding: 10px 12px;
        background: ${color}11;
        border: 1px solid ${color}33;
        border-radius: 4px;
        color: ${color};
        font-size: 12px;
      `}
    >
      {children}
    </div>
  )
}

// ─── Section layout persistence ───────────────────────────────────────────────

function useSectionLayout(): [SectionConfig[], (layout: SectionConfig[]) => void] {
  const [layout, setLayoutState] = useState<SectionConfig[]>(DEFAULT_SECTION_LAYOUT)

  useEffect(() => {
    chrome.storage.local.get(['sectionLayout'], (r) => {
      if (!r.sectionLayout) return
      const saved = r.sectionLayout as SectionConfig[]
      const validIds = new Set(DEFAULT_SECTION_LAYOUT.map((d) => d.id))
      const savedIds = new Set(saved.map((s) => s.id))
      const merged: SectionConfig[] = [
        ...saved.filter((s) => validIds.has(s.id)),
        ...DEFAULT_SECTION_LAYOUT.filter((d) => !savedIds.has(d.id)),
      ]
      setLayoutState(merged)
    })
  }, [])

  function setLayout(newLayout: SectionConfig[]) {
    setLayoutState(newLayout)
    chrome.storage.local.set({ sectionLayout: newLayout })
  }

  return [layout, setLayout]
}

// ─── Sections ─────────────────────────────────────────────────────────────────

const SECTION_RENDERERS: Record<SectionId, (data: Device360Data) => React.ReactNode> = {
  identity: (data) => <IdentitySection data={data} />,
  compliance: (data) => <ComplianceSection data={data} />,
  configProfiles: (data) => <ConfigProfilesSection data={data} />,
  windowsUpdate: (data) => <WindowsUpdateSection data={data} />,
  endpointAnalytics: (data) => <EndpointAnalyticsSection data={data} />,
  healthScripts: (data) => <HealthScriptsSection data={data} />,
  defender: (data) => <DefenderSection data={data} />,
  encryption: (data) => <EncryptionSection data={data} />,
  aad: (data) => <AzureADSection data={data} />,
  autopilot: (data) => <AutopilotSection data={data} />,
  bitlocker: (data) => <BitLockerSection data={data} />,
  laps: (data) => <LAPSSection data={data} />,
  auditLog: (data) => <AuditLogSection data={data} />,
  detectedApps: (data) => <DetectedAppsSection data={data} />,
  securityBaselines: (data) => <SecurityBaselinesSection data={data} />,
}

function Device360Sections({ data, onRefresh }: { data: Device360Data; onRefresh: () => void }) {
  const { device, errors } = data
  const [layout, setLayout] = useSectionLayout()
  const [isEditing, setIsEditing] = useState(false)
  const [pimDismissed, setPimDismissed] = useState(false)

  const authDeniedCount = Object.values(errors).filter((v) => v === 'auth:403').length
  const showPimBanner = !pimDismissed && authDeniedCount >= 3

  return (
    <div css={css`display: flex; flex-direction: column;`}>
      {showPimBanner && (
        <div
          css={css`
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin: 10px 14px 0;
            padding: 9px 11px;
            background: #f4433611;
            border: 1px solid #f4433633;
            border-radius: 4px;
            font-size: 11px;
            line-height: 1.5;
            color: #f44336;
          `}
        >
          <span css={css`flex: 1;`}>
            Permission denied on {authDeniedCount} sections — do you need to{' '}
            <a
              href="https://portal.azure.com/#view/Microsoft_Azure_PIMCommon/ActivationMenuBlade/~/aadmigratedroles"
              target="_blank"
              rel="noreferrer"
              css={css`color: #f44336; font-weight: 600; text-decoration: underline; &:hover { opacity: 0.8; }`}
            >
              PIM up
            </a>
            ?
          </span>
          <button
            onClick={() => setPimDismissed(true)}
            title="Dismiss"
            css={css`
              background: none; border: none; color: #f44336; cursor: pointer;
              padding: 0; font-size: 13px; line-height: 1; opacity: 0.7;
              flex-shrink: 0;
              &:hover { opacity: 1; }
            `}
          >
            ✕
          </button>
        </div>
      )}
      <div
        css={css`
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 5px 14px;
          background: var(--is-bg-surface);
          border-bottom: 1px solid var(--is-border-subtle);
        `}
      >
        <span css={css`font-size: 11px; color: var(--is-text-faint);`}>
          {device?.deviceName ?? 'Unknown device'}
        </span>
        <div css={css`display: flex; gap: 10px; align-items: center;`}>
          <button
            onClick={() => setIsEditing((e) => !e)}
            css={css`
              background: none; border: none;
              color: ${isEditing ? 'var(--is-accent)' : 'var(--is-text-faint)'};
              font-size: 11px; cursor: pointer; padding: 0;
              &:hover { text-decoration: underline; }
            `}
          >
            {isEditing ? '✓ Done' : '⊞ Layout'}
          </button>
          {!isEditing && (
            <button
              onClick={onRefresh}
              css={css`
                background: none; border: none; color: var(--is-accent);
                font-size: 11px; cursor: pointer; padding: 0;
                &:hover { text-decoration: underline; }
              `}
            >
              ↺ Refresh
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <SectionLayoutEditor layout={layout} onChange={setLayout} />
      ) : (
        <>
          {layout.filter((s) => s.visible).map((s) => (
            <React.Fragment key={s.id}>
              {SECTION_RENDERERS[s.id](data)}
            </React.Fragment>
          ))}
          {Object.keys(errors).length > 0 && (
            <Section title="Errors" defaultExpanded={false} dim>
              {Object.entries(errors).map(([key, msg]) => (
                <div key={key} css={css`font-size: 11px; color: var(--is-text-muted); padding: 2px 0;`}>
                  <span css={css`color: var(--is-text-faint);`}>{key}:</span> {msg}
                </div>
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  )
}

function SectionLayoutEditor({
  layout,
  onChange,
}: {
  layout: SectionConfig[]
  onChange: (layout: SectionConfig[]) => void
}) {
  const dragIndexRef = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  function handleDragStart(index: number) {
    dragIndexRef.current = index
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
      setDragOver(index)
    }
  }

  function handleDrop(index: number) {
    const from = dragIndexRef.current
    if (from === null || from === index) { setDragOver(null); return }
    const next = [...layout]
    const [removed] = next.splice(from, 1)
    next.splice(index, 0, removed)
    onChange(next)
    dragIndexRef.current = null
    setDragOver(null)
  }

  function handleDragEnd() {
    dragIndexRef.current = null
    setDragOver(null)
  }

  function toggleVisible(index: number) {
    onChange(layout.map((s, i) => i === index ? { ...s, visible: !s.visible } : s))
  }

  return (
    <div css={css`padding: 10px 14px;`}>
      <div css={css`font-size: 10px; color: var(--is-text-faintest); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;`}>
        Drag to reorder · check to show
      </div>
      <div css={css`display: flex; flex-direction: column; gap: 2px;`}>
        {layout.map((section, index) => (
          <div
            key={section.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            onDragEnd={handleDragEnd}
            css={css`
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 5px 6px;
              border-radius: 3px;
              border: 1px solid ${dragOver === index ? 'var(--is-accent)' : 'transparent'};
              background: ${dragOver === index ? 'var(--is-bg-raised)' : 'var(--is-bg-section)'};
              cursor: grab;
              user-select: none;
              &:active { cursor: grabbing; }
            `}
          >
            <span css={css`color: var(--is-text-faintest); font-size: 13px; flex-shrink: 0; line-height: 1;`}>⠿</span>
            <input
              type="checkbox"
              checked={section.visible}
              onChange={() => toggleVisible(index)}
              onClick={(e) => e.stopPropagation()}
              css={css`cursor: pointer; flex-shrink: 0; margin: 0;`}
            />
            <span css={css`
              font-size: 11px;
              color: ${section.visible ? 'var(--is-text-2)' : 'var(--is-text-faintest)'};
              flex: 1;
            `}>
              {SECTION_LABELS[section.id]}
            </span>
          </div>
        ))}
      </div>
      <div css={css`margin-top: 10px;`}>
        <button
          onClick={() => onChange(DEFAULT_SECTION_LAYOUT)}
          css={css`
            background: none; border: none; color: var(--is-text-faint);
            font-size: 10px; cursor: pointer; padding: 0;
            &:hover { color: var(--is-text); text-decoration: underline; }
          `}
        >
          Reset to default
        </button>
      </div>
    </div>
  )
}

// ── Identity & Hardware ────────────────────────────────────────────────────────

function IdentitySection({ data }: { data: Device360Data }) {
  const { device, hardware, scopeTags, errors } = data

  const joinTypeLabel: Record<string, string> = {
    azureADJoined: 'Azure AD Joined',
    hybridAzureADJoined: 'Hybrid Azure AD Joined',
    azureADRegistered: 'Azure AD Registered',
    unknown: 'Unknown',
  }

  const mgmtLabel: Record<string, string> = {
    mdm: 'MDM',
    easMdm: 'MDM + EAS',
    configurationManagerClientMdm: 'Co-Managed (MDM + ConfigMgr)',
    configurationManagerClient: 'ConfigMgr Only',
    intuneClient: 'Intune Client',
    jamf: 'Jamf',
    unknown: 'Unknown',
  }

  const storage = hardware?.totalStorageSpace ?? device?.hardwareInformation?.totalStorageSpace
  const storageFree = hardware?.freeStorageSpace ?? device?.hardwareInformation?.freeStorageSpace
  const ram = hardware?.physicalMemoryInBytes ?? device?.physicalMemoryInBytes

  return (
    <Section title="Identity & Hardware" defaultExpanded>
      <SectionError sectionKey={`device:${device?.id}`} errors={errors} />
      {!device ? (
        <EmptyState message="Device data unavailable" />
      ) : (
        <>
          <KV label="Device Name" value={<strong css={css`color: var(--is-text);`}>{device.deviceName}</strong>} />
          <KV label="OS" value={`${device.operatingSystem ?? ''} ${device.osVersion ?? ''}`.trim() || undefined} />
          <KV label="Join Type" value={joinTypeLabel[device.joinType ?? ''] ?? device.joinType} />
          <KV label="Management" value={mgmtLabel[device.managementAgent ?? ''] ?? device.managementAgent} />
          <KV label="Compliance" value={<StatusBadge status={device.complianceState} />} />
          <KV label="Encrypted" value={<BoolBadge value={device.isEncrypted} />} />
          <KV label="Serial" value={device.serialNumber} mono />
          <KV label="Model" value={device.model ? `${device.manufacturer ?? ''} ${device.model}`.trim() : undefined} />
          <KV label="Enrolled" value={fmtDate(device.enrolledDateTime)} />
          <KV label="Last Sync" value={fmtDate(device.lastSyncDateTime)} />
          <KV label="Primary User" value={device.userDisplayName ?? device.userPrincipalName} />
          {device.deviceEnrollmentType && <KV label="Enroll Type" value={device.deviceEnrollmentType} />}
          {(storage != null || storageFree != null) && (
            <KV
              label="Storage"
              value={
                storage != null
                  ? `${fmtBytes(storageFree)} free / ${fmtBytes(storage)}`
                  : fmtBytes(storageFree)
              }
            />
          )}
          {ram != null && <KV label="RAM" value={fmtBytes(ram)} />}
          {hardware?.tpmSpecificationVersion && <KV label="TPM Spec" value={hardware.tpmSpecificationVersion} mono />}
          {hardware?.tpmVersion && <KV label="TPM Version" value={hardware.tpmVersion} mono />}
          {device.ethernetMacAddress && <KV label="Ethernet MAC" value={device.ethernetMacAddress} mono />}
          {device.wiFiMacAddress && <KV label="Wi-Fi MAC" value={device.wiFiMacAddress} mono />}
          {hardware?.deviceFullQualifiedDomainName && (
            <KV label="FQDN" value={hardware.deviceFullQualifiedDomainName} mono />
          )}
          {hardware?.deviceGuardVirtualizationBasedSecurityState && (
            <KV label="VBS State" value={hardware.deviceGuardVirtualizationBasedSecurityState} />
          )}
          {hardware?.deviceGuardLocalSystemAuthorityCredentialGuardState && (
            <KV label="Cred Guard" value={hardware.deviceGuardLocalSystemAuthorityCredentialGuardState} />
          )}
          {device.bootstrapTokenEscrowed && <KV label="Bootstrap Token" value="Escrowed" />}
          <KV label="Intune ID" value={device.id} mono title={device.id} />
          {device.azureADDeviceId && (
            <KV label="Azure AD ID" value={device.azureADDeviceId} mono title={device.azureADDeviceId} />
          )}
          {scopeTags && scopeTags.length > 0 && (
            <KV
              label="Scope Tags"
              value={
                <div css={css`display: flex; flex-wrap: wrap; gap: 4px;`}>
                  {scopeTags.map((t) => (
                    <span
                      key={t.id}
                      css={css`
                        background: var(--is-badge-bg);
                        color: var(--is-badge-text);
                        border-radius: 3px;
                        padding: 1px 6px;
                        font-size: 10px;
                        border: 1px solid var(--is-border);
                      `}
                    >
                      {t.displayName ?? t.id}
                    </span>
                  ))}
                </div>
              }
            />
          )}
        </>
      )}
    </Section>
  )
}

// ── Compliance ─────────────────────────────────────────────────────────────────

function ComplianceSection({ data }: { data: Device360Data }) {
  const { compliancePolicies, errors } = data
  const nonCompliant = compliancePolicies?.filter((p) => p.PolicyStatus?.toLowerCase() === 'noncompliant').length ?? 0

  return (
    <Section title="Compliance" badge={compliancePolicies?.length} defaultExpanded={nonCompliant > 0}>
      <SectionError sectionKey={`compliance:${data.device?.id}`} errors={errors} />
      {!compliancePolicies || compliancePolicies.length === 0 ? (
        <EmptyState message="No compliance policies assigned" />
      ) : (
        <>
        <PolicyStatusBar statuses={compliancePolicies.map((p) => p.PolicyStatus ?? '')} />
        <table css={css`width: 100%; border-collapse: collapse; font-size: 11px;`}>
          <tbody>
            {compliancePolicies.map((p, i) => (
              <tr key={i} css={css`&:not(:last-child) td { border-bottom: 1px solid var(--is-border-subtle); }`}>
                <td css={css`padding: 4px 0; color: var(--is-text-3); padding-right: 8px;`}>{p.PolicyName || '—'}</td>
                <td css={css`padding: 4px 0; text-align: right;`}>
                  <StatusBadge status={p.PolicyStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      )}
    </Section>
  )
}

// ── Configuration Profiles ─────────────────────────────────────────────────────

const PROFILE_TYPE_SHORT: Record<string, string> = {
  'Microsoft.Management.Services.Api.DeviceConfiguration': 'DC',
  DeviceManagementConfigurationPolicy: 'Settings Catalog',
  DeviceConfigurationAdmxPolicy: 'ADMX',
  'Microsoft.Management.Services.Api.DeviceManagementIntent': 'Baseline',
}

function ConfigProfilesSection({ data }: { data: Device360Data }) {
  const { configProfiles, errors } = data
  const failed = configProfiles?.filter((p) => ['error', 'failed', 'conflict'].includes(p.PolicyStatus?.toLowerCase())).length ?? 0

  return (
    <Section title="Config Profiles" badge={configProfiles?.length} defaultExpanded={failed > 0}>
      <SectionError sectionKey={`configProfiles:${data.device?.id}`} errors={errors} />
      {!configProfiles || configProfiles.length === 0 ? (
        <EmptyState message="No configuration profiles" />
      ) : (
        <>
        <PolicyStatusBar statuses={configProfiles.map((p) => p.PolicyStatus ?? '')} />
        <table css={css`width: 100%; border-collapse: collapse; font-size: 11px;`}>
          <tbody>
            {configProfiles.map((p, i) => (
              <tr key={i} css={css`&:not(:last-child) td { border-bottom: 1px solid var(--is-border-subtle); }`}>
                <td css={css`padding: 4px 0; padding-right: 6px;`}>
                  <div css={css`color: var(--is-text-3);`}>{p.PolicyName || '—'}</div>
                  {p.PolicyBaseTypeName && (
                    <div css={css`color: var(--is-text-faint); font-size: 10px; margin-top: 1px;`}>
                      {PROFILE_TYPE_SHORT[p.PolicyBaseTypeName] ?? p.PolicyBaseTypeName}
                    </div>
                  )}
                </td>
                <td css={css`padding: 4px 0; text-align: right;`}>
                  <StatusBadge status={p.PolicyStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      )}
    </Section>
  )
}

// ── Endpoint Analytics ─────────────────────────────────────────────────────────

function EndpointAnalyticsSection({ data }: { data: Device360Data }) {
  const { endpointAnalytics, errors } = data

  return (
    <Section title="Endpoint Analytics" defaultExpanded={false}>
      <SectionError sectionKey={`endpointAnalytics:${data.device?.id}`} errors={errors} />
      {!endpointAnalytics ? (
        <EmptyState message="No Endpoint Analytics data" />
      ) : (
        <div css={css`display: flex; flex-direction: column; gap: 10px;`}>
          {endpointAnalytics.healthStatus && (
            <KV label="Health" value={<StatusBadge status={endpointAnalytics.healthStatus} />} />
          )}
          <div css={css`display: flex; justify-content: space-around; padding: 6px 0;`}>
            <ScoreRing score={endpointAnalytics.endpointAnalyticsScore} label="Overall" />
            <ScoreRing score={endpointAnalytics.startupPerformanceScore} label="Startup" />
            <ScoreRing score={endpointAnalytics.appReliabilityScore} label="App Reliability" />
            <ScoreRing score={endpointAnalytics.workFromAnywhereScore} label="Work Anywhere" />
          </div>
        </div>
      )}
    </Section>
  )
}

// ── Health Scripts ─────────────────────────────────────────────────────────────

function HealthScriptsSection({ data }: { data: Device360Data }) {
  const { healthScripts, errors } = data
  const failed = healthScripts?.filter((s) => s.detectionState === 'scriptFailed' || s.remediationState === 'remediationFailed').length ?? 0

  return (
    <Section title="Health Scripts" badge={healthScripts?.length} defaultExpanded={failed > 0}>
      <SectionError sectionKey={`healthScripts:${data.device?.id}`} errors={errors} />
      {!healthScripts || healthScripts.length === 0 ? (
        <EmptyState message="No health script states" />
      ) : (
        <div css={css`display: flex; flex-direction: column; gap: 6px;`}>
          {healthScripts.map((s, i) => <HealthScriptRow key={i} script={s} />)}
        </div>
      )}
    </Section>
  )
}

function HealthScriptRow({ script }: { script: DeviceHealthScriptState }) {
  const [expanded, setExpanded] = useState(false)
  const hasOutput = script.preRemediationDetectionScriptOutput || script.remediationScriptError || script.errorDescription

  return (
    <div css={css`border: 1px solid var(--is-border); border-radius: 3px; overflow: hidden;`}>
      <div
        css={css`
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 5px 8px;
          background: var(--is-bg-section);
          gap: 8px;
        `}
      >
        <span css={css`font-size: 11px; color: var(--is-text-3); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`}>
          {script.policyName ?? script.policyId ?? '—'}
        </span>
        <div css={css`display: flex; gap: 4px; flex-shrink: 0;`}>
          <StatusBadge status={script.detectionState} />
          {script.remediationState && <StatusBadge status={script.remediationState} />}
        </div>
        {hasOutput && (
          <button
            onClick={() => setExpanded((e) => !e)}
            css={css`background: none; border: none; color: var(--is-accent); font-size: 10px; cursor: pointer; padding: 0; flex-shrink: 0;`}
          >
            {expanded ? 'Hide' : 'Output'}
          </button>
        )}
      </div>
      {expanded && hasOutput && (
        <pre
          css={css`
            margin: 0;
            padding: 6px 8px;
            background: var(--is-bg-code);
            font-size: 10px;
            color: var(--is-text-muted);
            white-space: pre-wrap;
            word-break: break-all;
            max-height: 180px;
            overflow-y: auto;
            border-top: 1px solid var(--is-border);
          `}
        >
          {script.preRemediationDetectionScriptOutput}
          {script.remediationScriptError}
          {script.errorDescription}
        </pre>
      )}
      {script.lastStateUpdateDateTime && (
        <div css={css`padding: 2px 8px 4px; font-size: 10px; color: var(--is-text-faintest);`}>
          Last run {fmtDate(script.lastStateUpdateDateTime)}
        </div>
      )}
    </div>
  )
}

// ── Defender ───────────────────────────────────────────────────────────────────

function DefenderSection({ data }: { data: Device360Data }) {
  const { defender, errors } = data
  const rtpDisabled = defender?.realTimeProtectionEnabled === false

  return (
    <Section title="Defender" defaultExpanded={rtpDisabled}>
      <SectionError sectionKey={`defender:${data.device?.id}`} errors={errors} />
      {!defender ? (
        <EmptyState message="No Defender state data" />
      ) : (
        <>
          <KV label="Real-time Protection" value={<BoolBadge value={defender.realTimeProtectionEnabled} trueLabel="Enabled" falseLabel="DISABLED" />} />
          <KV label="Tamper Protection" value={<BoolBadge value={defender.tamperProtectionEnabled} trueLabel="Enabled" falseLabel="Off" />} />
          <KV label="Network Inspection" value={<BoolBadge value={defender.networkInspectionSystemEnabled} trueLabel="Enabled" falseLabel="Off" />} />
          {defender.deviceState && <KV label="Device State" value={<StatusBadge status={defender.deviceState} />} />}
          {defender.productStatus && <KV label="Product Status" value={defender.productStatus} />}
          {defender.signatureVersion && <KV label="Signature Ver." value={defender.signatureVersion} mono />}
          {defender.engineVersion && <KV label="Engine Ver." value={defender.engineVersion} mono />}
          {defender.antiMalwareVersion && <KV label="AM Version" value={defender.antiMalwareVersion} mono />}
          <KV label="Sig. Overdue" value={<BoolBadge value={defender.signatureUpdateOverdue} falseLabel="No" trueLabel="YES" />} />
          <KV label="Reboot Required" value={<BoolBadge value={defender.rebootRequired} falseLabel="No" trueLabel="YES" />} />
          {defender.lastFullScanDateTime && <KV label="Last Full Scan" value={fmtDate(defender.lastFullScanDateTime)} />}
          {defender.lastQuickScanDateTime && <KV label="Last Quick Scan" value={fmtDate(defender.lastQuickScanDateTime)} />}
        </>
      )}
    </Section>
  )
}

// ── Disk Encryption ────────────────────────────────────────────────────────────

function EncryptionSection({ data }: { data: Device360Data }) {
  const { encryption, errors } = data
  const notEncrypted = encryption?.encryptionState === 'notEncrypted'

  return (
    <Section title="Disk Encryption" defaultExpanded={notEncrypted}>
      <SectionError sectionKey={`encryption:${data.device?.id}`} errors={errors} />
      {!encryption ? (
        <EmptyState message="No encryption state data" />
      ) : (
        <>
          <KV label="State" value={<StatusBadge status={encryption.encryptionState} />} />
          <KV label="Readiness" value={<StatusBadge status={encryption.encryptionReadinessState} />} />
          {encryption.advancedBitLockerStates && <KV label="BitLocker States" value={encryption.advancedBitLockerStates} />}
          {encryption.policyDetails && encryption.policyDetails.length > 0 && (
            <div css={css`margin-top: 6px;`}>
              <div css={css`font-size: 10px; color: var(--is-text-faint); margin-bottom: 4px;`}>Policy details</div>
              {encryption.policyDetails.map((p, i) => (
                <div key={i} css={css`font-size: 11px; color: var(--is-text-muted); padding: 2px 0;`}>
                  {p.policyName}: {p.policyIncompleteReason}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Section>
  )
}

// ── Azure AD & Groups ──────────────────────────────────────────────────────────

function AzureADSection({ data }: { data: Device360Data }) {
  const { aadDevice, aadGroups, errors } = data
  const [showAllGroups, setShowAllGroups] = useState(false)
  const GROUPS_PREVIEW = 8
  const visibleGroups = showAllGroups ? aadGroups : aadGroups?.slice(0, GROUPS_PREVIEW)

  return (
    <Section title="Azure AD & Groups" badge={aadGroups?.length} defaultExpanded={false}>
      <SectionError sectionKey={`aadDevice:${data.device?.azureADDeviceId}`} errors={errors} />
      {!aadDevice ? (
        <EmptyState message="Azure AD device record unavailable" />
      ) : (
        <>
          <KV label="Display Name" value={aadDevice.displayName} />
          <KV label="Trust Type" value={aadDevice.trustType} />
          <KV label="Account" value={<BoolBadge value={aadDevice.accountEnabled} trueLabel="Enabled" falseLabel="Disabled" />} />
          {aadDevice.approximateLastSignInDateTime && <KV label="Last Sign-in" value={fmtDate(aadDevice.approximateLastSignInDateTime)} />}
          {aadDevice.registrationDateTime && <KV label="Registered" value={fmtDate(aadDevice.registrationDateTime)} />}
          {aadDevice.registeredOwners && aadDevice.registeredOwners.length > 0 && (
            <KV
              label="Owners"
              value={aadDevice.registeredOwners.map((o) => o.displayName ?? o.userPrincipalName).filter(Boolean).join(', ')}
            />
          )}
        </>
      )}

      {aadGroups !== null && (
        <div css={css`margin-top: 10px;`}>
          <SectionHeader label="Group Memberships" badge={aadGroups.length} />
          {aadGroups.length === 0 ? (
            <EmptyState message="No group memberships" />
          ) : (
            <>
              {visibleGroups?.map((g) => <GroupRow key={g.id} group={g} />)}
              {!showAllGroups && aadGroups.length > GROUPS_PREVIEW && (
                <button
                  onClick={() => setShowAllGroups(true)}
                  css={css`background: none; border: none; color: var(--is-accent); font-size: 11px; cursor: pointer; padding: 4px 0; &:hover { text-decoration: underline; }`}
                >
                  Show {aadGroups.length - GROUPS_PREVIEW} more…
                </button>
              )}
            </>
          )}
        </div>
      )}
    </Section>
  )
}

function GroupRow({ group }: { group: Group }) {
  const isDynamic = group.membershipRuleProcessingState === 'On'
  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 3px 0;
        border-bottom: 1px solid var(--is-border-subtle);
        font-size: 11px;
        color: var(--is-text-3);
        &:last-child { border-bottom: none; }
      `}
    >
      <span css={css`flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`}>
        {group.displayName ?? group.id}
      </span>
      {isDynamic && <span css={css`color: var(--is-text-faint); font-size: 10px; flex-shrink: 0;`}>dynamic</span>}
    </div>
  )
}

// ── Autopilot ──────────────────────────────────────────────────────────────────

function AutopilotSection({ data }: { data: Device360Data }) {
  const { autopilot, errors } = data

  return (
    <Section title="Autopilot" defaultExpanded={false}>
      <SectionError sectionKey={`autopilot:${data.device?.azureADDeviceId}`} errors={errors} />
      {!autopilot ? (
        <EmptyState message="Device not registered in Windows Autopilot" />
      ) : (
        <>
          {autopilot.deploymentProfile && <KV label="Profile" value={autopilot.deploymentProfile.displayName} />}
          <KV label="Assign Status" value={<StatusBadge status={autopilot.deploymentProfileAssignmentStatus} />} />
          {autopilot.deploymentProfileAssignedDateTime && <KV label="Assigned" value={fmtDate(autopilot.deploymentProfileAssignedDateTime)} />}
          {autopilot.groupTag && <KV label="Group Tag" value={autopilot.groupTag} mono />}
          {autopilot.enrollmentState && <KV label="Enroll State" value={<StatusBadge status={autopilot.enrollmentState} />} />}
          {autopilot.lastContactedDateTime && <KV label="Last Contacted" value={fmtDate(autopilot.lastContactedDateTime)} />}
          {autopilot.userPrincipalName && <KV label="Assigned User" value={autopilot.userPrincipalName} />}
        </>
      )}
    </Section>
  )
}

// ── BitLocker Recovery Keys ────────────────────────────────────────────────────

function BitLockerSection({ data }: { data: Device360Data }) {
  const { bitlockerKeys, errors } = data
  const errorKey = `bitlocker:${data.device?.azureADDeviceId}`
  const errorVal = errors[errorKey]
  const noToken = errorVal === 'no-token'
  const fetchError = errorVal && !noToken ? errorVal : null

  return (
    <Section title="BitLocker Keys" badge={bitlockerKeys?.length} defaultExpanded={false}>
      {noToken ? (
        <div css={css`color: var(--is-text-faint); font-size: 11px; padding: 4px 0; line-height: 1.5;`}>
          Visit{' '}
          <a
            href="https://intune.microsoft.com/#view/Microsoft_Intune_DeviceSettings/DevicesMenu/~/recoveryKeys"
            target="_blank"
            rel="noreferrer"
            css={css`color: var(--is-accent); text-decoration: none; &:hover { text-decoration: underline; }`}
          >
            Recovery keys
          </a>
          {' '}in the portal once to enable this data.
        </div>
      ) : fetchError ? (
        <SectionError sectionKey={errorKey} errors={errors} />
      ) : !bitlockerKeys || bitlockerKeys.length === 0 ? (
        <EmptyState message="No BitLocker recovery keys found" />
      ) : (
        <div css={css`display: flex; flex-direction: column; gap: 6px;`}>
          {bitlockerKeys.map((k) => <BitLockerKeyRow key={k.id} recoveryKey={k} />)}
        </div>
      )}
    </Section>
  )
}

function BitLockerKeyRow({ recoveryKey }: { recoveryKey: BitLockerRecoveryKey }) {
  const [revealState, setRevealState] = useState<'idle' | 'loading' | 'revealed' | 'error'>('idle')
  const [key, setKey] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function reveal() {
    setRevealState('loading')
    chrome.runtime.sendMessage(
      { type: 'FETCH_BITLOCKER_KEY', keyId: recoveryKey.id },
      (res: { success: boolean; key?: string | null; error?: string }) => {
        if (chrome.runtime.lastError || !res?.success) {
          setErrorMsg(
            res?.error === 'auth-error'
              ? 'Permission denied — BitLockerKey.Read.All scope required'
              : (res?.error ?? 'Failed to retrieve key')
          )
          setRevealState('error')
          return
        }
        setKey(res.key ?? null)
        setRevealState('revealed')
      }
    )
  }

  function copy() {
    if (!key) return
    navigator.clipboard.writeText(key).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div css={css`border: 1px solid var(--is-border); border-radius: 3px; padding: 6px 8px;`}>
      <div css={css`display: flex; justify-content: space-between; align-items: center;`}>
        <span css={css`font-size: 10px; color: var(--is-text-faint); font-family: monospace;`}>
          {recoveryKey.id.slice(0, 8)}…
        </span>
        {recoveryKey.volumeType && <span css={css`font-size: 10px; color: var(--is-text-muted);`}>{recoveryKey.volumeType}</span>}
      </div>
      {recoveryKey.createdDateTime && (
        <div css={css`font-size: 10px; color: var(--is-text-faintest); margin-top: 2px;`}>
          Created {fmtDate(recoveryKey.createdDateTime)}
        </div>
      )}
      <div css={css`margin-top: 6px;`}>
        {revealState === 'idle' && (
          <button
            onClick={reveal}
            css={css`
              background: none; border: 1px solid var(--is-border); border-radius: 3px;
              color: var(--is-accent); font-size: 10px; cursor: pointer; padding: 2px 8px;
              &:hover { background: var(--is-bg-raised); }
            `}
          >
            Reveal key
          </button>
        )}
        {revealState === 'loading' && (
          <span css={css`font-size: 10px; color: var(--is-text-faint);`}>Loading…</span>
        )}
        {revealState === 'error' && (
          <span css={css`font-size: 10px; color: #f44336;`}>{errorMsg}</span>
        )}
        {revealState === 'revealed' && (
          <div css={css`display: flex; align-items: center; gap: 6px; flex-wrap: wrap;`}>
            <span css={css`font-family: monospace; font-size: 11px; color: var(--is-text); letter-spacing: 0.5px; word-break: break-all;`}>
              {key ?? '—'}
            </span>
            <div css={css`display: flex; gap: 4px; flex-shrink: 0;`}>
              {key && (
                <button
                  onClick={copy}
                  css={css`
                    background: none; border: 1px solid var(--is-border); border-radius: 3px;
                    color: ${copied ? '#4caf50' : 'var(--is-accent)'}; font-size: 10px;
                    cursor: pointer; padding: 2px 6px;
                    &:hover { background: var(--is-bg-raised); }
                  `}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
              <button
                onClick={() => { setRevealState('idle'); setKey(null) }}
                css={css`
                  background: none; border: 1px solid var(--is-border); border-radius: 3px;
                  color: var(--is-text-faint); font-size: 10px; cursor: pointer; padding: 2px 6px;
                  &:hover { background: var(--is-bg-raised); }
                `}
              >
                Hide
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── LAPS ───────────────────────────────────────────────────────────────────────

interface LapsCredential { accountName?: string; passwordBase64?: string; backupDateTime?: string }

function LAPSSection({ data }: { data: Device360Data }) {
  const { laps, errors, device } = data

  const lapsErrorKey = `laps:${device?.id}`
  const lapsErrorVal = errors[lapsErrorKey]
  const lapsNoToken = lapsErrorVal === 'no-token' || lapsErrorVal?.startsWith('auth:')
  const lapsFetchError = lapsErrorVal && !lapsNoToken ? lapsErrorVal : null

  return (
    <Section title="LAPS" defaultExpanded={false}>
      {lapsNoToken ? (
        <div css={css`color: var(--is-text-faint); font-size: 11px; padding: 4px 0; line-height: 1.5;`}>
          Visit the{' '}
          <a
            href="https://intune.microsoft.com/#view/Microsoft_Intune_DeviceSettings/DevicesMenu/~/localAdminPasswords"
            target="_blank"
            rel="noreferrer"
            css={css`color: var(--is-accent); text-decoration: none; &:hover { text-decoration: underline; }`}
          >
            Local admin passwords
          </a>
          {' '}section once to enable this data.
        </div>
      ) : lapsFetchError ? (
        <SectionError sectionKey={lapsErrorKey} errors={errors} />
      ) : !laps ? (
        <EmptyState message="LAPS not configured on this device" />
      ) : (
        <>
          {laps.lastBackupDateTime && <KV label="Last Backup" value={fmtDate(laps.lastBackupDateTime)} />}
          {laps.refreshDateTime && <KV label="Rotates" value={fmtDate(laps.refreshDateTime)} />}
          <div css={css`margin-top: 8px; display: flex; flex-direction: column; gap: 6px;`}>
            <LapsCredentialRow aadDeviceId={device?.azureADDeviceId} />
          </div>
        </>
      )}
    </Section>
  )
}

function LapsCredentialRow({ aadDeviceId }: { aadDeviceId: string | undefined }) {
  const [revealState, setRevealState] = useState<'idle' | 'loading' | 'revealed' | 'error'>('idle')
  const [credentials, setCredentials] = useState<LapsCredential[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function reveal() {
    if (!aadDeviceId) {
      setErrorMsg('Azure AD device object ID unavailable')
      setRevealState('error')
      return
    }
    setRevealState('loading')
    chrome.runtime.sendMessage(
      { type: 'FETCH_LAPS_PASSWORD', aadDeviceId },
      (res: { success: boolean; credentials?: LapsCredential[]; error?: string }) => {
        if (chrome.runtime.lastError || !res?.success) {
          setErrorMsg(
            res?.error === 'auth-error' || res?.error === 'no-token'
              ? 'DeviceLocalCredential.Read.All required — visit the LAPS section in the Intune portal once'
              : (res?.error ?? 'Failed to retrieve password')
          )
          setRevealState('error')
          return
        }
        setCredentials(res.credentials ?? [])
        setRevealState('revealed')
      }
    )
  }

  if (revealState === 'idle') {
    return (
      <button
        onClick={reveal}
        css={css`
          background: none; border: 1px solid var(--is-border); border-radius: 3px;
          color: var(--is-accent); font-size: 10px; cursor: pointer; padding: 2px 8px;
          &:hover { background: var(--is-bg-raised); }
        `}
      >
        Reveal password
      </button>
    )
  }

  if (revealState === 'loading') {
    return <span css={css`font-size: 10px; color: var(--is-text-faint);`}>Loading…</span>
  }

  if (revealState === 'error') {
    return <span css={css`font-size: 10px; color: #f44336;`}>{errorMsg}</span>
  }

  if (credentials.length === 0) {
    return <EmptyState message="No credentials returned" />
  }

  return (
    <>
      {credentials.map((cred, i) => (
        <LapsCredentialRevealRow key={i} cred={cred} onHide={() => setRevealState('idle')} />
      ))}
    </>
  )
}

function LapsCredentialRevealRow({ cred, onHide }: { cred: LapsCredential; onHide: () => void }) {
  const [copied, setCopied] = useState(false)
  const password = cred.passwordBase64 ? atob(cred.passwordBase64) : null

  function copy() {
    if (!password) return
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div css={css`border: 1px solid var(--is-border); border-radius: 3px; padding: 6px 8px;`}>
      {cred.accountName && (
        <div css={css`font-size: 10px; color: var(--is-text-faint); margin-bottom: 4px; font-family: monospace;`}>
          {cred.accountName}
        </div>
      )}
      <div css={css`display: flex; align-items: center; gap: 6px; flex-wrap: wrap;`}>
        <span css={css`font-family: monospace; font-size: 11px; color: var(--is-text); letter-spacing: 0.5px; word-break: break-all;`}>
          {password ?? '—'}
        </span>
        <div css={css`display: flex; gap: 4px; flex-shrink: 0;`}>
          {password && (
            <button
              onClick={copy}
              css={css`
                background: none; border: 1px solid var(--is-border); border-radius: 3px;
                color: ${copied ? '#4caf50' : 'var(--is-accent)'}; font-size: 10px;
                cursor: pointer; padding: 2px 6px;
                &:hover { background: var(--is-bg-raised); }
              `}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
          <button
            onClick={onHide}
            css={css`
              background: none; border: 1px solid var(--is-border); border-radius: 3px;
              color: var(--is-text-faint); font-size: 10px; cursor: pointer; padding: 2px 6px;
              &:hover { background: var(--is-bg-raised); }
            `}
          >
            Hide
          </button>
        </div>
      </div>
      {cred.backupDateTime && (
        <div css={css`font-size: 10px; color: var(--is-text-faintest); margin-top: 3px;`}>
          Backed up {fmtDate(cred.backupDateTime)}
        </div>
      )}
    </div>
  )
}

// ── Audit Log ──────────────────────────────────────────────────────────────────

function AuditLogSection({ data }: { data: Device360Data }) {
  const { auditEvents, errors } = data

  return (
    <Section title="Audit Log" badge={auditEvents?.length} defaultExpanded={false}>
      <SectionError sectionKey={`auditEvents:${data.device?.id}`} errors={errors} />
      {!auditEvents || auditEvents.length === 0 ? (
        <EmptyState message="No audit events found" />
      ) : (
        <div css={css`display: flex; flex-direction: column; gap: 4px;`}>
          {auditEvents.map((e, i) => <AuditEventRow key={e.id ?? i} event={e} />)}
        </div>
      )}
    </Section>
  )
}

function AuditEventRow({ event }: { event: DeviceAuditEvent }) {
  const actor =
    event.actor?.userPrincipalName ??
    event.actor?.applicationDisplayName ??
    event.actor?.servicePrincipalName ??
    'Unknown'
  const resultColor = event.activityResult === 'success' ? '#4caf50' : event.activityResult === 'failure' ? '#f44336' : 'var(--is-text-muted)'

  return (
    <div css={css`padding: 5px 0; border-bottom: 1px solid var(--is-border-subtle); &:last-child { border-bottom: none; }`}>
      <div css={css`display: flex; align-items: center; gap: 6px; justify-content: space-between;`}>
        <span css={css`font-size: 11px; color: var(--is-text-3);`}>
          {event.activity ?? event.displayName ?? '—'}
        </span>
        {event.activityResult && (
          <span css={css`font-size: 10px; color: ${resultColor}; flex-shrink: 0;`}>
            {event.activityResult}
          </span>
        )}
      </div>
      <div css={css`font-size: 10px; color: var(--is-text-faint); margin-top: 1px;`}>
        {actor} · {fmtDate(event.activityDateTime)}
      </div>
    </div>
  )
}

// ── Detected Apps ──────────────────────────────────────────────────────────────

function DetectedAppsSection({ data }: { data: Device360Data }) {
  const { detectedApps, errors } = data
  const [showAll, setShowAll] = useState(false)
  const [search, setSearch] = useState('')
  const PREVIEW = 10

  const filtered = detectedApps?.filter((a) =>
    !search || a.displayName?.toLowerCase().includes(search.toLowerCase())
  ) ?? []
  const visible = showAll ? filtered : filtered.slice(0, PREVIEW)

  return (
    <Section title="Detected Apps" badge={detectedApps?.length} defaultExpanded={false}>
      <SectionError sectionKey={`detectedApps:${data.device?.id}`} errors={errors} />
      {!detectedApps || detectedApps.length === 0 ? (
        <EmptyState message="No detected apps" />
      ) : (
        <>
          {detectedApps.length > PREVIEW && (
            <input
              type="text"
              placeholder="Filter apps…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              css={css`
                width: 100%;
                background: var(--is-input-bg);
                border: 1px solid var(--is-input-border);
                border-radius: 3px;
                padding: 4px 8px;
                color: var(--is-text);
                font-size: 11px;
                margin-bottom: 8px;
                box-sizing: border-box;
                outline: none;
                &:focus { border-color: var(--is-accent); }
              `}
            />
          )}
          <table css={css`width: 100%; border-collapse: collapse; font-size: 11px;`}>
            <tbody>
              {visible.map((app: DetectedApp, i: number) => (
                <tr key={i} css={css`&:not(:last-child) td { border-bottom: 1px solid var(--is-border-subtle); }`}>
                  <td css={css`padding: 3px 0; color: var(--is-text-3); padding-right: 8px;`}>{app.displayName ?? '—'}</td>
                  <td css={css`padding: 3px 0; color: var(--is-text-faint); text-align: right; white-space: nowrap;`}>{app.version ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!showAll && filtered.length > PREVIEW && (
            <button
              onClick={() => setShowAll(true)}
              css={css`background: none; border: none; color: var(--is-accent); font-size: 11px; cursor: pointer; padding: 4px 0; margin-top: 4px; &:hover { text-decoration: underline; }`}
            >
              Show {filtered.length - PREVIEW} more…
            </button>
          )}
        </>
      )}
    </Section>
  )
}

// ── Windows Update & Autopatch ────────────────────────────────────────────────

function WindowsUpdateSection({ data }: { data: Device360Data }) {
  const {
    wuQualityStatus, wuFeatureStatus,
    autopatchQualityDetail, autopatchServiceDevice,
    autopatchDeviceStatus, autopatchAlertGroups,
    errors,
  } = data
  const deviceId = data.device?.id ?? ''
  const [showRaw, setShowRaw] = useState(false)

  const alertGroupMap = new Map((autopatchAlertGroups ?? []).map((g) => [g.alertGroupName, g]))
  const deviceAlertNames = (
    autopatchDeviceStatus?.alertNames?.filter(Boolean) ??
    autopatchQualityDetail?.AlertNames?.filter(Boolean) ??
    []
  )
  const enrichedAlerts: AutopatchAlertGroup[] = deviceAlertNames.map(
    (name) => alertGroupMap.get(name) ?? { alertGroupName: name }
  )
  const alertCount = enrichedAlerts.length

  const apErrorKey = `autopatchService:${deviceId}`
  const apErrorVal = errors[apErrorKey]
  const noToken = apErrorVal === 'no-token'
  const fetchError = apErrorVal && !noToken ? apErrorVal : null

  const wufbStatuses = [
    ...(wuQualityStatus ?? []).map((r) => r.PolicyStatus ?? ''),
    ...(wuFeatureStatus ?? []).map((r) => r.PolicyStatus ?? ''),
  ]
  const hasWufB = wufbStatuses.length > 0

  const rawEntries = autopatchServiceDevice
    ? Object.entries(autopatchServiceDevice).filter(
        ([k, v]) => !AUTOPATCH_SKIP_FIELDS.has(k) && !AUTOPATCH_FIELD_LABELS[k] && v != null && v !== ''
      )
    : []

  const quError = errors[`wuQuality:${deviceId}`]
  const fuError = errors[`wuFeature:${deviceId}`]

  return (
    <Section
      title="Windows Update"
      alertBadge={alertCount || undefined}
      defaultExpanded={!!fetchError || alertCount > 0}
    >
      {quError && <SectionError sectionKey={`wuQuality:${deviceId}`} errors={errors} />}
      {fuError && <SectionError sectionKey={`wuFeature:${deviceId}`} errors={errors} />}

      {enrichedAlerts.length > 0 && (
        <div
          css={css`
            margin-bottom: 10px;
            padding: 7px 10px;
            background: #ff980011;
            border: 1px solid #ff980033;
            border-radius: 4px;
          `}
        >
          <div
            css={css`
              font-size: 10px; font-weight: 600; text-transform: uppercase;
              letter-spacing: 0.5px; color: #ff9800; margin-bottom: 5px;
            `}
          >
            Active Alerts
          </div>
          <div css={css`display: flex; flex-direction: column; gap: 4px;`}>
            {enrichedAlerts.map((alert, i) => (
              <AutopatchAlertRow key={alert.alertGroupName ?? i} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {noToken ? (
        <div css={css`color: var(--is-text-faint); font-size: 11px; padding: 4px 0; line-height: 1.5;`}>
          Visit the{' '}
          <a
            href="https://intune.microsoft.com/#view/Microsoft_Intune_DeviceSettings/DevicesMenu/~/windowsAutopatch"
            target="_blank"
            rel="noreferrer"
            css={css`color: var(--is-accent); text-decoration: none; &:hover { text-decoration: underline; }`}
          >
            Windows Autopatch
          </a>
          {' '}section once to enable this data.
        </div>
      ) : fetchError ? (
        <SectionError sectionKey={apErrorKey} errors={errors} />
      ) : autopatchServiceDevice ? (
        <>
          <div css={subLabelCss}>Autopatch</div>
          {Object.entries(AUTOPATCH_FIELD_LABELS).map(([key, label]) => {
            const val = autopatchServiceDevice[key]
            if (val == null || val === '') return null
            const strVal = String(val)
            const isDate = key === 'lastCheckIn' || key === 'enrollmentDate'
            return (
              <KV
                key={key}
                label={label}
                value={isDate ? fmtDate(strVal) : <StatusBadge status={strVal} />}
              />
            )
          })}

          {autopatchQualityDetail && (
            <>
              <div css={subLabelCss}>Quality Update Details</div>
              {autopatchQualityDetail.qualityUpdatePolicyName && (
                <KV label="QU Policy" value={autopatchQualityDetail.qualityUpdatePolicyName} />
              )}
              {(() => {
                const s = autopatchState(autopatchQualityDetail.quServiceState, autopatchQualityDetail.quServiceSubstate)
                return s ? <KV label="QU Service State" value={<StatusBadge status={s} />} /> : null
              })()}
              {(() => {
                const s = autopatchState(autopatchQualityDetail.quClientState, autopatchQualityDetail.quClientSubstate)
                return s ? <KV label="QU Client State" value={<StatusBadge status={s} />} /> : null
              })()}
              {autopatchQualityDetail.hotpatchStatus && (
                <KV label="Hotpatch" value={<StatusBadge status={autopatchQualityDetail.hotpatchStatus} />} />
              )}
              {autopatchQualityDetail.hotpatchReadiness && (
                <KV label="Hotpatch Readiness" value={<StatusBadge status={autopatchQualityDetail.hotpatchReadiness} />} />
              )}
              {autopatchQualityDetail.quUpdateInstalledTime && (
                <KV label="QU Installed" value={fmtDate(autopatchQualityDetail.quUpdateInstalledTime)} />
              )}
            </>
          )}

          {rawEntries.length > 0 && (
            <div css={css`margin-top: 6px;`}>
              <button
                onClick={() => setShowRaw((s) => !s)}
                css={css`
                  background: none; border: none; color: var(--is-accent);
                  font-size: 10px; cursor: pointer; padding: 2px 0;
                  &:hover { text-decoration: underline; }
                `}
              >
                {showRaw ? 'Hide' : 'Show'} {rawEntries.length} additional field{rawEntries.length !== 1 ? 's' : ''}
              </button>
              {showRaw && rawEntries.map(([k, v]) => (
                <KV key={k} label={k} value={String(v)} mono />
              ))}
            </div>
          )}
        </>
      ) : null}

      {hasWufB && (
        <>
          {wufbStatuses.length > 0 && <PolicyStatusBar statuses={wufbStatuses} />}
          <div css={subLabelCss}>Update Rings</div>
          {wuQualityStatus && wuQualityStatus.length > 0 && <WUPolicyTable rows={wuQualityStatus} showVersion />}
          {wuFeatureStatus && wuFeatureStatus.length > 0 && <WUPolicyTable rows={wuFeatureStatus} showVersion />}
        </>
      )}

      {!hasWufB && !autopatchServiceDevice && !noToken && !fetchError && enrichedAlerts.length === 0 && (
        <EmptyState message="No Windows Update policies found" />
      )}
    </Section>
  )
}

function WUPolicyTable({ rows, showVersion = false }: { rows: Record<string, string>[]; showVersion?: boolean }) {
  return (
    <table css={css`width: 100%; border-collapse: collapse; font-size: 11px;`}>
      <tbody>
        {rows.map((row, i) => (
          <WUPolicyRow key={i} row={row} showVersion={showVersion} isLast={i === rows.length - 1} />
        ))}
      </tbody>
    </table>
  )
}

function WUPolicyRow({ row, showVersion, isLast }: { row: Record<string, string>; showVersion: boolean; isLast: boolean }) {
  const alert = row.AlertMessage
  const hasAlert = alert && alert.toLowerCase() !== 'none' && alert !== ''

  return (
    <>
      <tr css={css`${!isLast || hasAlert ? 'td { border-bottom: 1px solid var(--is-border-subtle); }' : ''}`}>
        <td css={css`padding: 4px 0; padding-right: 8px;`}>
          <div css={css`color: var(--is-text-3);`}>{row.PolicyName || '—'}</div>
          {showVersion && row.FeatureUpdateVersion && (
            <div css={css`color: var(--is-text-faint); font-size: 10px; margin-top: 1px;`}>
              Target: {row.FeatureUpdateVersion}
            </div>
          )}
        </td>
        <td css={css`padding: 4px 0; text-align: right; white-space: nowrap;`}>
          <StatusBadge status={row.PolicyStatus} />
        </td>
      </tr>
      {hasAlert && (
        <tr>
          <td
            colSpan={2}
            css={css`
              padding: 3px 0 6px;
              ${!isLast ? 'border-bottom: 1px solid var(--is-border-subtle);' : ''}
            `}
          >
            <div
              css={css`
                font-size: 10px;
                color: var(--is-text-muted);
                background: var(--is-bg-raised);
                border-left: 2px solid ${statusColor(row.PolicyStatus)};
                padding: 3px 7px;
                border-radius: 0 3px 3px 0;
              `}
            >
              {alert}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Windows Autopatch helpers ─────────────────────────────────────────────────

function AutopatchAlertRow({ alert }: { alert: AutopatchAlertGroup }) {
  let updateTypes: string[] = []
  try {
    updateTypes = alert.alertGroupAffectedUpdateTypes
      ? (JSON.parse(alert.alertGroupAffectedUpdateTypes) as string[]).filter((t) => t !== 'NA')
      : []
  } catch { /* ignore malformed JSON */ }

  return (
    <div
      css={css`
        padding: 4px 0;
        border-bottom: 1px solid #ff980022;
        &:last-child { border-bottom: none; }
      `}
    >
      <div css={css`display: flex; align-items: center; gap: 6px; justify-content: space-between;`}>
        <span css={css`font-size: 11px; color: var(--is-text-3); font-weight: 500;`}>
          {alert.alertGroupName}
        </span>
        <div css={css`display: flex; gap: 4px; flex-shrink: 0;`}>
          {updateTypes.map((t) => (
            <span
              key={t}
              css={css`font-size: 9px; color: var(--is-text-faint); background: var(--is-bg-raised); border: 1px solid var(--is-border); border-radius: 3px; padding: 0 4px;`}
            >
              {t}
            </span>
          ))}
          {alert.alertGroupSeverity && <StatusBadge status={alert.alertGroupSeverity} />}
        </div>
      </div>
      {alert.alertGroupRemediationAction && alert.alertGroupRemediationAction !== 'Customer Action' && (
        <div css={css`font-size: 10px; color: var(--is-text-faint); margin-top: 2px;`}>
          {alert.alertGroupRemediationAction}
        </div>
      )}
      {alert.alertGroupLatestDateTime && (
        <div css={css`font-size: 10px; color: var(--is-text-faintest); margin-top: 1px;`}>
          {fmtDate(alert.alertGroupLatestDateTime)}
        </div>
      )}
    </div>
  )
}

// Primary fields shown explicitly in the Autopatch section.
const AUTOPATCH_FIELD_LABELS: Record<string, string> = {
  updateStatus:      'Overall Status',
  fuUpdateStatus:    'Feature Update',
  quUpdateStatus:    'Quality Update',
  fuCurrentOSVersion: 'Current OS',
  fuTargetOSVersion: 'Target OS',
  fuosStatus:        'OS Servicing',
  readinessState:    'Readiness',
  movementStatus:    'Movement',
  autopatchGroup:    'Autopatch Group',
  deploymentGroup:   'Ring',
  lastCheckIn:       'Last Check-In',
  enrollmentDate:    'Enrolled',
  fuPauseStatus:     'Feature Pause',
  quPauseStatus:     'Quality Pause',
  pauseStatus:       'Pause Status',
}

// Fields omitted from the raw-dump toggle (duplicates or internal IDs).
const AUTOPATCH_SKIP_FIELDS = new Set([
  'name', 'serialNumber', 'aadDeviceId', 'model',
  'autopatchGroupId', 'tenantId', 'timestamp',
  'featureSet', 'windowsUpdatePolicyCount',
  'quosVersion', 'deviceReadiness', 'primaryUpdateRing',
  'startRowIndex', 'endRowIndex', 'activityId',
])

const subLabelCss = css`
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.5px; color: var(--is-text-faint);
  margin: 10px 0 4px;
`

function autopatchState(state?: string, substate?: string): string | null {
  if (!state) return null
  if (substate && substate !== state) return `${state} — ${substate}`
  return state
}

// ── Security Baselines ─────────────────────────────────────────────────────────

function SecurityBaselinesSection({ data }: { data: Device360Data }) {
  const { securityBaselines, errors } = data
  const notSecure = securityBaselines?.filter((b) => b.state === 'notSecure').length ?? 0

  return (
    <Section title="Security Baselines" badge={securityBaselines?.length} defaultExpanded={notSecure > 0}>
      <SectionError sectionKey={`securityBaselines:${data.device?.id}`} errors={errors} />
      {!securityBaselines || securityBaselines.length === 0 ? (
        <EmptyState message="No security baseline states" />
      ) : (
        <div css={css`display: flex; flex-direction: column; gap: 4px;`}>
          {securityBaselines.map((b, i) => (
            <div
              key={b.id ?? i}
              css={css`
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 4px 0;
                border-bottom: 1px solid var(--is-border-subtle);
                font-size: 11px;
                &:last-child { border-bottom: none; }
              `}
            >
              <span css={css`color: var(--is-text-3);`}>{b.displayName ?? b.securityBaselineTemplateId ?? '—'}</span>
              <StatusBadge status={b.state} />
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

export { SectionHeader }
