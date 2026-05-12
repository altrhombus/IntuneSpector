# IntuneSpector

A Chrome/Edge browser extension that overlays a contextual data panel on the Microsoft Intune admin portal. When you navigate to a device page, IntuneSpector automatically fetches and surfaces dozens of additional data points — compliance, config profiles, Defender state, encryption, BitLocker keys, LAPS passwords, Autopatch alerts, group memberships, and more — all in one collapsible side panel without leaving the page.

---

## Features

**Device 360** — a unified panel that opens automatically when browsing a device in the Intune portal:

| Section | What it shows |
|---|---|
| Identity & Hardware | OS version, join type, management agent, serial, model, RAM, storage, TPM, MAC addresses, FQDN, scope tags |
| Compliance | Per-policy compliance status with a color-coded status bar |
| Config Profiles | Per-profile assignment status across Settings Catalog, DC, and ADMX policy types |
| Windows Update & Autopatch | WufB ring status · Autopatch enrollment, ring/group, QU/FU state, hotpatch · Active alerts with severity |
| Endpoint Analytics | Overall, startup, app reliability, and work-from-anywhere scores |
| Health Scripts | Detection/remediation state with output and last run time |
| Defender | Real-time/tamper protection, engine/signature versions, last scan times |
| Disk Encryption | BitLocker readiness and policy detail |
| Azure AD & Groups | Trust type, account state, last sign-in, all transitive group memberships |
| Autopilot | Deployment profile, group tag, enrollment state |
| BitLocker Keys | Recovery keys with inline reveal and copy (requires portal visit — see below) |
| LAPS | Password reveal with account name and backup time |
| Audit Log | Last 20 device audit events with actor and result |
| Detected Apps | Full installed app list with version and search filter |
| Security Baselines | Per-baseline compliance state |

Sections are reorderable and individually hideable via the **Layout** editor in the panel header. Layout preferences are persisted in browser storage.

---

## How it works

IntuneSpector is a passive observer — it does not inject credentials or authenticate independently.

1. **Context detection** — the background service worker watches outgoing Graph API requests from the Intune portal tab and extracts the device ID from the URL patterns. This tells the extension which device you're looking at.

2. **Token capture** — the portal makes its own authenticated requests to `graph.microsoft.com` and related services. The extension observes the `Authorization` headers on those outgoing requests and reuses the bearer tokens to make its own additional API calls on your behalf.

3. **Incremental consent tokens** — a handful of APIs (BitLocker recovery keys, LAPS passwords, Windows Autopatch) require permissions granted through incremental consent flows that the portal triggers on-demand. The extension captures those tokens when the portal visits the relevant section for the first time, then persists them (with a 50-minute TTL) so subsequent panel loads work without re-navigating.

4. **Data stays in the browser** — all API calls go directly from your browser to Microsoft. There is no proxy, no backend, and no telemetry. Nothing leaves your browser except requests to `graph.microsoft.com` and `services.autopatch.microsoft.com`.

---

## Installation

There is no store listing yet. Load the extension in developer mode:

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

### Build

```bash
git clone https://github.com/altrhombus/IntuneSpector.git
cd IntuneSpector
pnpm install
pnpm build
```

The built extension is output to `dist/`.

### Load in Chrome or Edge

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` folder
4. Navigate to [intune.microsoft.com](https://intune.microsoft.com) and open any device

> **Tip:** Run `pnpm dev` for watch mode during development — the extension rebuilds automatically on save.

---

## Usage notes

### Activating token-gated sections

Some sections require the Intune portal to have visited the corresponding page at least once in the current browser session, so the extension can capture the appropriate token:

| Section | Portal page to visit once |
|---|---|
| BitLocker Keys | Devices → Recovery keys |
| LAPS | Devices → Local admin passwords |
| Windows Autopatch | Devices → Windows Autopatch |

After visiting those pages, the token is cached for up to 50 minutes and survives service worker restarts.

### Refreshing data

Click **↺ Refresh** in the panel header to force a fresh fetch. The in-memory cache TTL is 90 seconds — navigating to the same device within that window serves cached data.

### Keyboard shortcut

**Alt + Shift + I** toggles the panel open/closed from anywhere on the Intune portal.

---

## Permissions

The extension requests the following permissions in `manifest.json`:

| Permission | Purpose |
|---|---|
| `webRequest` | Observe outgoing requests to detect device context and capture bearer tokens |
| `storage` | Persist panel layout preferences and cached tokens across service worker restarts |
| `tabs` | Associate captured context and tokens with the correct portal tab |

Host permissions are limited to `intune.microsoft.com`, `graph.microsoft.com`, and `services.autopatch.microsoft.com`.

---

## Tech stack

- **TypeScript** + **React 18**
- **Vite** + `vite-plugin-web-extension` (Manifest V3)
- **Emotion** CSS-in-JS (Shadow DOM isolated styles)
- No backend, no build-time secrets, no external dependencies beyond Microsoft's own APIs