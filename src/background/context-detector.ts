import {
  DEVICE_ID_PATTERNS,
  AZURE_DEVICE_ID_PATTERNS,
  USER_ID_PATTERNS,
} from '@/shared/url-patterns'
import type { IntuneContext } from '@/shared/types'

const contextByTab = new Map<number, IntuneContext>()

export function setupContextDetection(): void {
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      const context = extractContext(details.url)
      if (!context) return

      const existing = contextByTab.get(details.tabId)

      // Merge: accumulate azureAdDeviceId onto a device context when seen separately
      if (context.type === 'device' && existing?.type === 'device') {
        const merged: IntuneContext = { ...existing, ...context }
        contextByTab.set(details.tabId, merged)
        notifyTab(details.tabId, merged)
      } else {
        contextByTab.set(details.tabId, context)
        notifyTab(details.tabId, context)
      }
    },
    { urls: ['https://graph.microsoft.com/*'] }
  )

  chrome.tabs.onRemoved.addListener((tabId) => {
    contextByTab.delete(tabId)
  })

  // Clear context on navigation to a new Intune page so stale data doesn't persist
  chrome.webNavigation?.onHistoryStateUpdated?.addListener(
    (details) => {
      if (details.frameId === 0) contextByTab.delete(details.tabId)
    },
    { url: [{ hostEquals: 'intune.microsoft.com' }] }
  )
}

function extractContext(url: string): IntuneContext {
  for (const pattern of DEVICE_ID_PATTERNS) {
    const m = url.match(pattern)
    if (m) return { type: 'device', deviceId: m[1] }
  }
  for (const pattern of AZURE_DEVICE_ID_PATTERNS) {
    const m = url.match(pattern)
    if (m) return { type: 'device', deviceId: '', azureAdDeviceId: m[1] }
  }
  for (const pattern of USER_ID_PATTERNS) {
    const m = url.match(pattern)
    if (m) return { type: 'user', userId: m[1] }
  }
  return null
}

function notifyTab(tabId: number, context: IntuneContext): void {
  if (tabId < 0) return  // webRequest fires for non-tab contexts (iframes, workers) with tabId -1
  chrome.tabs.sendMessage(tabId, { type: 'CONTEXT_UPDATE', context }).catch(() => {
    // Content script not yet ready — context will be provided on next GET_CONTEXT request
  })
}

export function getContextForTab(tabId: number): IntuneContext {
  return contextByTab.get(tabId) ?? null
}
