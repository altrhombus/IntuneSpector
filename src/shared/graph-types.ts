// Graph API response types for IntuneSpector
// All beta-era fields relevant to Device 360 and related modules.

export interface ManagedDevice {
  id: string
  deviceName: string
  serialNumber?: string
  model?: string
  manufacturer?: string
  osVersion?: string
  operatingSystem?: string
  managementAgent?: string
  deviceEnrollmentType?: string
  enrolledDateTime?: string
  lastSyncDateTime?: string
  userDisplayName?: string
  userPrincipalName?: string
  azureADDeviceId?: string
  azureADRegistered?: boolean
  isEncrypted?: boolean
  managementState?: string
  complianceState?: string
  joinType?: string
  windowsActiveMalwareCount?: number
  partnerReportedThreatState?: string
  roleScopeTagIds?: string[]
  ethernetMacAddress?: string
  wiFiMacAddress?: string
  processorArchitecture?: string
  physicalMemoryInBytes?: number
  bootstrapTokenEscrowed?: boolean
  autopilotEnrolled?: boolean
  iccid?: string
  udid?: string
  hardwareInformation?: HardwareInformation
}

export interface HardwareInformation {
  totalStorageSpace?: number
  freeStorageSpace?: number
  physicalMemoryInBytes?: number
  tpmSpecificationVersion?: string
  tpmVersion?: string
  deviceGuardVirtualizationBasedSecurityHardwareRequirementState?: string
  deviceGuardVirtualizationBasedSecurityState?: string
  deviceGuardLocalSystemAuthorityCredentialGuardState?: string
  systemManagementBIOSVersion?: string
  operatingSystemEdition?: string
  operatingSystemLanguage?: string
  deviceFullQualifiedDomainName?: string
  wiredIPv4Addresses?: string[]
}

// Columnar format returned by POST /beta/deviceManagement/reports/* endpoints
export interface ReportResponse {
  TotalRowCount?: number
  totalRowCount?: number
  Schema?: Array<{ Column: string; PropertyType: string }>
  schema?: Array<{ column: string; propertyType: string }>
  Values?: Array<Array<string | number | boolean | null>>
  values?: Array<Array<string | number | boolean | null>>
}

export interface DeviceHealthScriptState {
  policyId?: string
  policyName?: string
  detectionState?: string
  remediationState?: string
  preRemediationDetectionScriptOutput?: string
  postRemediationDetectionScriptOutput?: string
  remediationScriptError?: string
  lastStateUpdateDateTime?: string
  errorCode?: number
  errorDescription?: string
  remediationErrorCode?: number
  remediationErrorDescription?: string
}

export interface UserExperienceAnalyticsDeviceScore {
  id?: string
  deviceName?: string
  model?: string
  manufacturer?: string
  healthStatus?: string
  endpointAnalyticsScore?: number
  startupPerformanceScore?: number
  appReliabilityScore?: number
  workFromAnywhereScore?: number
  batteryHealthScore?: number
}

export interface WindowsProtectionState {
  id?: string
  antiMalwareVersion?: string
  deviceState?: string
  engineVersion?: string
  lastFullScanDateTime?: string
  lastQuickScanDateTime?: string
  malwareProtectionEnabled?: boolean
  networkInspectionSystemEnabled?: boolean
  productStatus?: string
  realTimeProtectionEnabled?: boolean
  rebootRequired?: boolean
  signatureUpdateOverdue?: boolean
  signatureVersion?: string
  tamperProtectionEnabled?: boolean
}

export interface ManagedDeviceEncryptionState {
  id?: string
  userPrincipalName?: string
  deviceType?: string
  encryptionReadinessState?: string
  encryptionState?: string
  advancedBitLockerStates?: string
  policyDetails?: Array<{
    policyId: string
    policyName: string
    policyIncompleteReason: string
  }>
}

export interface SecurityBaselineState {
  id?: string
  displayName?: string
  securityBaselineTemplateId?: string
  state?: string
  userPrincipalName?: string
  settingStates?: Array<{
    id: string
    settingName?: string
    state?: string
  }>
}

