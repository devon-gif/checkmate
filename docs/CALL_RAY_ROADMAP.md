# Call Ray — Feature Roadmap

> **Status: Planning only — no live calling implemented.**
> This document describes a future feature. No phone provider has been provisioned.
> No Twilio, Vapi, Retell, Bland, or ElevenLabs dependency has been added.

---

## Overview

"Call Ray" is a future CheckRay feature that lets users call Ray by phone, describe a suspicious situation in plain language, and receive a written risk summary by text or email. The feature targets elderly users, less tech-savvy users, and anyone in an urgent scam situation who prefers speaking over typing.

**Current MVP flows are unchanged. This roadmap is forward-looking only.**

---

## Phase 1 — Planning (current)

**Goal:** Document everything. Build nothing live.

- [x] Document call flow and user journey
- [x] Document proposed database tables
- [x] Document provider options and tradeoffs
- [x] Document safety rules and Ray's required language
- [x] Write opening/closing call scripts
- [x] Write clarifying question templates
- [ ] Legal/compliance review of call recording consent requirements by jurisdiction
- [ ] Confirm TCPA/GDPR implications for SMS summaries
- [ ] Decide on provider shortlist (see CALL_RAY_REQUIREMENTS.md)
- [ ] Security review: transcript storage, PII handling, retention policy

**No live calling. No phone number purchased. No provider keys added.**

---

## Phase 2 — Internal Prototype

**Goal:** Receive a real call in a sandbox, run the analyzer, see a case record, send a test email.

- [ ] Choose voice provider (sandbox/test mode only)
- [ ] Stand up `/api/call-ray/webhook/voice` — receives call transcript from provider
- [ ] Stand up `/api/call-ray/webhook/transcript` — processes completed transcript
- [ ] Stand up `/api/call-ray/send-summary` — sends email only (no SMS yet)
- [ ] Run CheckRay analyzer on transcript summary
- [ ] Create `call_ray_sessions` record in database
- [ ] Admin review required before any message is sent
- [ ] Test email delivery only — no real SMS
- [ ] Hardcode test phone numbers only — no public access

**Milestone:** Internal team member calls the test number, gets an email summary, case appears in admin queue.

---

## Phase 3 — Beta

**Goal:** Real phone number, real users (opt-in), full summary delivery.

- [ ] Provision dedicated CheckRay phone number via chosen provider
- [ ] Obtain call recording / transcription consent at call start
- [ ] Save transcript with consent flag
- [ ] Send SMS and/or email summary based on user preference
- [ ] Save case to dashboard if user is recognized (by phone number or claimed later)
- [ ] Support/admin review queue for high-risk sessions
- [ ] Rate limiting: max calls per number per day
- [ ] Abuse prevention: block known spam numbers
- [ ] Beta access: invite-only or waitlist

**Milestone:** 10–50 real users can call Ray and receive a written summary.

---

## Phase 4 — Production

**Goal:** Public availability, full safety controls, billing integration.

- [ ] Public phone number (possibly per-region)
- [ ] Per-user and per-number rate limits
- [ ] Fraud and abuse prevention (repeat callers, spoofed numbers)
- [ ] Billing integration: call minutes, summary delivery tied to plan
- [ ] Family / trusted contact support (send summary to a secondary contact)
- [ ] Emergency escalation disclaimer: "If you feel in immediate danger, contact emergency services"
- [ ] Human support escalation for very high-risk cases
- [ ] Multi-language support (future)
- [ ] Accessibility review (elderly users, cognitive accessibility)
- [ ] Retention policy: auto-delete transcripts after N days unless user saves case

**Milestone:** Call Ray listed as a public CheckRay feature on the marketing site.

---

## Call Flow (Future Design)

```
User calls CheckRay number
  └── Ray greets: "Hi, this is Ray from CheckRay. I can help you take a second look
      at a possible scam, suspicious message, bill, job offer, or link. What happened?"

Ray listens → asks up to 3 clarifying questions

Ray asks: "Would you like the summary by text or email?"
  └── Collects contact info (phone or email)

Ray asks: "Is it okay if I keep a short summary of this call to help analyze it?"
  └── Records consent_to_transcribe

Ray summarizes: "Here's what I heard: [summary]. Does that sound right?"

Ray closes: "Thanks for explaining that. I'm going to send you a written summary
with the main red flags, what to verify, and what not to do next. Remember, Ray
can be wrong, so always verify through official sources before sending money or
personal information."

─────────────────────────────────────────
BACKEND (async after call ends)
─────────────────────────────────────────
Transcript → CheckRay analyzer
Analyzer output → call_ray_sessions record
Summary message assembled → call_ray_messages record
If admin review not required → delivery (SMS/email)
If high-risk → route to admin review queue
```

---

## Provider Options (Evaluate in Phase 2)

See CALL_RAY_REQUIREMENTS.md for full tradeoff table.

Shortlist to evaluate:
- Twilio Voice + Programmable Messaging
- Vapi
- Retell AI
- Bland AI
- OpenAI Realtime API (for voice turn-taking)
- ElevenLabs (for Ray's voice)
- Resend (for email summaries — already used in app)

**Decision deferred. No provider chosen yet.**

---

## Safety Rules

See CALL_RAY_SAFETY_POLICY.md for the full policy.

Key rules:
- Ray must not claim certainty ("this is definitely a scam" or "this is definitely safe")
- Ray must use cautious language: "possible scam," "risk signals," "verify through official channels"
- Ray must never ask for passwords, SSNs, bank logins, or verification codes
- Every summary must include the standard disclaimer
- High-risk cases (score ≥ 75) must include stronger warnings and admin review flag

---

## Related Files

| File | Purpose |
|------|---------|
| `docs/CALL_RAY_REQUIREMENTS.md` | User flow, data model, provider tradeoffs |
| `docs/CALL_RAY_SAFETY_POLICY.md` | Ray's required and prohibited language |
| `supabase/sql/call_ray_future_schema.sql` | Proposed database tables (not yet migrated) |
| `lib/call-ray/types.ts` | TypeScript type stubs |
| `lib/call-ray/prompts.ts` | Call scripts and safety rule exports |
| `lib/call-ray/README.md` | Developer notes for the call-ray module |

---

*Last updated: 2026-05-20 — Planning phase. No live calling implemented.*
