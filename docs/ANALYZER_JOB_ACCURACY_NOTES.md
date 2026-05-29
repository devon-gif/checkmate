# Analyzer Job Accuracy Notes

Why legitimate official job listings were being scored High/Critical, and the
guardrails that now prevent it. Read this before touching the job-scoring paths
in `lib/analyzer/risk-floors.ts`, `lib/analysis/fallback.ts`,
`lib/checkmate.ts`, or `lib/analyzer/ray-guidelines.ts`.

## The failure

Two legitimate test emails were misclassified:

- An official **OpenAI** careers listing → Critical (90/100), with invented red
  flags: "requests Social Security number", "moved conversation to messaging
  app", "banking information requested during hiring".
- An official **Anthropic** Greenhouse listing → High (75/100), with the
  invented flag "account or login verification pressure".

Both emails explicitly said the listing was on an official careers/ATS page and
that the employer does **not** ask for money, crypto, gift cards, Zelle, banking
info, SSN before offer, or WhatsApp/Telegram contact.

## Root cause

1. **Negated safety statements were read as active scam requests.** A sentence
   like "does not ask for banking info" or "never asks for money, fees, or
   gift cards" contains every scam keyword our patterns look for. Without
   negation handling, "banking info" → "banking information requested",
   "no WhatsApp" → "moved conversation to messaging app", "will never ask for
   money" → "requests money".

2. **Risk floors only ever RAISE the score, never lower it.** Both the AI path
   and the deterministic fallback flow through the same floor + finalize
   pipeline, and floors are a one-way ratchet. So once the AI (gpt-4o-mini)
   over-scored an official listing, nothing downstream could bring it back to
   Low. There was no positive-evidence path for "this is a real listing".

## The two distinctions that fix it

### Active request vs. mentioned scam term

Only flag a scam signal when the sender is **actually asking** the user to do
the risky thing — not when the text merely mentions or warns about it.

Should trigger risk (active request): "send a deposit", "pay for equipment",
"buy gift cards", "send crypto", "deposit this check", "wire the rest to our
vendor", "provide your SSN before the offer", "continue on WhatsApp", "pay to
unlock tasks", "pay to withdraw earnings".

Should NOT trigger risk (mention / negation / warning): "it does not ask for a
deposit", "no WhatsApp or Telegram", "the company warns recruiters will never
ask for money", "avoid anyone asking for banking info", "no SSN before offer".

### Negation handling

`buildNegationStrippedText()` in `risk-floors.ts` blanks negated scam phrases
before any floor pattern runs. It handles two shapes:

- Pass 1 — `[negation] ask/request/require for <list to end of sentence>`, so a
  whole comma/"or" list ("will never ask for money, fees, or banking info") is
  removed even though an inner item isn't individually negated.
- Pass 2 — `[negation] … <scam term> …` for shorter phrases ("no Zelle",
  "no pressure to move to WhatsApp", "never ask for your password").

It is deliberately targeted: only known scam terms are suppressed after a
negation word, so genuine signals that start with "no" ("no interview
required", "no experience needed") are preserved.

`fallback.ts` runs its `paymentSignals`, `jobSignals`, `billSignals`,
`rentalSignals`, `urgencySignals`, `emailSignals`, and the account-lock check
against the negation-stripped text so they can't fire on negated mentions.

## Official-listing positive evidence (Low-risk path)

`detectOfficialListing(text, urls)` recognizes:

- an official company careers page / careers site / job board / application
  form (via `officialListingPattern`), and
- reputable ATS hosts — Greenhouse, Lever, Ashby, Workday, SmartRecruiters,
  iCIMS, Taleo, Jobvite — matched in the text or a detected URL, and
- a company's own `/careers` or `/jobs` URL path.

A **negated** reference ("not on the official careers page", "can't find it on
their careers site") does NOT count as official-listing evidence — that is a
ghost-job signal instead.

`isOfficialListingSafe(text, urls, floor)` returns true when the submission is
an official listing AND `hasActiveScamRequest()` is false AND no medium+ floor
fired. When true, the score is capped into the Low band (≤ 24) and the invented
flags are replaced with a positive note. This cap is applied in BOTH:

- the deterministic fallback (`buildFallbackAnalysis`), and
- the AI path (`applyOfficialListingCap` in `finalizeWithFloors`, after floors)

so an AI over-score on a real listing is corrected even though floors can't
lower it.

Remote work alone, a high salary alone, and an ATS link alone are NOT red
flags. Legitimate, well-paid, remote roles exist. A Low result still gets a
"confirm the role and recruiter through the official careers page" step — Low
does not mean "safe".

## Ghost-job middle lane

A posting with ≥ 2 ghost-job signals (reposted for months, generic/boilerplate
copy, unverified recruiter, no hiring timeline, flooded with applicants, or
"not found on the official careers page") that makes **no** active scam request
is uncertain, not criminal. It floors to **Medium (45)**, category
`job_scam_or_ghost_job`, with a "verify before investing time" message —
never High/Critical.

## Preserved obvious-scam detection

These remain High/Critical and are covered by evals J-05 … J-07 plus the
existing A/B/H/I cases:

- equipment deposit before interview
- Zelle / Cash App / Venmo / wire / gift card / crypto payment request
- fake check to buy equipment; deposit check + send leftover funds back
- WhatsApp/Telegram/Signal + job offer + payment / task earnings
- pay to unlock tasks or withdraw earnings
- SSN / banking requested before a verified offer
- urgent reply pressure + payment or sensitive-info request
- brand impersonation + Telegram / crypto / fake platform

## False positives to avoid

- Do not output "requests SSN" unless the text says the sender asked for an SSN.
- Do not output "moved to messaging app" unless the sender asked to use
  WhatsApp/Telegram/Signal.
- Do not output "banking info requested" unless the sender asked for bank info.
- Do not convert anti-fraud warning language ("we will never ask for payment")
  into red flags — it is positive evidence of legitimacy.

## Tests

`scripts/run-analyzer-evals.ts` section **J** locks in the regression:

- J-01 OpenAI official listing → Low, ≤ 30, no invented SSN/banking/messaging/
  informal-payment flags
- J-02 Anthropic Greenhouse listing → Low, ≤ 30, no account/login/banking/money
  flags
- J-03 well-paid remote official/ATS listing → Low, ≤ 30
- J-04 ghost job → Medium / needs verification (35–65), not Critical
- J-05 equipment-deposit scam → very_high, ≥ 88
- J-06 fake-check scam → very_high, ≥ 88
- J-07 task scam (WhatsApp + USDT) → high/very_high, ≥ 88

Run with `pnpm run analyzer:eval` (offline, deterministic fallback only — never
calls OpenAI). All cases must pass before deploying.
