import type { SectionConfig, SectionId } from './types'

export const SHADOW_HOST_ID = 'intune-spector-root'
export const CACHE_TTL_MS = 90_000
export const TOKEN_STALE_MS = 50 * 60 * 1000  // 50 min (access tokens are ~1hr)

export const DEFAULT_PANEL_SETTINGS = {
  dockPosition: 'side' as const,
  width: 420,
  height: 380,
  isVisible: true,
  preferBeta: true,
  theme: 'auto' as const,
}

export const GRAPH_VERSION = {
  BETA: '/beta',
  V1: '/v1.0',
} as const

export const SECTION_LABELS: Record<SectionId, string> = {
  identity: 'Identity & Hardware',
  compliance: 'Compliance',
  configProfiles: 'Config Profiles',
  windowsUpdate: 'Windows Update & Autopatch',
  endpointAnalytics: 'Endpoint Analytics',
  healthScripts: 'Health Scripts',
  defender: 'Defender',
  encryption: 'Disk Encryption',
  aad: 'Azure AD & Groups',
  autopilot: 'Autopilot',
  bitlocker: 'BitLocker Keys',
  laps: 'LAPS',
  auditLog: 'Audit Log',
  detectedApps: 'Detected Apps',
  securityBaselines: 'Security Baselines',
}

export const DEFAULT_SECTION_LAYOUT: SectionConfig[] = [
  { id: 'identity', visible: true },
  { id: 'compliance', visible: true },
  { id: 'configProfiles', visible: true },
  { id: 'windowsUpdate', visible: true },
  { id: 'endpointAnalytics', visible: true },
  { id: 'healthScripts', visible: true },
  { id: 'defender', visible: true },
  { id: 'encryption', visible: true },
  { id: 'aad', visible: true },
  { id: 'autopilot', visible: true },
  { id: 'bitlocker', visible: true },
  { id: 'laps', visible: true },
  { id: 'auditLog', visible: true },
  { id: 'detectedApps', visible: true },
  { id: 'securityBaselines', visible: true },
]
