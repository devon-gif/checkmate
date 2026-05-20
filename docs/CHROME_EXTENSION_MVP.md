# Chrome Extension MVP

## Status: MVP scaffold complete — API-wired, Plasmo-based

---

## What works now

| Feature | Status |
|---|---|
| Popup opens | ✅ |
| Current tab URL captured via `scripting.executeScript` | ✅ |
| Selected text pre-fills textarea | ✅ |
| Manual textarea for paste | ✅ |
| "Check with Ray" button calls `/api/analyze-case` | ✅ |
| Result shows risk badge, score, red flags, next steps | ✅ |
| Dev mode sends `X-CheckRay-Test-Mode: fallback` (no OpenAI cost) | ✅ |
| Disclaimer shown on every result | ✅ |
| Loading and error states | ✅ |
| "Check something else" resets state | ✅ |

---

## How to run locally

### Prerequisites

```bash
# Install k6 (not required for extension — skip if already installed)
brew install k6

# From workspace root:
cd /Users/devonarcher/Developer/CheckMate/chrome-extension
pnpm install
```

### Dev mode (hot reload)

```bash
pnpm dev
```

This starts Plasmo in watch mode and outputs to `build/chrome-mv3-dev/`.

### Load in Chrome

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select: `/Users/devonarcher/Developer/CheckMate/chrome-extension/build/chrome-mv3-dev`
5. Click the extension icon in the toolbar to open the popup

### Configure API URL

Create `.env.development.local` in the `chrome-extension/` folder:

```
PLASMO_PUBLIC_CHECKRAY_API_URL=http://localhost:3000
```

The dev server defaults to `http://localhost:3000`. If your Next.js dev server is on a different port (e.g. 3002), update this.

For production build:

```
# .env.production.local
PLASMO_PUBLIC_CHECKRAY_API_URL=https://yourdomain.com
```

### Production build

```bash
pnpm build
# Output: build/chrome-mv3-prod/
```

---

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Read current tab URL and title |
| `scripting` | Execute `getSelection()` on current page to pre-fill textarea |
| `storage` | Save extension install state |

**No broad host permissions.** The extension only reads the active tab when the user explicitly clicks "Check with Ray".

---

## File structure (Plasmo)

```
chrome-extension/
  popup.tsx           ← Main popup (Plasmo entry point)
  background.ts       ← Service worker (minimal — install event only)
  style.css           ← Popup styles
  manifest.json       ← Base manifest (Plasmo merges this)
  package.json        ← Plasmo + React deps
  tsconfig.json       ← Extends plasmo/templates/tsconfig.base
  .env.example        ← Env var template
  src/
    content.ts        ← Legacy scaffold (not used by Plasmo build)
    popup.tsx         ← Legacy scaffold (not used by Plasmo build)
    ...
```

---

## API contract

The extension calls `POST /api/analyze-case` and expects:

```json
{
  "saved": false,
  "report": {
    "risk_score": 85,
    "risk_level": "high",
    "summary": "...",
    "red_flags": ["..."],
    "recommended_actions": ["..."],
    "disclaimer": "Ray can be wrong..."
  }
}
```

See `lib/checkray-core/types.ts` for the full TypeScript interface.

---

## What is NOT in MVP

| Feature | Phase |
|---|---|
| Sign-in / auth in popup | Phase 2 |
| Save report to dashboard | Phase 2 |
| "Open full report" deep link to /cases/[id] | Phase 2 |
| Right-click context menu | Phase 2 |
| Page content auto-scan | Phase 3 |
| Firefox support | Phase 3 |
| Chrome Web Store publish | Phase 4 |
| Job board scraping | Not planned |
