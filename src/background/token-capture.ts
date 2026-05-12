import { TOKEN_STALE_MS } from '@/shared/constants'

interface TokenEntry {
  token: string
  capturedAt: number
}

const AUTOPATCH_STORAGE_KEY = 'autopatchToken'
const BITLOCKER_STORAGE_KEY = 'bitlockerToken'
const LAPS_STORAGE_KEY = 'lapsTokenV2'

const tokensByTab = new Map<number, TokenEntry>()
const autopatchTokensByTab = new Map<number, TokenEntry>()
const bitlockerTokensByTab = new Map<number, TokenEntry>()
const lapsTokensByTab = new Map<number, TokenEntry>()

// Global persisted tokens — fall back when no tab-specific entry exists.
let persistedAutopatchEntry: TokenEntry | null = null
let persistedBitlockerEntry: TokenEntry | null = null
let persistedLapsEntry: TokenEntry | null = null

function captureBearer(map: Map<number, TokenEntry>): (details: chrome.webRequest.WebRequestHeadersDetails) => void {
  return (details) => {
    const authHeader = details.requestHeaders?.find(
      (h) => h.name.toLowerCase() === 'authorization'
    )
    if (authHeader?.value?.startsWith('Bearer ')) {
      const token = authHeader.value.slice(7)
      map.set(details.tabId, { token, capturedAt: Date.now() })
    }
  }
}

function makePersistentCapture(
  tabMap: Map<number, TokenEntry>,
  storageKey: string,
  setEntry: (e: TokenEntry) => void
): (details: chrome.webRequest.WebRequestHeadersDetails) => void {
  return (details) => {
    const authHeader = details.requestHeaders?.find(
      (h) => h.name.toLowerCase() === 'authorization'
    )
    if (authHeader?.value?.startsWith('Bearer ')) {
      const token = authHeader.value.slice(7)
      const entry: TokenEntry = { token, capturedAt: Date.now() }
      tabMap.set(details.tabId, entry)
      setEntry(entry)
      chrome.storage.local.set({ [storageKey]: entry })
    }
  }
}

export function setupTokenCapture(): void {
  // Restore persisted tokens from storage on service worker startup.
  chrome.storage.local.get([AUTOPATCH_STORAGE_KEY, BITLOCKER_STORAGE_KEY, LAPS_STORAGE_KEY], (result) => {
    const ap = result[AUTOPATCH_STORAGE_KEY] as TokenEntry | undefined
    if (ap && Date.now() - ap.capturedAt <= TOKEN_STALE_MS) persistedAutopatchEntry = ap
    const bl = result[BITLOCKER_STORAGE_KEY] as TokenEntry | undefined
    if (bl && Date.now() - bl.capturedAt <= TOKEN_STALE_MS) persistedBitlockerEntry = bl
    const la = result[LAPS_STORAGE_KEY] as TokenEntry | undefined
    if (la && Date.now() - la.capturedAt <= TOKEN_STALE_MS) persistedLapsEntry = la
  })

  chrome.webRequest.onBeforeSendHeaders.addListener(
    captureBearer(tokensByTab),
    { urls: ['https://graph.microsoft.com/*'], types: ['xmlhttprequest'] },
    ['requestHeaders', 'extraHeaders']
  )

  chrome.webRequest.onBeforeSendHeaders.addListener(
    makePersistentCapture(autopatchTokensByTab, AUTOPATCH_STORAGE_KEY, (e) => { persistedAutopatchEntry = e }),
    { urls: ['https://services.autopatch.microsoft.com/*'], types: ['xmlhttprequest'] },
    ['requestHeaders', 'extraHeaders']
  )

  // BitLocker recovery key API uses incremental consent — capture the token specifically
  // from BitLocker requests so we always have a BitLockerKey-scoped token available.
  chrome.webRequest.onBeforeSendHeaders.addListener(
    makePersistentCapture(bitlockerTokensByTab, BITLOCKER_STORAGE_KEY, (e) => { persistedBitlockerEntry = e }),
    { urls: ['https://graph.microsoft.com/*/informationProtection/bitlocker/*'], types: ['xmlhttprequest'] },
    ['requestHeaders', 'extraHeaders']
  )

  // LAPS password API uses DeviceLocalCredential.Read.All — capture from directory/deviceLocalCredentials
  // requests so we always have a LAPS-scoped token available.
  chrome.webRequest.onBeforeSendHeaders.addListener(
    makePersistentCapture(lapsTokensByTab, LAPS_STORAGE_KEY, (e) => { persistedLapsEntry = e }),
    { urls: ['https://graph.microsoft.com/*/directory/deviceLocalCredentials/*'], types: ['xmlhttprequest'] },
    ['requestHeaders', 'extraHeaders']
  )
}

function getFresh(map: Map<number, TokenEntry>, tabId: number): string | null {
  const entry = map.get(tabId)
  if (!entry) return null
  if (Date.now() - entry.capturedAt > TOKEN_STALE_MS) {
    map.delete(tabId)
    return null
  }
  return entry.token
}

export function getTokenForTab(tabId: number): string | null {
  return getFresh(tokensByTab, tabId)
}

function getFreshPersisted(
  tabMap: Map<number, TokenEntry>,
  tabId: number,
  persisted: TokenEntry | null
): string | null {
  const tabEntry = tabMap.get(tabId)
  if (tabEntry && Date.now() - tabEntry.capturedAt <= TOKEN_STALE_MS) return tabEntry.token
  if (persisted && Date.now() - persisted.capturedAt <= TOKEN_STALE_MS) return persisted.token
  return null
}

export function getAutopatchTokenForTab(tabId: number): string | null {
  return getFreshPersisted(autopatchTokensByTab, tabId, persistedAutopatchEntry)
}

export function getBitlockerTokenForTab(tabId: number): string | null {
  return getFreshPersisted(bitlockerTokensByTab, tabId, persistedBitlockerEntry)
}

export function getLapsTokenForTab(tabId: number): string | null {
  return getFreshPersisted(lapsTokensByTab, tabId, persistedLapsEntry)
}

export function clearTabToken(tabId: number): void {
  tokensByTab.delete(tabId)
  autopatchTokensByTab.delete(tabId)
  bitlockerTokensByTab.delete(tabId)
  lapsTokensByTab.delete(tabId)
}
