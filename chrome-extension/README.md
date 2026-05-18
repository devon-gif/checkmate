# CheckRay Chrome Extension

A minimal [Plasmo](https://docs.plasmo.com/) shell for the CheckRay browser extension.
This is **only a scaffold** — full analysis logic and API integration land later.

## What this is for

CheckRay helps people spot scams, ghost jobs, phishing messages, and sketchy
links. The extension brings that risk-check into the browser so users can
analyze the page they are currently on without copy/pasting into the web app.

This scaffold currently:

- Renders a popup with the CheckRay brand mark.
- Reads the current tab's URL and title via the `activeTab` permission.
- Exposes a placeholder **"Analyze this page"** button with a loading and
  result state. The real API call is stubbed (see `popup.tsx`, search for
  `TODO`).

## Prerequisites

- Node.js 18+ (Plasmo requires it).
- npm or pnpm.
- Google Chrome (or any Chromium-based browser).

## Install

From this folder (`chrome-extension/`):

```bash
npm install
```

The first install resolves Plasmo, React, and Chrome types. Until you do this,
your editor will show "Cannot find name 'chrome'" — that's expected.

## Run locally (dev mode)

```bash
npm run dev
```

Plasmo will produce a development build at `build/chrome-mv3-dev/`.

## Load it in Chrome

1. Open `chrome://extensions`.
2. Toggle **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the folder `chrome-extension/build/chrome-mv3-dev/`.
5. Pin the CheckRay extension to your toolbar.

Click the toolbar icon to open the popup.

## Build for distribution

```bash
npm run build
npm run package
```

The packaged zip lands in `build/chrome-mv3-prod.zip` (suitable for the Chrome
Web Store upload, once we're ready).

## Project layout

```
chrome-extension/
├── popup.tsx        # Popup UI (Plasmo auto-registers this as the action popup)
├── package.json     # Plasmo manifest is embedded under the "manifest" key
├── tsconfig.json
└── README.md
```

## Permissions

Declared in `package.json` under `manifest.permissions`:

- `activeTab` — read the user's currently active tab when they click the
  extension.
- `storage` — reserved for future settings (opt-in scam-watch sync, etc.).

We deliberately do **not** request broad `<all_urls>` host permissions yet.

## Where CheckRay API integration lands

Inside `popup.tsx`, look for the `handleAnalyze` function. Comments mark where
the real `POST /api/analyze-case` call will go once auth + rate-limiting are
finalized.

## Reference: official Chrome samples

We use Google's [chrome-extensions-samples](https://github.com/GoogleChrome/chrome-extensions-samples)
as architectural reference only — see `../docs/CHROME_EXTENSION_REFERENCE.md`.
We do not copy large blocks of sample code.

## Security

- This extension never bundles secrets. CheckRay API keys live on the server
  (`checkray.app/api/*`); the extension just calls public, rate-limited
  endpoints.
- Gitleaks runs at the repo root via pre-commit — see `../docs/SECURITY_SETUP.md`.
