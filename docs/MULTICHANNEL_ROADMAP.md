# CheckRay — Multichannel Roadmap

> This document tracks planned expansion of CheckRay beyond the web app.
> Current MVP: web app + Chrome extension.

---

## Channels

### ✅ Web App (Live)
Users paste or type a suspicious message, URL, or situation into the CheckRay analyzer and receive a risk readout.

### ✅ Chrome Extension MVP (Built — Not Yet Public)
CheckRay browser extension built with Plasmo. Users can highlight text on any page and check it with Ray without leaving the browser. See `docs/CHROME_EXTENSION_MVP.md`.

---

### 📞 Call Ray — Phone Support (Planned)

> **Not live. Phone number not yet provisioned. No provider dependency added.**

**Phone support for users who prefer to talk through a suspicious situation.**

Ray can summarize the call and send a text or email risk readout.

**Target users:**
- Elderly users and those who prefer voice over typing
- Family members helping parents navigate a possible scam
- People in urgent situations who need to describe what's happening out loud

**How it will work:**
1. User calls the CheckRay phone number
2. Ray listens and asks a few clarifying questions
3. Ray runs the CheckRay analyzer on the summary
4. Ray sends a written risk summary by text or email
5. Case is saved to the dashboard if the user is recognized or claims it later

**Current status:** Planning only. See `docs/CALL_RAY_ROADMAP.md` for the full phase breakdown.

**Homepage note:** *Phone support for scam situations — planned.*
Do not advertise as live until Phase 3 is complete.

---

### 📧 Email Forwarding (Future Idea)

Users forward a suspicious email to a CheckRay address and receive an automated risk analysis reply.

- No implementation planned yet
- Requires: inbound email parsing, spam handling, reply assembly
- Possible provider: Resend inbound (if supported), Mailgun, or Postmark inbound

---

### 💬 SMS Check (Future Idea)

Users text a suspicious message to a CheckRay number and receive a risk readout by reply.

- No implementation planned yet
- Closely related to Call Ray infrastructure (Twilio Messaging)
- Requires: TCPA compliance, consent at opt-in

---

### 🔌 API Access (Future — Developer Tier)

Expose the CheckRay analyzer as a public API for developers and businesses to integrate.

- Use cases: browser plugins, CRM integrations, HR software (job scam detection)
- Requires: API key management, rate limiting, billing integration

---

*Last updated: 2026-05-20*
