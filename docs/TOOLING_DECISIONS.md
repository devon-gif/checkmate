# docs/TOOLING_DECISIONS.md — CheckRay Tooling Decisions

Last updated: May 2026

This document records decisions about external tools, plugins, MCP servers, and workflow utilities used in CheckRay development. It is not a how-to guide — it explains **why** each tool was chosen, deferred, or skipped.

All tooling decisions must be re-evaluated when the tool category changes meaningfully (new major version, change in data handling policy, or new capability that affects CheckRay's security model).

---

## Claude Code plugins, skills, and MCP servers

**Decision date:** May 2026  
**Decision maker:** Devon (product + engineering)  
**Trigger:** Evaluated a broad list of Claude Code plugins/skills/MCP servers for potential use in the CheckRay AI-assisted development workflow.

---

### Background

CheckRay uses Claude Code (and GitHub Copilot) as the primary AI coding assistant. The AI review/architecture guardrail system in [AGENTS.md](../AGENTS.md) and the [docs/AI_REVIEW_WORKFLOW.md](AI_REVIEW_WORKFLOW.md) governs how AI agents interact with the codebase. Any plugin or MCP server extends that trust surface, so the bar for adding one is: **clear benefit, bounded scope, no secret exposure, no deploy access**.

---

### Tools evaluated

| Tool | Category | Decision | Reason |
|---|---|---|---|
| Superpowers / dev-methodology plugin | Workflow enforcement | ✅ **Recommended now** | See below |
| Frontend-design skill | UI/design assistance | ✅ **Recommended now** | See below |
| Agent-browser / browser automation MCP | E2E testing + QA | 🔵 **Recommended later** | See below |
| Perplexity / web-search MCP | Research + scam intel | 🔵 **Recommended later** | See below |
| Zapier MCP | Automation | 🔵 **Recommended later** | See below |
| gstack | Full-stack scaffolding | ⛔ **Skip** | Broad repo permissions, unclear benefit over current setup |
| codex-plugin-cc | General coding | ⛔ **Skip** | Redundant with existing Copilot + Claude Code workflow |
| Notion MCP | Docs/knowledge base | ⛔ **Skip** | Not using Notion; adds an unnecessary credential surface |
| Slack MCP | Notifications | ⛔ **Skip** | Not at team size where this is needed; premature |
| claude-for-legal | Legal workflow | ⛔ **Skip** | CheckRay's legal copy is managed in `lib/legalCopy.ts`; outsourcing legal review to an AI plugin is not appropriate for a consumer product |
| Financial services plugins | Billing/fintech | ⛔ **Skip** | Stripe handles billing; plugin adds no value and increases secret exposure risk |
| Marketing / social media plugins | Growth | ⛔ **Skip** | Not at that stage; no benefit during MVP build |
| Video generation MCPs | Content | ⛔ **Skip** | Not relevant to product development workflow |
| Broad all-in-one bundles (e.g. "superpowers" mega-bundle variants) | Everything | ⛔ **Skip** | Scope too broad; cannot reason about what data they touch |

---

### ✅ Recommended now: Superpowers / dev-methodology plugin

**What it does:** Enforces a structured plan → build → review → test workflow loop in AI coding sessions. Adds pre-built prompts for scoping, risk-flagging, and summaries.

**Why it fits CheckRay:**
- Reduces "vibe-coding" drift where AI agents over-build or touch unrelated files
- Reinforces the Builder/Reviewer/Human workflow from [AI_REVIEW_WORKFLOW.md](AI_REVIEW_WORKFLOW.md)
- Helps AI agents scope changes to the exact files needed rather than speculative refactors
- Keeps sessions focused on the narrow-change rule in [AGENTS.md](../AGENTS.md)

**Safety constraints:**
- Must not be given access to `.env.local`, Supabase credentials, or Stripe keys
- Must not be authorized to deploy or push to main
- Plugin-suggested changes must still pass the full post-change checklist in AGENTS.md

**Install when:** Next focused development session targeting a specific feature or fix.

---

### ✅ Recommended now: Frontend-design skill

**What it does:** Provides UI/UX-aware code suggestions — component structure, Tailwind layout patterns, accessibility, responsive design, visual hierarchy.

**Why it fits CheckRay:**
- CheckRay has a substantial public-facing UI: homepage, pricing, dashboard, `/cases/new`, `/try`, Chrome extension popup
- The design system uses Tailwind + custom `cm-*` tokens + `GlassCard`/`GradientButton` primitives
- A design-aware skill will produce more consistent component suggestions without needing to explain the design language every session
- Useful for: pricing page polish, dashboard empty states, mobile responsiveness, Chrome extension popup

**Safety constraints:**
- Purely UI — must not touch API routes, auth, billing logic, or Supabase queries
- Any design changes still require `pnpm type-check` + `pnpm build` before commit
- Must not add new npm dependencies without explicit approval (check bundle size impact)

**Install when:** Starting any session focused on UI/UX improvements (homepage, dashboard, pricing, Chrome extension).

---

### 🔵 Recommended later: Agent-browser / browser automation MCP

**What it does:** Allows the AI agent to open a real browser, navigate pages, fill forms, and observe results — effectively an AI-driven E2E test runner.

**Why it fits CheckRay (eventually):**
- Sign-up → legal acceptance → dashboard → new case is a multi-step flow that is currently only covered by Playwright specs
- An agent-browser could click through deployed preview URLs to verify that fixes actually work end-to-end
- Useful for QA on the anonymous check flow, admin gating, and share links once the share page is fixed

**Why not now:**
- The Playwright smoke tests in `tests/e2e/` are not yet passing in CI (Supabase env issue — see audit)
- Must be sandboxed: it must only navigate to preview/local URLs, never to Supabase Studio, Stripe Dashboard, or Vercel
- Should never be given auth credentials for production accounts

**Preconditions before installing:**
1. Playwright CI smoke tests passing
2. `/share/[id]` rewritten for CheckRay cases
3. Explicit sandbox config: allowlist URLs only (localhost:3000, preview.checkray.app)

---

### 🔵 Recommended later: Perplexity / web-search MCP

**What it does:** Gives the AI agent access to real-time web search during development sessions.

**Why it fits CheckRay (eventually):**
- Scam intelligence research: looking up new scam patterns, checking known phishing domains, verifying whether reported patterns are current
- Could assist the `lib/scam-intelligence/` pipeline when building the weekly ScamWatch alert feature
- Useful for checking whether a new library dependency has known CVEs

**Why not now:**
- CheckRay is mid-MVP build; research tooling is premature
- Must be configured with a read-only API key that has no access to internal systems
- Must not be given CheckRay user data, case content, or any PII

**Preconditions before installing:**
1. ScamWatch / `lib/scam-intelligence/` pipeline is actively being built
2. Confirmed the MCP only has outbound web-search access (no inbound data writes)
3. Explicit policy: never pass submitted case content to web search

---

### 🔵 Recommended later: Zapier MCP

**What it does:** Connects Claude Code sessions to Zapier automations — can trigger workflows, send data to external services, schedule actions.

**Why it fits CheckRay (eventually):**
- Weekly ScamWatch digest email: could automate the pipeline from scam intel → email template → Resend send
- Support ticket routing: auto-assign new support tickets to the right queue
- Onboarding sequences: trigger post-signup welcome emails

**Why not now:**
- Core app is not yet stable (share page broken, legal acceptance not enforced)
- Zapier would receive data from CheckRay — must define exactly what data is shareable before enabling
- No Zapier account or automation infrastructure is set up yet
- Must never receive: user case content, risk reports, PII, Supabase row data

**Preconditions before installing:**
1. Core MVP flows are all stable (MVP_READY audit status)
2. Zapier integration scoped to non-PII events only (e.g. "new subscription created", "support ticket opened")
3. Webhook secrets configured and rotated

---

### Current decision

> **For now, use only:**
> 1. **Superpowers / dev-methodology** plugin — enforce workflow discipline
> 2. **Frontend-design skill** — UI consistency
>
> Everything else stays documented here as future. Do not install browser automation, web-search, or Zapier until the preconditions above are met.

---

## Safety rules for all plugins and MCP servers

These rules apply to every plugin or MCP server added to the CheckRay development workflow, regardless of category:

### Secrets
- **Never** pass `.env.local` contents to any plugin
- **Never** configure an MCP server with `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, or `RESEND_API_KEY`
- **Never** give a plugin access to Vercel project tokens, GitHub tokens with write access, or Supabase service role credentials
- If a plugin needs a key to function, create a **scoped, read-only** key specifically for it

### Deploy and git access
- **No plugin may deploy to Vercel** — not preview, not production
- **No plugin may push to `main`** directly
- **No plugin may run `vercel`, `vercel --prod`, `git push --force`**
- Plugin suggestions → local commit only → human review before push

### Code quality gates
Every code change suggested or generated by a plugin must pass before committing:
```bash
pnpm run type-check
pnpm run build
gitleaks detect --source .
```
If the change touches routes or the analyzer:
```bash
k6 run tests/load/public-routes.js
k6 run tests/load/analyze-fallback.js
```

### High-risk areas — mandatory reviewer prompt
If a plugin touches any of the following, run the Reviewer prompt from [AI_REVIEW_WORKFLOW.md](AI_REVIEW_WORKFLOW.md) before committing:
- `auth.ts`, `middleware.ts`, `lib/billing/access.ts`, `lib/billing/stripe.ts`
- Any `supabase/migrations/` file
- `app/api/analyze-case/route.ts` or `lib/checkmate.ts`
- Any Supabase RLS policy
- Any Stripe webhook or checkout session handler

### API schema
- If a plugin changes the shape of `/api/analyze-case` responses, update [SCHEMA_CONTRACTS.md](SCHEMA_CONTRACTS.md) and all k6/Playwright assertions before merging
- The `disclaimer` field must remain present and non-empty in all analyzer responses

### User data
- If a plugin reads, processes, or transmits user case content, support tickets, or risk reports to an external service, it requires explicit user consent and a privacy policy update
- No AI plugin may receive submitted case text, risk scores, or user identifiers without scoped, documented justification

---

## Other tooling decisions

*(Add additional tooling categories here as decisions are made — e.g. error monitoring, analytics, email provider, CDN, rate limiting infrastructure.)*
