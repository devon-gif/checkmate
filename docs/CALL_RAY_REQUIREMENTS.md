# Call Ray — Feature Requirements

> **Status: Planning only — no live calling implemented.**
> These requirements describe a future state. Nothing in this document is active.

---

## Target Audience

| User type | Why they'd call Ray |
|-----------|-------------------|
| Elderly users | Prefer voice; less comfortable with apps |
| Less tech-savvy users | Typing a description is a barrier |
| Family members helping parents | Quick triage while on the phone together |
| People in urgent scam situations | Faster to describe than to type |
| Users without smartphones | May use a landline |

---

## User Flow

1. **User calls** the CheckRay phone number.
2. **Ray greets** them with the standard opening script (see `lib/call-ray/prompts.ts`).
3. **Ray asks** "What happened?" and listens.
4. **Ray asks** up to 3 clarifying questions — only what is needed to categorize the situation.
5. **Ray asks** for contact method: "Would you like the summary by text or email?"
6. **Ray asks** for consent to keep a short summary of the call.
7. **Ray summarizes** what it heard: "Here's what I understood — [summary]. Does that sound right?"
8. **Ray runs** the CheckRay analyzer on the summarized transcript.
9. **Ray closes** with the standard closing script and disclaimer.
10. **Backend sends** the written summary by the chosen delivery method.
11. **Case is saved** to the dashboard:
    - Automatically if the phone number matches a known user
    - Or later if the user claims the case (e.g., by logging in and entering a reference code)
12. **High-risk cases** (score ≥ 75) include stronger warnings and are flagged for admin review.

---

## Call Data Model

Each call session should store the following. See `supabase/sql/call_ray_future_schema.sql` for the proposed table DDL.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid (nullable) | Linked if phone number matched a known user |
| `phone_number` | text (nullable) | Caller's number; may be withheld |
| `email` | text (nullable) | Collected during call if user prefers email |
| `contact_preference` | enum | `sms`, `email`, `both`, `unknown` |
| `status` | text | `new`, `processing`, `pending_review`, `sent`, `failed` |
| `transcript` | text (nullable) | Full call transcript (only if consent given) |
| `transcript_summary` | text (nullable) | Ray's compressed description of the situation |
| `category` | text (nullable) | CheckRay case category |
| `risk_score` | integer (nullable) | 0–100 |
| `risk_level` | text (nullable) | `low`, `medium`, `high`, `very_high` |
| `red_flags` | jsonb (nullable) | Array of identified red flags |
| `recommended_actions` | jsonb (nullable) | Array of recommended next steps |
| `safe_reply` | text (nullable) | Suggested safe response if relevant |
| `case_id` | uuid (nullable) | Linked `cases` record if one was created |
| `consent_to_transcribe` | boolean | Default false |
| `consent_to_receive_sms` | boolean | Default false |
| `consent_to_receive_email` | boolean | Default false |
| `provider` | text (nullable) | Voice provider used (`twilio`, `vapi`, `retell`, etc.) |
| `provider_call_id` | text (nullable) | Provider's call identifier |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

## Clarifying Questions (Maximum 3)

Ray should ask only what is necessary to categorize the situation. Examples:

| Category hint | Clarifying question |
|--------------|-------------------|
| Toll / bill | "Did the message say how much you owe, and did it ask you to click a link or call a number?" |
| Job offer | "Did they offer you a job and say they'd send you a check for equipment or supplies?" |
| Bank / account | "Did they say your account was locked and ask you to verify your information?" |
| Unknown sender | "Do you know who sent this message, or was it from an unknown number or address?" |
| General | "Did they ask you to send money, gift cards, or personal information?" |

---

## Delivery: SMS Summary Format

```
CheckRay Risk Summary
─────────────────────
Category: [category]
Risk: [risk_level] ([risk_score]/100)

Red flags:
• [flag 1]
• [flag 2]

What to do:
• [action 1]
• [action 2]

Ray can be wrong. Verify through official sources before sending money or personal info.
Reply STOP to opt out.
```

---

## Delivery: Email Summary Format

**Subject:** Your CheckRay risk summary — [category]

**Body:**
- Greeting
- Summary of what Ray heard
- Risk readout (level + score)
- Red flags list
- Recommended actions
- Safe reply (if relevant)
- Disclaimer paragraph
- Link to CheckRay dashboard (if user is recognized or claims case)
- Unsubscribe footer

---

## Provider Options and Tradeoffs

> **No provider has been chosen. Evaluate in Phase 2.**

| Provider | Voice | STT/Transcript | TTS (Ray's voice) | SMS | Notes |
|----------|-------|---------------|------------------|-----|-------|
| Twilio Voice | ✅ | Via Twilio or Deepgram | No (text only) | ✅ | Most mature; TCPA tooling; higher cost |
| Vapi | ✅ | ✅ Built-in | ✅ ElevenLabs / others | ❌ | Designed for AI voice agents; good dev UX |
| Retell AI | ✅ | ✅ Built-in | ✅ | ❌ | Similar to Vapi; competitive pricing |
| Bland AI | ✅ | ✅ Built-in | ✅ | ❌ | Outbound focus; inbound supported |
| OpenAI Realtime API | ✅ | ✅ Built-in | ✅ | ❌ | Low latency; requires own telephony layer |
| ElevenLabs | ❌ | ❌ | ✅ Best-in-class | ❌ | Voice only; combine with telephony layer |
| Twilio Messaging | ❌ | ❌ | ❌ | ✅ | Already familiar if using Twilio Voice |
| Resend | ❌ | ❌ | ❌ | ❌ email | Already used in CheckRay; free tier generous |

**Key decision factors:**
- TCPA compliance tooling (required for SMS to US users)
- Call recording consent handling
- Transcript quality for short, informal descriptions
- Cost per call minute
- Latency for conversational back-and-forth
- Ease of prompt injection / guardrails
- Sandbox/test mode availability

---

## Future API Routes (Stubs Only — Not Implemented)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/call-ray/webhook/voice` | POST | Receives inbound call event from voice provider |
| `/api/call-ray/webhook/transcript` | POST | Receives completed transcript from provider |
| `/api/call-ray/send-summary` | POST | Assembles and delivers the written summary |
| `/admin/call-ray` | GET | Admin view of call sessions and review queue |

> These routes do not exist yet. Do not implement provider webhooks until Phase 2 is approved.

---

## Consent Requirements

| Consent type | When collected | Required before |
|-------------|---------------|----------------|
| Consent to transcribe | During call, verbally | Storing any transcript text |
| Consent to receive SMS | During call, verbally | Sending any text message |
| Consent to receive email | During call, verbally | Sending any email |
| Consent to save case | Implied if user claims case | Linking session to dashboard |

**TCPA note:** US regulations require prior express consent before sending marketing or informational SMS to a mobile number. Legal review required before Phase 3.

---

## Non-Goals (Explicitly Out of Scope)

- Ray will not provide legal, financial, medical, or professional advice
- Ray will not confirm that something is definitely safe or definitely a scam
- Ray will not ask for or store passwords, SSNs, bank logins, or verification codes
- Ray will not initiate outbound calls (no cold-calling users)
- Ray will not make payments or take any action on behalf of the user
- Ray will not connect users to human support during the call (Phase 4+ consideration)

---

*Last updated: 2026-05-20 — Planning phase. No live calling implemented.*