export interface AzureADDevice {
  id: string
  deviceId?: string
  displayName?: string
  accountEnabled?: boolean
  approximateLastSignInDateTime?: string
  createdDateTime?: string
  operatingSystem?: string
  operatingSystemVersion?: string
  trustType?: string
  registrationDateTime?: string
  registeredOwners?: Array<{
    id: string
    displayName?: string
    userPrincipalName?: string
    '@odata.type'?: string
  }>
}

export interface Group {
  id: string
  displayName?: string
  groupTypes?: string[]
  securityEnabled?: boolean
  mailEnabled?: boolean
  membershipRule?: string
  membershipRuleProcessingState?: string
}

export interface WindowsAutopilotDeviceIdentity {
  id?: string
  serialNumber?: string
  manufacturer?: string
  model?: string
  deploymentProfileAssignmentStatus?: string
  deploymentProfileAssignedDateTime?: string
  azureAdDeviceId?: string
  managedDeviceId?: string
  displayName?: string
  userPrincipalName?: string
  groupTag?: string
  lastContactedDateTime?: string
  enrollmentState?: string
  deploymentProfile?: {
    id: string
    displayName?: string
    description?: string
  }
}

export interface BitLockerRecoveryKey {
  id: string
  createdDateTime?: string
  deviceId?: string
  volumeType?: string
  key?: string
}

export interface LocalCredentialInfo {
  accountName?: string
  passwordBase64?: string
  backupDateTime?: string
}

export interface DeviceLocalCredentialInfo {
  id?: string
  deviceName?: string
  refreshDateTime?: string
  lastBackupDateTime?: string
  credentials?: LocalCredentialInfo[]
}

export interface DeviceAuditEvent {
  id?: string
  displayName?: string
  componentName?: string
  activity?: string
  activityDateTime?: string
  activityOperationType?: string
  activityResult?: string
  actor?: {
    type?: string
    applicationId?: string
    applicationDisplayName?: string
    userPrincipalName?: string
    servicePrincipalName?: string
    ipAddress?: string
    userId?: string
  }
  resources?: Array<{
    displayName?: string
    type?: string
    resourceId?: string
  }>
}

export interface DetectedApp {
  id?: string
  displayName?: string
  version?: string
  sizeInByte?: number
  deviceCount?: number
}

export interface RoleScopeTag {
  id?: string
  displayName?: string
}

// Windows Autopatch proprietary service (services.autopatch.microsoft.com)
export interface AutopatchServiceDevice {
  name?: string
  serialNumber?: string
  aadDeviceId?: string
  model?: string
  autopatchGroup?: string
  autopatchGroupId?: string
  deploymentGroup?: string
  updateStatus?: string
  fuUpdateStatus?: string
  quUpdateStatus?: string
  fuCurrentOSVersion?: string
  fuTargetOSVersion?: string
  fuosStatus?: string
  quosVersion?: string
  readinessState?: string
  deviceReadiness?: string
  movementStatus?: string
  fuPauseStatus?: string
  quPauseStatus?: string
  pauseStatus?: string
  primaryUpdateRing?: string
  lastCheckIn?: string
  enrollmentDate?: string
  timestamp?: string
  windowsUpdatePolicyCount?: number
  featureSet?: number
  tenantId?: string
  [key: string]: unknown
}

export interface AutopatchServiceReport {
  values?: AutopatchServiceDevice[]
  totalRowCount?: number
  startRowIndex?: number
  endRowIndex?: number
  tenantId?: string
  activityId?: string
}

// v2 Quality Update device detail (wqu/details)
export interface AutopatchQualityUpdateDetail {
  name?: string
  aadDeviceId?: string
  serialNumber?: string
  businessGroupName?: string
  deploymentGroupName?: string
  quStatusLevel1Name?: string
  quPauseStatus?: string
  osBuild?: string
  quServiceState?: string
  quServiceSubstate?: string
  quClientState?: string
  quClientSubstate?: string
  quServiceUpdateAlert?: string
  quClientUpdateAlert?: string
  AlertNames?: string[]
  alertCount?: number
  cadenceType?: string
  quUpdateInstalledTime?: string
  hotpatchStatus?: string
  hotpatchReadiness?: string
  qualityUpdatePolicyName?: string
  osServicingChannel?: string
  lastIntuneSyncDateTimeUtc?: string
  [key: string]: unknown
}

