# docs/AI_REVIEW_WORKFLOW.md — How to Use AI Agents Safely on CheckRay

This document defines the three-step process for using AI coding agents (GitHub Copilot, Claude, Cursor, etc.) to build and review changes to CheckRay.

---

## The three roles

| Role | Who | Responsibility |
|---|---|---|
| **Builder** | AI agent | Implements the requested change, runs tests, summarizes what changed |
| **Reviewer** | AI agent (separate session or prompt) | Reviews the diff as a senior engineer — finds bugs, risks, broken flows |
| **Human** | You | Reads the summary, spot-checks the app, decides whether to commit/push/deploy |

Never skip the Reviewer step for changes that touch auth, billing, the analyzer, database schema, or security-sensitive code.

---

## Step 1 — Builder prompt

When asking an AI agent to implement a change, give it this structure:

```
Context: [What area of the app you're working on]
Task: [The specific change to make — be narrow]
Constraints:
- Do not change anything outside the scope of this task
- Do not modify auth, billing, or database schema unless explicitly required
- Run pnpm type-check and pnpm build before finishing
- Summarize: what files changed, what was added/removed, and what could break
Files to focus on: [list specific files if known]
```

**Builder rules:**
- One task per session — don't bundle unrelated changes
- After making changes, always run `pnpm type-check` and `pnpm build`
- Always output a summary of: files changed, what was added, what was removed, what could break
- Never auto-push to main — leave commits for human review

---

## Step 2 — Reviewer prompt

After the Builder finishes, open a new AI session (or use a fresh context window) and use this prompt:

---

```
You are a senior engineer reviewing a change to CheckRay, an AI-powered scam detection web app.

Review the latest changes (diff or summary provided below) and check the following:

1. ARCHITECTURE — Does this preserve the patterns in docs/ARCHITECTURE.md? (Next.js App Router, server-only files, Supabase auth pattern, env var boundaries)

2. CRITICAL FLOWS — Does this change break any flow in docs/CRITICAL_FLOWS.md? (Homepage, sign-up, sign-in, dashboard, analyzer, case detail, admin gating, Stripe webhook)

3. SECURITY — Does this violate docs/SECURITY_BOUNDARIES.md? (Server-only secrets in client code? RLS missing? Service role key exposed? PII in logs? Admin routes unprotected?)

4. SCHEMA CONTRACTS — Does this change the /api/analyze-case response shape or any Supabase table shape in docs/SCHEMA_CONTRACTS.md without updating tests and consumers?

5. SCALE AND COST — Does this add unbounded DB queries, bypass rate limits, or increase OpenAI/Stripe call volume without controls?

6. TESTS — Do the type-check, build, gitleaks, k6, and Playwright tests still pass?

For each section: state GREEN (no issues), YELLOW (minor concern, note it), or RED (blocker — must fix before merge).

At the end, give a one-line overall verdict: SAFE TO MERGE / NEEDS FIXES / DO NOT MERGE.

Do not make new feature changes. Do not rewrite working code. Only identify issues.

--- DIFF / SUMMARY ---
[paste diff or builder summary here]
```

---

## Step 3 — Human approval

After the Reviewer finishes:

1. Read the Reviewer summary — look for any RED items
2. Open the app locally and manually verify the critical flows relevant to this change
3. Check the browser console for new errors
4. Check Sentry (if available) for new error clusters
5. Decide:
   - **All GREEN** → safe to commit and push to preview
   - **YELLOW items** → use judgment — minor notes are acceptable if you understand the risk
   - **Any RED** → fix before merging; do not override a RED blocker

**Never push to production without completing the [PRE_DEPLOY_CHECKLIST.md](PRE_DEPLOY_CHECKLIST.md).**

---

## Common mistakes to avoid

| Mistake | What goes wrong |
|---|---|
| Asking AI to "just fix it quickly" on auth code | Introduces subtle session bugs that are hard to reproduce |
| Skipping the Reviewer step for "small" changes | Small changes to middleware or env handling can break the whole app |
| Letting AI agent auto-push to main | Bypasses human review; risky for production |
| Giving AI agent too broad a scope | Agent modifies unrelated files, introduces unexpected regressions |
| Trusting AI output without running tests | Type errors and broken builds go undetected |
| Not reading the AGENTS.md before starting a session | Agent doesn't know the project rules and makes incorrect assumptions |

---

## Quick reference

| Document | Purpose |
|---|---|
| [AGENTS.md](../AGENTS.md) | Master rules for AI agents — read first |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System map — what exists and why |
| [CRITICAL_FLOWS.md](CRITICAL_FLOWS.md) | What must never break |
| [SECURITY_BOUNDARIES.md](SECURITY_BOUNDARIES.md) | Hard security rules |
| [SCHEMA_CONTRACTS.md](SCHEMA_CONTRACTS.md) | Stable API and data shapes |
| [CHANGE_REVIEW_CHECKLIST.md](CHANGE_REVIEW_CHECKLIST.md) | Pre-merge checklist |
| [PRE_DEPLOY_CHECKLIST.md](PRE_DEPLOY_CHECKLIST.md) | Before any production deploy |
