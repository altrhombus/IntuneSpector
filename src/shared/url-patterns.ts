export const DEVICE_ID_PATTERNS = [
  /\/managedDevices\('([a-f0-9-]{36})'\)/i,
  /\/managedDevices\/([a-f0-9-]{36})(?:\/|$|\?)/i,
] as const

export const AZURE_DEVICE_ID_PATTERNS = [
  /azureAdDeviceId\s*eq\s*'([a-f0-9-]{36})'/i,
  /\/devices\?.*deviceId\s+eq\s+'([a-f0-9-]{36})'/i,
] as const

export const USER_ID_PATTERNS = [
  /\/users\('([a-f0-9-]{36})'\)/i,
  /\/users\/([a-f0-9-]{36})(?:\/|$|\?)/i,
] as const
