# ShipGuard — Product Idea

**Status:** Idea / pre-validation. Do not build yet.
**Last updated:** May 2026
**Origin:** Extracted from the CheckRay build workflow — specifically the guardrail system in `AGENTS.md` and `docs/`.

---

## One-line pitch

> "AI checks the AI before you ship."

---

## Core promise

Before you commit, push, or deploy — get an AI second opinion on whether the change fits the whole app.

---

## The problem

AI coding tools (Copilot, Claude Code, Cursor, Windsurf) can generate working code fast. Too fast. The code passes a syntax check and a build. It looks right. But it:

- Silently breaks an RLS policy
- Adds a new API route with no auth check
- Hardcodes a secret that will end up in git history
- Drifts from a schema contract that three other routes depend on
- Adds a Stripe call that bypasses the existing billing gate
- Changes a critical flow that was never documented anywhere

Solo founders, non-technical founders, designers-turned-builders, and indie hackers don't have a senior engineer to catch these things. They have AI. And AI doesn't automatically know the whole app — it only knows what's in the context window.

The result: **vibe-coded debt that compounds silently until something breaks in production.**

---

## The solution

ShipGuard is a structured review layer that runs between "AI wrote the code" and "the code ships."

It gives every AI-generated change a second opinion against:
- The full app architecture
- Critical user flows
- Security boundaries
- Schema contracts
- Billing/auth gating rules
- Known secrets and env var usage patterns
- Pre-deploy smoke test requirements

In MVP form it's a set of repo templates, instruction files, and reviewer prompts. In SaaS form it's a GitHub app and CI integration.

---

## Working product names

| Name | Notes |
|---|---|
| **ShipGuard** | Clear, domain-safe, generic enough to expand |
| **CodeRay** | Parallel to CheckRay ("Ray checks your code"); could conflict with Ruby gem |
| **PromptGuard** | Emphasises the AI-prompt angle; slightly technical |
| **VibeCheck** | Casual, memeable, but low trust signal for a security tool |

**Preferred for now:** ShipGuard. Re-evaluate when validating with target users.

---

## Target users

- **Solo technical founders** — building SaaS with AI assistance, no team to review PRs
- **Non-technical founders** — using AI to build the whole product, limited ability to catch structural problems
- **Indie hackers** — shipping fast, often alone, need a repeatable safety net
- **Designers building SaaS** — increasingly using Cursor/Lovable/Bolt to produce working code, no eng background
- **AI-assisted builders** — vibe coders who know the risk but don't have a system
- **Agencies building client apps with AI** — need a defensible review process before client deploys

**Not the primary target (yet):** large engineering teams, enterprises, or projects with established CI/CD and code review culture. They already have systems. ShipGuard is for the people who don't.

---

## How CheckRay proved this works

CheckRay's `AGENTS.md` and `docs/` directory implement a version of ShipGuard manually:

| CheckRay file | ShipGuard equivalent |
|---|---|
| `AGENTS.md` | Repo instruction file — non-negotiable rules, env var table, reviewer prompt |
| `docs/ARCHITECTURE.md` | Architecture doc — stack, directory layout, DB tables, access tiers |
| `docs/CRITICAL_FLOWS.md` | Critical flow checklist — auth, billing, analyzer, share, admin |
| `docs/SECURITY_BOUNDARIES.md` | Security boundary checklist — which env vars go where, RLS rules, auth rules |
| `docs/SCHEMA_CONTRACTS.md` | Schema contract — stable API shapes, DB types, extension message schema |
| `docs/CHANGE_REVIEW_CHECKLIST.md` | Pre-commit checklist — scope, security, schema, scale, tests |
| `docs/AI_REVIEW_WORKFLOW.md` | Reviewer prompt system — Builder/Reviewer/Human 3-step loop |
| `docs/PRE_DEPLOY_CHECKLIST.md` | Pre-deploy checklist — env vars, migrations, smoke tests, Stripe, rollback |

The system works. It caught real issues during CheckRay development: an RLS policy that allowed user-initiated deletes, a Stripe webhook with unguarded null assertions, a legacy chatbot template route that accepted caller-supplied API keys. None of these were caught by `tsc` or the build. The guardrail docs caught them.

The insight: **this system should not have to be built from scratch for every product.** It should be a reusable, opinionated starting point.

---

## MVP — what to ship first

A **digital template product**: a structured set of files a founder drops into any repo that immediately gives them a working AI review system.

### What's included in the template

```
shipguard/
  AGENTS.md                     # Repo instruction file for AI coding agents
  docs/
    ARCHITECTURE.md             # Architecture doc template (fill in your stack)
    CRITICAL_FLOWS.md           # Critical flow checklist template
    SECURITY_BOUNDARIES.md      # Security boundary rules template
    SCHEMA_CONTRACTS.md         # API/DB schema contract template
    CHANGE_REVIEW_CHECKLIST.md  # Per-change review checklist
    AI_REVIEW_WORKFLOW.md       # Builder → Reviewer → Human workflow
    PRE_DEPLOY_CHECKLIST.md     # Pre-deploy gate template
    TOOLING_DECISIONS.md        # AI tool/plugin decision log
  prompts/
    reviewer.md                 # Reusable reviewer prompt (paste into Claude/Copilot)
    scope-check.md              # Did this change touch files it shouldn't have?
    security-check.md           # Auth, billing, RLS, env var audit prompt
    schema-check.md             # Did any API or DB shape change without updating contracts?
  scripts/
    pre-commit-check.sh         # Runs gitleaks + tsc + build before commit
  README.md                     # Setup instructions
```

### What it is NOT (MVP)

