import { graphGet, graphPost, GraphAuthError } from './graph-client'
import { cacheGet, cacheSet } from './cache'
import type { Device360Data } from '@/shared/types'
import type {
  ManagedDevice,
  ReportResponse,
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
  AutopatchServiceReport,
  AutopatchQualityUpdateDetail,
  AutopatchV2Report,
  AutopatchAlertGroup,
  AutopatchDeviceStatus,
  WindowsUpdateState,
} from '@/shared/graph-types'

const AUTOPATCH_BASE = 'https://services.autopatch.microsoft.com'

async function autopatchGet<T>(path: string, token: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${AUTOPATCH_BASE}${path}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new GraphAuthError(res.status)
    throw new Error(`Autopatch service error ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

async function autopatchPost<T>(path: string, token: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${AUTOPATCH_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new GraphAuthError(res.status)
    throw new Error(`Autopatch service error ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

type Errors = Record<string, string>

// Wraps a Graph call with cache lookup and per-section error tracking.
// Auth errors are recorded with an 'auth:' prefix so callers can detect them
// without a thrown exception killing the entire fetch.
async function fetchSection<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  errors: Errors
): Promise<T | null> {
  const cached = cacheGet<T>(cacheKey)
  if (cached !== null) return cached
  try {
    const result = await fetcher()
    cacheSet(cacheKey, result)
    return result
  } catch (err) {
    if (err instanceof GraphAuthError) {
      errors[cacheKey] = `auth:${err.status}`
      return null
    }
    errors[cacheKey] = err instanceof Error ? err.message : String(err)
    return null
  }
}

// Converts the columnar report format into plain row objects keyed by column name.
function parseReport(data: ReportResponse): Record<string, string>[] {
  const schema = data.Schema ?? data.schema ?? []
  const values = data.Values ?? data.values ?? []
  const cols = schema.map((s) => (s as { Column?: string; column?: string }).Column ?? (s as { Column?: string; column?: string }).column ?? '')
  return values.map((row) => {
    const obj: Record<string, string> = {}
    cols.forEach((col, i) => {
      obj[col] = String(row[i] ?? '')
    })
    return obj
  })
}

export async function fetchDevice360(
  deviceId: string,
  token: string,
  azureAdDeviceId?: string,
  autopatchToken?: string | null,
  bitlockerToken?: string | null,
  lapsToken?: string | null,
  signal?: AbortSignal
): Promise<Device360Data> {
  const errors: Errors = {}

  // Phase 1: all calls that only require deviceId — run in parallel
  const [
    deviceRes,
    hardwareRes,
    complianceRes,
    configProfilesRes,
    healthScriptsRes,
    endpointAnalyticsRes,
    defenderRes,
    encryptionRes,
    securityBaselinesRes,
    auditEventsRes,
    detectedAppsRes,
    wuConfigsRes,
  ] = await Promise.allSettled([
    fetchSection<ManagedDevice>(
      `device:${deviceId}`,
      () => graphGet<ManagedDevice>(`/beta/deviceManagement/managedDevices('${deviceId}')`, token, signal),
      errors
    ),
    fetchSection<Partial<ManagedDevice>>(
      `hardware:${deviceId}`,
      () =>
        graphGet<Partial<ManagedDevice>>(
          `/beta/deviceManagement/managedDevices('${deviceId}')?$select=id,hardwareInformation,iccid,udid,roleScopeTagIds,ethernetMacAddress,processorArchitecture,physicalMemoryInBytes,bootstrapTokenEscrowed`,
          token,
          signal
        ),
      errors
    ),
    fetchSection<ReportResponse>(
      `compliance:${deviceId}`,
      () =>
        graphPost<ReportResponse>(
          '/beta/deviceManagement/reports/getDevicePoliciesComplianceReport',
          token,
          {
            select: [],
            skip: 0,
            top: 50,
            filter: `(DeviceId eq '${deviceId}') and ((PolicyPlatformType eq '4') or (PolicyPlatformType eq '5') or (PolicyPlatformType eq '6') or (PolicyPlatformType eq '8') or (PolicyPlatformType eq '100'))`,
            orderBy: ['PolicyName asc'],
          },
          signal
        ),
      errors
    ),
    fetchSection<ReportResponse>(
      `configProfiles:${deviceId}`,
      () =>
        graphPost<ReportResponse>(
          '/beta/deviceManagement/reports/getConfigurationPoliciesReportForDevice',
          token,
          {
            select: [
              'IntuneDeviceId',
              'PolicyBaseTypeName',
              'PolicyId',
              'PolicyStatus',
              'UPN',
              'PspdpuLastModifiedTimeUtc',
              'PolicyName',
              'UnifiedPolicyType',
            ],
            filter: `((PolicyBaseTypeName eq 'Microsoft.Management.Services.Api.DeviceConfiguration') or (PolicyBaseTypeName eq 'DeviceManagementConfigurationPolicy') or (PolicyBaseTypeName eq 'DeviceConfigurationAdmxPolicy') or (PolicyBaseTypeName eq 'Microsoft.Management.Services.Api.DeviceManagementIntent')) and (IntuneDeviceId eq '${deviceId}')`,
            skip: 0,
            top: 50,
            orderBy: ['PolicyName'],
          },
          signal
        ),
      errors
    ),
    fetchSection<{ value: DeviceHealthScriptState[] }>(
      `healthScripts:${deviceId}`,
      () =>
        graphGet<{ value: DeviceHealthScriptState[] }>(
          `/beta/deviceManagement/managedDevices/${deviceId}/deviceHealthScriptStates`,
          token,
          signal
        ),
      errors
    ),
    fetchSection<UserExperienceAnalyticsDeviceScore>(
      `endpointAnalytics:${deviceId}`,
      () =>
        graphGet<UserExperienceAnalyticsDeviceScore>(
          `/beta/deviceManagement/userExperienceAnalyticsDeviceScores('${deviceId}')`,
          token,
          signal
        ),
      errors
    ),
    fetchSection<WindowsProtectionState>(
      `defender:${deviceId}`,
      () =>
        graphGet<WindowsProtectionState>(
          `/beta/deviceManagement/managedDevices/${deviceId}/windowsProtectionState`,
          token,
          signal
        ),
      errors
    ),
    fetchSection<{ value: ManagedDeviceEncryptionState[] }>(
      `encryption:${deviceId}`,
      () =>
        graphGet<{ value: ManagedDeviceEncryptionState[] }>(
          `/beta/deviceManagement/managedDeviceEncryptionStates?$filter=id eq '${deviceId}'`,
          token,
          signal
        ),
      errors
    ),
    fetchSection<{ value: SecurityBaselineState[] }>(
      `securityBaselines:${deviceId}`,
      () =>
        graphGet<{ value: SecurityBaselineState[] }>(
          `/beta/deviceManagement/managedDevices/${deviceId}/securityBaselineStates`,
          token,
          signal
        ),
      errors
    ),
    fetchSection<{ value: DeviceAuditEvent[] }>(
      `auditEvents:${deviceId}`,
      () =>
        graphGet<{ value: DeviceAuditEvent[] }>(
          `/beta/deviceManagement/auditEvents?$filter=resources/any(r: r/resourceId eq '${deviceId}')&$orderBy=activityDateTime desc&$top=20`,
          token,
          signal
        ),
      errors
    ),
    fetchSection<{ value: DetectedApp[] }>(
      `detectedApps:${deviceId}`,
      () =>
        graphGet<{ value: DetectedApp[] }>(
          `/beta/deviceManagement/managedDevices('${deviceId}')/detectedApps?$top=50&$orderBy=displayName asc`,
          token,
          signal
        ),
      errors
    ),
    fetchSection<{ value: { id: string; displayName: string }[] }>(
      `wuConfigs:${deviceId}`,
      () =>
        graphGet<{ value: { id: string; displayName: string }[] }>(
          `/beta/deviceManagement/deviceConfigurations?$filter=isof('microsoft.graph.windowsUpdateForBusinessConfiguration')&$select=id,displayName&$orderby=displayName asc&$top=50`,
          token,
          signal
        ),
      errors
    ),
  ])

  const device = deviceRes.status === 'fulfilled' ? deviceRes.value : null
  const hardwareRaw = hardwareRes.status === 'fulfilled' ? hardwareRes.value : null
  const complianceRaw = complianceRes.status === 'fulfilled' ? complianceRes.value : null
  const configProfilesRaw = configProfilesRes.status === 'fulfilled' ? configProfilesRes.value : null
  const healthScriptsRaw = healthScriptsRes.status === 'fulfilled' ? healthScriptsRes.value : null
  const endpointAnalytics = endpointAnalyticsRes.status === 'fulfilled' ? endpointAnalyticsRes.value : null
  const defender = defenderRes.status === 'fulfilled' ? defenderRes.value : null
  const encryptionRaw = encryptionRes.status === 'fulfilled' ? encryptionRes.value : null
  const securityBaselinesRaw = securityBaselinesRes.status === 'fulfilled' ? securityBaselinesRes.value : null
  const auditEventsRaw = auditEventsRes.status === 'fulfilled' ? auditEventsRes.value : null
  const detectedAppsRaw = detectedAppsRes.status === 'fulfilled' ? detectedAppsRes.value : null
  const wuConfigs = wuConfigsRes.status === 'fulfilled' ? (wuConfigsRes.value?.value ?? []) : []

  // Use the azureAdDeviceId from context if provided, otherwise fall back to device response
  const aadId = azureAdDeviceId ?? device?.azureADDeviceId

  // Resolve scope tag IDs → display names using IDs from hardware $select or device basics
  const scopeTagIds = (hardwareRaw?.roleScopeTagIds ?? device?.roleScopeTagIds ?? []).filter(Boolean)
  let scopeTags: RoleScopeTag[] | null = null
  if (scopeTagIds.length > 0) {
    const filter = scopeTagIds.map((id) => `id eq '${id}'`).join(' or ')
    const scopeTagsRaw = await fetchSection<{ value: RoleScopeTag[] }>(
      `scopeTags:${deviceId}`,
      () => graphGet<{ value: RoleScopeTag[] }>(`/beta/deviceManagement/roleScopeTags?$filter=${filter}`, token, signal),
      errors
    )
    scopeTags = scopeTagsRaw?.value ?? null
  }

  // Phase 1.5: fetch device state for each WufB ring (requires ring IDs from Phase 1)
  const wuRingStates: Record<string, string>[] = []
  if (wuConfigs.length > 0) {
    const ringResults = await Promise.allSettled(
      wuConfigs.map((config) =>
        fetchSection<{ value: WindowsUpdateState[] }>(
          `wuRing:${config.id}:${deviceId}`,
          () =>
            graphGet<{ value: WindowsUpdateState[] }>(
              `/beta/deviceManagement/deviceConfigurations/${config.id}/microsoft.graph.windowsUpdateForBusinessConfiguration/deviceUpdateStates?$filter=deviceId eq '${deviceId}'`,
              token,
              signal
            ),
          errors
        )
      )
    )
    for (let i = 0; i < wuConfigs.length; i++) {
      const res = ringResults[i]
      if (res.status === 'fulfilled' && res.value?.value?.[0]) {
        const s = res.value.value[0]
        wuRingStates.push({
          PolicyName: wuConfigs[i].displayName,
          PolicyStatus: s.status ?? '',
          FeatureUpdateVersion: s.featureUpdateVersion ?? '',
          QualityUpdateVersion: s.qualityUpdateVersion ?? '',
          AlertMessage: '',
        })
      }
    }
  }

  // Phase 2: calls that require azureAdDeviceId — run in parallel after Phase 1
  let aadDevice: AzureADDevice | null = null
  let aadGroups: Group[] | null = null
  let autopilot: WindowsAutopilotDeviceIdentity | null = null
  let bitlockerKeys: BitLockerRecoveryKey[] | null = null
  let laps: DeviceLocalCredentialInfo | null = null

  if (aadId) {
    const [aadDeviceRes, autopilotRes] = await Promise.allSettled([
      fetchSection<{ value: AzureADDevice[] }>(
        `aadDevice:${aadId}`,
        () =>
          graphGet<{ value: AzureADDevice[] }>(
            `/v1.0/devices?$filter=deviceId eq '${aadId}'&$expand=registeredOwners`,
            token,
            signal
          ),
        errors
      ),
      fetchSection<{ value: WindowsAutopilotDeviceIdentity[] }>(
        `autopilot:${aadId}`,
        () =>
          graphGet<{ value: WindowsAutopilotDeviceIdentity[] }>(
            `/beta/deviceManagement/windowsAutopilotDeviceIdentities?$filter=managedDeviceId eq '${deviceId}'`,
            token,
            signal
          ),
        errors
      ),
    ])

    const aadDeviceRaw = aadDeviceRes.status === 'fulfilled' ? aadDeviceRes.value : null
    aadDevice = aadDeviceRaw?.value?.[0] ?? null

    // Fetch group memberships using the AAD object ID from the device record
    if (aadDevice?.id) {
      const groupsRaw = await fetchSection<{ value: Group[] }>(
        `aadGroups:${aadDevice.id}`,
        () =>
          graphGet<{ value: Group[] }>(
            `/beta/devices/${aadDevice!.id}/transitiveMemberOf/microsoft.graph.group?$orderBy=displayName asc&$count=true`,
            token,
            signal
          ),
        errors
      )
      aadGroups = groupsRaw?.value ?? null

      // LAPS requires DeviceLocalCredential.ReadBasic.All — use dedicated token if captured.
      if (!lapsToken) {
        errors[`laps:${deviceId}`] = 'no-token'
      } else {
        laps = (await fetchSection<DeviceLocalCredentialInfo>(
          `laps:${deviceId}`,
          () =>
            graphGet<DeviceLocalCredentialInfo>(
              `/beta/directory/deviceLocalCredentials/${aadId}`,
              lapsToken,
              signal
            ),
          errors
        )) ?? null
      }
    }

    autopilot = (autopilotRes.status === 'fulfilled' ? autopilotRes.value?.value?.[0] : null) ?? null

    // BitLocker recovery keys require a BitLockerKey-scoped token obtained from the portal's
    // recovery keys section — separate from the standard Graph token.
    if (!bitlockerToken) {
      errors[`bitlocker:${aadId}`] = 'no-token'
    } else {
      const bitlockerRaw = await fetchSection<{ value: BitLockerRecoveryKey[] }>(
        `bitlocker:${aadId}`,
        () =>
          graphGet<{ value: BitLockerRecoveryKey[] }>(
            `/beta/informationProtection/bitlocker/recoveryKeys?$filter=deviceId eq '${aadId}'`,
            bitlockerToken,
            signal
          ),
        errors
      )
      bitlockerKeys = bitlockerRaw?.value ?? null
    }
  }

  // Phase 3: Windows Autopatch proprietary service — requires a token captured from
  // the Autopatch portal section (services.autopatch.microsoft.com), not the Graph token.
  let autopatchServiceDevice: AutopatchServiceDevice | null = null
  let autopatchQualityDetail: AutopatchQualityUpdateDetail | null = null
  let autopatchAlertGroups: AutopatchAlertGroup[] | null = null
  let autopatchDeviceStatus: AutopatchDeviceStatus | null = null
  const autopatchErrorKey = `autopatchService:${deviceId}`

  // registeredDevices/details + wqu/details: use memory cache if available (survives token expiry)
  const autopatchCached = cacheGet<AutopatchServiceReport>(autopatchErrorKey)
  if (autopatchCached) {
    autopatchServiceDevice = autopatchCached.values?.[0] ?? null
  } else if (!autopatchToken) {
    errors[autopatchErrorKey] = 'no-token'
  } else if (device?.deviceName) {
    const deviceSearch = { skip: 0, top: 1, search: device.deviceName }
    const [autopatchRaw, wquRaw] = await Promise.allSettled([
      fetchSection<AutopatchServiceReport>(
        autopatchErrorKey,
        () =>
          autopatchPost<AutopatchServiceReport>(
            '/reporting/reports/v1/devicesReport/registeredDevices/details',
            autopatchToken,
            {
              filters: {
                deploymentGroups: [],
                autopatchGroups: [],
                quOSVersions: [],
                fuCurrentOSVersions: [],
                fuTargetOSVersions: [],
                fuOSStatuses: [],
                fuPauseStatuses: [],
                fuUpdateStatuses: [],
                quUpdateStatuses: [],
                quPauseStatuses: [],
                updateStatuses: [],
                pauseStatuses: [],
                deviceReadinesses: [],
              },
              search: device.deviceName,
              sortKey: '',
              isDesc: false,
              skip: 0,
              top: 1,
            },
            signal
          ),
        errors
      ),
      autopatchPost<AutopatchV2Report<AutopatchQualityUpdateDetail>>(
        '/reporting/reports/v2/deviceAccounting/wqu/details?api-version=2.0',
        autopatchToken,
        deviceSearch,
        signal
      ).catch(() => null),
    ])
    autopatchServiceDevice = (autopatchRaw.status === 'fulfilled' ? autopatchRaw.value?.values?.[0] : null) ?? null
    autopatchQualityDetail = (wquRaw.status === 'fulfilled' ? wquRaw.value?.values?.[0] : null) ?? null
  }

  // Alert group + device status: fetched independently of the service device cache so they
  // are always populated when the token is present (each uses its own fetchSection cache key)
  if (autopatchToken) {
    const statusFilter = aadId
      ? `aadDeviceId eq '${aadId}'`
      : device?.deviceName
        ? `deviceName eq '${device.deviceName.replace(/'/g, "''")}'`
        : null

    const alertPromises: Promise<unknown>[] = [
      fetchSection<{ value?: AutopatchAlertGroup[] }>(
        'autopatchAlertGroups',
        () => autopatchGet<{ value?: AutopatchAlertGroup[] }>(
          '/unified-reporting/odata/1.0/DeviceAlertList',
          autopatchToken,
          signal
        ),
        errors
      ),
    ]
    if (statusFilter) {
      alertPromises.push(
        fetchSection<{ value?: AutopatchDeviceStatus[] }>(
          `autopatchStatus:${deviceId}`,
          () => {
            const qs = new URLSearchParams({ '$filter': statusFilter, '$top': '1' })
            return autopatchGet<{ value?: AutopatchDeviceStatus[] }>(
              `/unified-reporting/odata/1.0/AutopatchManagementStatusDetails?${qs}`,
              autopatchToken,
              signal
            )
          },
          errors
        )
      )
    }

    const [alertsResult, statusResult] = await Promise.allSettled(alertPromises)
    autopatchAlertGroups =
      alertsResult.status === 'fulfilled'
        ? ((alertsResult.value as { value?: AutopatchAlertGroup[] } | null)?.value ?? null)
        : null
    autopatchDeviceStatus =
      statusResult?.status === 'fulfilled'
        ? ((statusResult.value as { value?: AutopatchDeviceStatus[] } | null)?.value?.[0] ?? null)
        : null
  }

  return {
    device,
    hardware: hardwareRaw?.hardwareInformation ?? null,
    compliancePolicies: complianceRaw ? parseReport(complianceRaw) : null,
    configProfiles: configProfilesRaw ? parseReport(configProfilesRaw) : null,
    healthScripts: healthScriptsRaw?.value ?? null,
    endpointAnalytics,
    defender,
    encryption: encryptionRaw?.value?.[0] ?? null,
    securityBaselines: securityBaselinesRaw?.value ?? null,
    aadDevice,
    aadGroups,
    autopilot,
    bitlockerKeys,
    laps,
    auditEvents: auditEventsRaw?.value ?? null,
    detectedApps: detectedAppsRaw?.value ?? null,
    scopeTags,
    autopatchServiceDevice,
    autopatchQualityDetail,
    autopatchFeatureDetail: null,
    autopatchDeviceStatus,
    autopatchAlertGroups,
    wuQualityStatus: wuRingStates.length > 0 ? wuRingStates : null,
    wuFeatureStatus: null,
    errors,
  }
}
