import { setupTokenCapture, getTokenForTab, getAutopatchTokenForTab, getBitlockerTokenForTab, getLapsTokenForTab, clearTabToken } from './token-capture'
import { setupContextDetection, getContextForTab } from './context-detector'
import { fetchDevice360 } from './device360-fetcher'
import { graphGet, GraphAuthError } from './graph-client'

setupTokenCapture()
setupContextDetection()

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id ?? -1

  if (message.type === 'GET_CONTEXT') {
    sendResponse({ success: true, data: getContextForTab(tabId) })
    return true
  }

  if (message.type === 'GET_TOKEN') {
    const token = getTokenForTab(tabId)
    if (token) {
      sendResponse({ success: true, data: token })
    } else {
      sendResponse({
        success: false,
        error: 'No token captured yet — navigate around the portal to trigger a Graph call',
      })
    }
    return true
  }

  if (message.type === 'CLEAR_TOKEN') {
    clearTabToken(tabId)
    sendResponse({ success: true })
    return true
  }

  if (message.type === 'FETCH_DEVICE360') {
    const token = getTokenForTab(tabId)
    if (!token) {
      sendResponse({ success: false, error: 'no-token' })
      return true
    }
    const { deviceId, azureAdDeviceId } = message as { deviceId: string; azureAdDeviceId?: string }
    fetchDevice360(deviceId, token, azureAdDeviceId, getAutopatchTokenForTab(tabId), getBitlockerTokenForTab(tabId), getLapsTokenForTab(tabId))
      .then((data) => {
        // If the core device fetch itself hit an auth error the session is expired.
        const deviceAuthFailed = data.errors[`device:${deviceId}`]?.startsWith('auth:')
        if (deviceAuthFailed && !data.device) {
          sendResponse({ success: false, error: 'auth-error' })
        } else {
          sendResponse({ success: true, data })
        }
      })
      .catch((err) => sendResponse({ success: false, error: 'fetch-error', detail: String(err) }))
    return true
  }

  if (message.type === 'FETCH_LAPS_PASSWORD') {
    const token = getTokenForTab(tabId)
    if (!token) {
      sendResponse({ success: false, error: 'no-token' })
      return true
    }
    const { aadDeviceId } = message as { aadDeviceId: string }
    const lapsToken = getLapsTokenForTab(tabId) ?? token
    graphGet<{ credentials?: Array<{ accountName?: string; passwordBase64?: string; backupDateTime?: string }> }>(
      `/beta/directory/deviceLocalCredentials/${aadDeviceId}?$select=credentials`,
      lapsToken
    )
      .then((data) => sendResponse({ success: true, credentials: data.credentials ?? [] }))
      .catch((err) => {
        if (err instanceof GraphAuthError) {
          sendResponse({ success: false, error: 'auth-error' })
        } else {
          sendResponse({ success: false, error: String(err) })
        }
      })
    return true
  }

  if (message.type === 'FETCH_BITLOCKER_KEY') {
    const token = getTokenForTab(tabId)
    if (!token) {
      sendResponse({ success: false, error: 'no-token' })
      return true
    }
    const { keyId } = message as { keyId: string }
    const bitlockerToken = getBitlockerTokenForTab(tabId) ?? token
    graphGet<{ key?: string }>(`/beta/informationProtection/bitlocker/recoveryKeys/${keyId}?$select=key`, bitlockerToken)
      .then((data) => sendResponse({ success: true, key: data.key ?? null }))
      .catch((err) => {
        if (err instanceof GraphAuthError) {
          sendResponse({ success: false, error: 'auth-error' })
        } else {
          sendResponse({ success: false, error: String(err) })
        }
      })
    return true
  }

  return false
})

chrome.tabs.onRemoved.addListener((tabId) => {
  clearTabToken(tabId)
})