- Not a GitHub app
- Not a SaaS
- Not a CI bot
- Not automated — it's a human-in-the-loop system powered by prompts and checklists

### Tool recommendations bundled with MVP

| Tool | Purpose | Free? |
|---|---|---|
| gitleaks | Secret scanning pre-commit and CI | ✅ Free |
| k6 | Load test critical routes | ✅ Free |
| Sentry | Runtime error tracking | Free tier |
| Playwright | E2E smoke tests | ✅ Free |
| GitHub Actions | CI gate | Free for public repos |

---

## Future SaaS — what it becomes

### GitHub app

- Installs on a repo
- Reads the ShipGuard config files from the repo root
- On every PR: runs automated checks and posts a review comment

### PR review bot output (PASS / WARN / BLOCKED)

```
ShipGuard Review — PR #47: Add /api/admin/export route

BLOCKED
  ✗ New API route has no auth check (no session validation found)
  ✗ Route uses SUPABASE_SERVICE_ROLE_KEY — must not be reachable by non-admin users

WARN
  ⚠ New route not listed in CRITICAL_FLOWS.md — update docs before merging
  ⚠ No test found for /api/admin/export

PASS
  ✓ No secrets found in staged files (gitleaks clean)
  ✓ TypeScript: 0 errors
  ✓ No schema contracts modified

Recommendation: Fix the 2 blockers before merging. Auth check required on all
/api/admin/* routes per SECURITY_BOUNDARIES.md.
```

### Automated checks (SaaS)

| Check | Trigger | Status |
|---|---|---|
| Secret scan (gitleaks) | Every PR | BLOCKED if secrets found |
| TypeScript type check | Every PR | BLOCKED if errors |
| Auth gate presence | New API routes | BLOCKED if no session check |
| Env var usage | All files | WARN if `process.env.*` in client bundle |
| Schema drift | `SCHEMA_CONTRACTS.md` vs actual routes | WARN if response shape changed |
| Critical flow coverage | `CRITICAL_FLOWS.md` | WARN if changed file is in a critical flow with no test |
| Billing gate | Stripe/billing routes | BLOCKED if billing route bypasses auth |
| RLS policy check | Migration files | WARN if new `for all` policy without scope review |
| Scope creep | Files changed vs stated purpose | WARN if >3 unrelated files changed |

### CI integration

- GitHub Actions workflow included
- Status check blocks merge if BLOCKED
- WARN allows merge with acknowledgement

### AI-generated fix recommendations

When a check fails, ShipGuard generates a specific fix suggestion using the repo's own architecture docs as context — not generic advice.

---

## Pricing ideas

| Tier | Format | Price | Notes |
|---|---|---|---|
| Template | One-time digital download | **$29** | Gumroad or Lemon Squeezy. Files only, no SaaS. |
| Solo | Monthly SaaS | **$9/month** | 1 repo, GitHub app, automated PR checks |
| Founder | Monthly SaaS | **$29/month** | Up to 3 repos, priority support |
| Agency | Monthly SaaS | **$99/month** | Up to 10 repos, team access, white-label option |

**Validation order:**
1. Sell the $29 template first — validates willingness to pay with zero infrastructure
2. If 50+ sales, build the GitHub app for the $9/month tier
3. Agency tier only after solo SaaS is stable

---

## Positioning

### Primary

> "AI checks the AI before you ship."

### Secondary

> "A second opinion on every AI-generated change — before it breaks auth, billing, or your schema."

### For non-technical founders specifically

> "You're building with AI. ShipGuard makes sure the AI didn't break something it didn't know about."

### Tagline options

- "The review layer for AI-built software."
- "Catch what the build missed."
- "Ship faster. Ship safer. Ship with a guardrail."
- "Your AI wrote it. ShipGuard checks it."

---

## Relationship to CheckRay

| CheckRay | ShipGuard |
|---|---|
| Second opinion before risky digital decisions | Second opinion before risky AI-generated code changes |
| Protects people from scams | Protects founders from shipping broken code |
| End users (consumers) | Builders (developers, founders, agencies) |
| "Is this message a scam?" | "Is this change safe to ship?" |

Both products are in the same thematic family: **get a second opinion before you act.** CheckRay = before you click, pay, reply, or apply. ShipGuard = before you commit, push, or deploy.

If CheckRay reaches product-market fit, ShipGuard can be positioned as a sibling product from the same team — with credibility from having used the guardrail system to build CheckRay itself.

---

## Validation steps (do these before building anything)

1. **Post the concept** on X/Twitter, Indie Hackers, and relevant Discord communities. Measure engagement vs. CheckRay posts.
2. **Talk to 5 solo founders** who use Cursor/Claude Code/Copilot. Ask: "What's your current process for reviewing AI-generated code before you ship?" Listen for pain.
3. **Set up a waitlist page** (single static page, no backend). Target: 100 signups before writing code.
4. **Offer the $29 template** to 3 people you know who vibe-code. Get feedback on the format before selling publicly.
5. Only after validation: build the GitHub app.

---

## What NOT to do

- Do not build the GitHub app before validating demand
- Do not launch a SaaS before selling the template
- Do not position as enterprise security tooling — that market is saturated and slow
- Do not call it "linting" or "static analysis" — those words repel the non-technical target users
- Do not build this while CheckRay is pre-revenue — document only until CheckRay has paying users

---

## Open questions

- Is "ShipGuard" the right name? CodeRay is more thematically consistent with CheckRay but has namespace risk.
- Should this be a standalone brand or a CheckRay product extension?
- Is the $29 template the right first step, or is a free open-source version better for distribution?
- Who is the better first customer: solo technical founders (easier to sell to) or non-technical founders (bigger pain)?
- Does this need to be open-source to get traction, or is the template format enough?