// v2 Feature Update device detail (windowsFeatureUpdates/details)
export interface AutopatchFeatureUpdateDetail {
  name?: string
  aadDeviceId?: string
  serialNumber?: string
  osVersion?: string
  targetOSVersion?: string
  osStatus?: string
  fuStatusLevel1Name?: string
  fuPauseStatus?: string
  fuServiceState?: string
  fuServiceSubstate?: string
  fuClientState?: string
  fuClientSubstate?: string
  releaseName?: string
  phaseName?: string
  fuServiceUpdateAlert?: string
  fuClientUpdateAlert?: string
  AlertNames?: string[]
  alertCount?: number
  cadenceType?: string
  fuUpdateInstalledTime?: string
  osServicingChannel?: string
  lastIntuneSyncDateTimeUtc?: string
  [key: string]: unknown
}

export interface AutopatchV2Report<T> {
  values?: T[]
  totalRowCount?: number
}

// Per-device record from GET /unified-reporting/odata/1.0/AutopatchManagementStatusDetails
// (filter by deviceName — has ALL alert types including policy alerts)
export interface AutopatchDeviceStatus {
  aadDeviceId?: string
  deviceName?: string
  serialNumber?: string
  model?: string
  osVersion?: string
  updateStatus?: string
  deviceReadiness?: string
  businessGroupName?: string
  deploymentGroupName?: string
  lastIntuneSyncDateTimeUTC?: string
  quStatus?: string
  fuStatus?: string
  fuCurrentOSVersion?: string
  fuTargetOSVersion?: string
  fuosStatus?: string
  isHotpatchEnrolled?: boolean
  quEnrollmentStatus?: string
  fuEnrollmentStatus?: string
  driverEnrollmentStatus?: string
  updateTypesEnrolled?: string
  isAssignedtoCloudPolicy?: string
  isAssignedtoUpdateRing?: string
  quAlerts?: string
  fuAlerts?: string
  alertNames?: string[]
  alertCount?: number
  tenantId?: string
  [key: string]: unknown
}

// Tenant-level alert group from GET /unified-reporting/odata/1.0/DeviceAlertList
// (no per-device filter — fetched once and cross-referenced against device AlertNames)
export interface AutopatchAlertGroup {
  alertGroupName: string
  alertGroupSeverity?: string        // 'Critical' | 'Warning'
  alertGroupState?: string           // 'Active' | 'Resolved'
  alertGroupCategory?: string        // 'Device' | 'PolicyAlert'
  alertGroupAffectedUpdateTypes?: string  // JSON-encoded array e.g. '["Quality","Feature"]'
  alertGroupRemediationAction?: string
  alertGroupLatestDateTime?: string
  impactDeviceCount?: number
  tenantId?: string
}

export interface WindowsUpdateState {
  id?: string
  deviceId?: string
  deviceDisplayName?: string
  userPrincipalName?: string
  // upToDate | pendingInstallation | pendingReboot | failed
  status?: string
  qualityUpdateVersion?: string
  featureUpdateVersion?: string
  lastScanDateTime?: string
  lastSyncDateTime?: string
}

// Windows Autopatch Graph API (admin/windows/updates) types
export interface AutopatchEnrollment {
  '@odata.type'?: string
  updateCategory?: string // 'feature' | 'quality' | 'driver' | 'unknownFutureValue'
}

export interface AutopatchAssetError {
  '@odata.type'?: string
  reason?: string
}

export interface AutopatchDevice {
  id?: string
  enrollments?: AutopatchEnrollment[]
  errors?: AutopatchAssetError[]
}

export interface AutopatchComplianceChangeRule {
  '@odata.type'?: string
  durationBeforeDeploymentStart?: string // ISO 8601 duration, e.g. "P7D"
  createdDateTime?: string
  lastEvaluatedDateTime?: string
  lastModifiedDateTime?: string
}

export interface AutopatchUpdatePolicy {
  id?: string
  createdDateTime?: string
  complianceChangeRules?: AutopatchComplianceChangeRule[]
  deploymentSettings?: {
    schedule?: {
      startDateTime?: string
      gradualRollout?: {
        durationBetweenOffers?: string
        offerIntervalInDays?: number
      }
    }
    userExperience?: {
      daysUntilForcedReboot?: number
      gracePeriodInDays?: number
    }
  }
}
