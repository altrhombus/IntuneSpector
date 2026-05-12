import type {
  ManagedDevice,
  HardwareInformation,
  DeviceHealthScriptState,
  UserExperienceAnalyticsDeviceScore,
  WindowsProtectionState,
  ManagedDeviceEncryptionState,
  SecurityBaselineState,
  AzureADDevice,
  Group,
  WindowsAutopilotDeviceIdentity,
  BitLockerRecoveryKey,
  DeviceLocalCredentialInfo,
  DeviceAuditEvent,
  DetectedApp,
  RoleScopeTag,
  AutopatchServiceDevice,
  AutopatchQualityUpdateDetail,
  AutopatchFeatureUpdateDetail,
  AutopatchAlertGroup,
  AutopatchDeviceStatus,
} from './graph-types'

export type DockPosition = 'side' | 'bottom'

export type ThemePref = 'auto' | 'light' | 'dark'

export interface PanelSettings {
  dockPosition: DockPosition
  width: number
  height: number
  isVisible: boolean
  preferBeta: boolean
  theme: ThemePref
}

export interface DeviceContext {
  type: 'device'
  deviceId: string
  azureAdDeviceId?: string
}

export interface UserContext {
  type: 'user'
  userId: string
}

export interface PolicyContext {
  type: 'policy'
  policyId: string
  policyType: string
}

export type IntuneContext = DeviceContext | UserContext | PolicyContext | null

export interface Device360Data {
  device: ManagedDevice | null
  hardware: HardwareInformation | null
  compliancePolicies: Array<Record<string, string>> | null
  configProfiles: Array<Record<string, string>> | null
  healthScripts: DeviceHealthScriptState[] | null
  endpointAnalytics: UserExperienceAnalyticsDeviceScore | null
  defender: WindowsProtectionState | null
  encryption: ManagedDeviceEncryptionState | null
  securityBaselines: SecurityBaselineState[] | null
  aadDevice: AzureADDevice | null
  aadGroups: Group[] | null
  autopilot: WindowsAutopilotDeviceIdentity | null
  bitlockerKeys: BitLockerRecoveryKey[] | null
  laps: DeviceLocalCredentialInfo | null
  auditEvents: DeviceAuditEvent[] | null
  detectedApps: DetectedApp[] | null
  scopeTags: RoleScopeTag[] | null
  autopatchServiceDevice: AutopatchServiceDevice | null
  autopatchQualityDetail: AutopatchQualityUpdateDetail | null
  autopatchFeatureDetail: AutopatchFeatureUpdateDetail | null
  autopatchDeviceStatus: AutopatchDeviceStatus | null
  autopatchAlertGroups: AutopatchAlertGroup[] | null
  wuQualityStatus: Record<string, string>[] | null
  wuFeatureStatus: Record<string, string>[] | null
  errors: Record<string, string>
}

export type SectionId =
  | 'identity'
  | 'compliance'
  | 'configProfiles'
  | 'windowsUpdate'
  | 'endpointAnalytics'
  | 'healthScripts'
  | 'defender'
  | 'encryption'
  | 'aad'
  | 'autopilot'
  | 'bitlocker'
  | 'laps'
  | 'auditLog'
  | 'detectedApps'
  | 'securityBaselines'

export interface SectionConfig {
  id: SectionId
  visible: boolean
}

// Background ↔ content script message types
export type ToBackground =
  | { type: 'GET_CONTEXT' }
  | { type: 'GET_TOKEN' }
  | { type: 'CLEAR_TOKEN' }
  | { type: 'FETCH_DEVICE360'; deviceId: string; azureAdDeviceId?: string }

export type ToContent =
  | { type: 'CONTEXT_UPDATE'; context: IntuneContext }
  | { type: 'TOKEN_EXPIRED' }

export interface BackgroundResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
