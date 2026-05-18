# Chrome Extension — Reference Patterns

The CheckRay extension lives in `../chrome-extension/` and uses
[Plasmo](https://docs.plasmo.com/). For architectural patterns we lean on the
official Google sample repo:

- **Repo:** <https://github.com/GoogleChrome/chrome-extensions-samples>
- **License:** Apache-2.0
- **Usage rule:** read these for patterns and API shape. **Do not** copy large
  blocks of code into CheckRay. If a small snippet is genuinely needed, note
  the upstream path and attribution near the snippet.

All sample paths below are relative to the `chrome-extensions-samples` repo
root.

## activeTab usage (current-tab capture, no broad host permissions)

- **Pattern:** request `activeTab` instead of `<all_urls>`. The user clicking
  the toolbar icon grants a temporary, page-scoped permission.
- **Reference samples:**
  - `functional-samples/sample.page-redder/` — minimal `activeTab` + script
    injection from the popup.
  - `api-samples/scripting/` — modern MV3 `chrome.scripting.executeScript`
    examples.
- **Where this maps in CheckRay:** `chrome-extension/popup.tsx` calls
  `chrome.tabs.query({ active: true, currentWindow: true })`. When we add
  page-content extraction we'll use `chrome.scripting.executeScript` rather
  than a persistent content script.

## Content scripts (page-level DOM access)

- **Pattern:** declarative content scripts in the manifest for known hosts,
  programmatic injection via `chrome.scripting` for one-shot reads.
- **Reference samples:**
  - `functional-samples/tutorial.reading-time/` — declarative content script.
  - `api-samples/scripting/inject-css/` — programmatic CSS/script injection.
- **CheckRay plan:** start programmatic-only (activeTab + scripting). Add
  declarative content scripts only when we ship "always-on" page warnings.

## Storage (settings and cached results)

- **Pattern:** prefer `chrome.storage.local` for per-device, `chrome.storage.sync`
  for cross-device user prefs (small payloads only).
- **Reference samples:**
  - `api-samples/storage/` — read/write/observe storage changes.
- **CheckRay plan:** opt-in flags (e.g. weekly scam-watch sync, dark/light)
  go in `chrome.storage.sync`. Cached analysis results, if any, go in
  `chrome.storage.local` with a TTL.

## Messaging (popup ⇄ background ⇄ content)

- **Pattern:** `chrome.runtime.sendMessage` / `onMessage` for one-shot
  requests; long-lived `chrome.runtime.connect` ports only when truly needed.
- **Reference samples:**
  - `api-samples/messaging/` — request/response and ports.
  - `functional-samples/sample.cookbook.action-on-install/` — service worker
    lifecycle messaging.
- **CheckRay plan:** popup will message a background service worker that
  calls the CheckRay API. Keeps API URL + auth out of the popup bundle and
  centralizes rate limiting.

## Context menus (future, not yet)

- **Pattern:** `chrome.contextMenus.create` in the service worker; handle in
  `onClicked`.
- **Reference samples:**
  - `api-samples/contextMenus/` — minimal right-click menu.
- **CheckRay plan:** add a "Check this link with CheckRay" right-click action
  on selected text and on links. Not in the current scaffold.

## Side panel (future, optional)

- **Pattern:** `chrome.sidePanel` (Chrome 114+) gives a persistent panel
  alongside the page — better UX than a popup for longer readouts.
- **Reference samples:**
  - `api-samples/sidepanel/` — basic side panel registration and open.
- **CheckRay plan:** evaluate once popup UX is validated. Side panel is the
  natural home for full "Ray says" risk readouts while the user reads the
  suspicious page.

## Things we will not copy

- Demo styling and inline `<style>` blocks (CheckRay has its own design
  system).
- Any analytics or telemetry snippets.
- Sample-specific permissions we don't need (`tabs`, `<all_urls>`, etc.).

## Update cadence

Re-check the samples repo when:

- Chrome bumps a manifest version or deprecates an API we use.
- We add a new capability (context menus, side panel, offscreen documents).
- We see a Plasmo upgrade that changes the recommended pattern.
