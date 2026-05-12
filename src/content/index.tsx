import React from 'react'
import { createRoot } from 'react-dom/client'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { App } from '@/panel/App'
import { SHADOW_HOST_ID } from '@/shared/constants'
import { THEME_CSS } from '@/shared/theme'

type ThemePref = 'auto' | 'light' | 'dark'

function osTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'light' || pref === 'dark') return pref
  return osTheme()
}

function mount() {
  if (document.getElementById(SHADOW_HOST_ID)) return

  const host = document.createElement('div')
  host.id = SHADOW_HOST_ID
  host.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:2147483647;isolation:isolate;'
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })

  // Theme CSS vars — set on :host([data-theme="..."]) so switching is instant with no re-render
  const themeStyle = document.createElement('style')
  themeStyle.textContent = THEME_CSS
  shadow.appendChild(themeStyle)

  const styleContainer = document.createElement('div')
  const appContainer = document.createElement('div')
  appContainer.style.cssText = 'position:absolute;inset:0;pointer-events:none;'
  shadow.appendChild(styleContainer)
  shadow.appendChild(appContainer)

  const cache = createCache({ key: 'is', container: styleContainer })
  const root = createRoot(appContainer)

  root.render(
    <React.StrictMode>
      <CacheProvider value={cache}>
        <App />
      </CacheProvider>
    </React.StrictMode>
  )

  function applyTheme(pref: ThemePref) {
    host.setAttribute('data-theme', resolveTheme(pref))
  }

  // Initial theme from storage (falls back to OS preference)
  chrome.storage.local.get(['theme'], (r) => {
    applyTheme((r.theme ?? 'auto') as ThemePref)
  })

  // React to OS-level theme changes when preference is 'auto'
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    chrome.storage.local.get(['theme'], (r) => {
      if ((r.theme ?? 'auto') === 'auto') applyTheme('auto')
    })
  })

  // React to Options page theme changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.theme) {
      applyTheme((changes.theme.newValue ?? 'auto') as ThemePref)
    }
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount)
} else {
  mount()
}
