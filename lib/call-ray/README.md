# lib/call-ray — Developer Notes

> **Status: STUB — not wired into production. Planning phase only.**

This module contains TypeScript types and prompt constants for the future
"Call Ray" phone support feature. Nothing in this directory is imported by
any live production route.

---

## What's Here

| File | Purpose |
|------|---------|
| `types.ts` | TypeScript interfaces for sessions, messages, reviews, transcript summaries |
| `prompts.ts` | Opening/closing call scripts, clarifying questions, safety rules, system prompt fragment |

---

## What Call Ray Will Do (Future)

A user calls a CheckRay phone number and describes a suspicious situation in plain language.
Ray listens, asks a few clarifying questions, summarizes the situation, runs the CheckRay
risk analyzer, and sends the user a written risk summary by text or email.

See the full plan:
- [docs/CALL_RAY_ROADMAP.md](../../docs/CALL_RAY_ROADMAP.md) — phases and milestones
- [docs/CALL_RAY_REQUIREMENTS.md](../../docs/CALL_RAY_REQUIREMENTS.md) — user flow and data model
- [docs/CALL_RAY_SAFETY_POLICY.md](../../docs/CALL_RAY_SAFETY_POLICY.md) — what Ray must/must not do
- [supabase/sql/call_ray_future_schema.sql](../../supabase/sql/call_ray_future_schema.sql) — proposed database tables

---

## Integration Plan (Phase 2)

When a voice provider is chosen:

1. Add provider SDK to `package.json` (do not add until Phase 2 approved)
2. Create `app/api/call-ray/webhook/voice/route.ts` — receives inbound call
3. Create `app/api/call-ray/webhook/transcript/route.ts` — processes transcript
4. Create `app/api/call-ray/send-summary/route.ts` — assembles and sends summary
5. Wire `prompts.ts` into the voice agent system prompt
6. Wire `types.ts` into the database service layer
7. Use `validateRayReport` and `ensureDisclaimer` from `lib/checkray-core` for analysis output

---

## Safety Rules

All Call Ray code must comply with `docs/CALL_RAY_SAFETY_POLICY.md`.

Key rules enforced in this module:
- `CALL_RAY_SAFETY_RULES.prohibited_data_collection` — Ray never asks for sensitive info
- `CALL_RAY_SAFETY_RULES.prohibited_language` — Ray never claims certainty
- `CALL_RAY_SAFETY_RULES.disclaimer_required` — every summary uses `ensureDisclaimer()`
- `CALL_RAY_SAFETY_RULES.high_risk_review_threshold` — sessions scoring ≥ 75 need admin review

---

## Dependencies (Do Not Add Yet)

Provider SDKs to evaluate in Phase 2 (do NOT add to package.json until approved):

- `twilio` — Twilio Voice + Programmable Messaging
- `@vapi-ai/web` — Vapi voice agent
- `retell-sdk` — Retell AI
- `bland-ai` — Bland AI
- `openai` — already used; Realtime API for voice
- `elevenlabs` — ElevenLabs TTS

---

*Last updated: 2026-05-20*
