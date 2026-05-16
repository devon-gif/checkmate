# Ray's Weekly Scam Watch — Email Template

**File:** `lib/notifications/templates.ts` contains the full HTML + plain-text template.

---

## Subject

```
Ray's Weekly Scam Watch
```

## Preview text

```
Common scams and red flags to watch for this week.
```

---

## Email body (plain text)

```
Ray's Weekly Scam Watch
Common scams and red flags to watch for this week.

Hi,

Here are a few scam patterns Ray is watching this week:

1. Fake remote job checks
   Be careful with job offers that send a check for equipment and ask you to send
   money back. The check will bounce — and you will owe the full amount.

2. Toll or delivery payment links
   Watch for "final notice" texts that pressure you to pay through an unfamiliar
   link. Real toll agencies and couriers will never ask for card details via text.

3. Suspicious bills or fees
   Ask for itemization, written policy, and official payment channels before paying
   unexpected charges. Legitimate companies are happy to provide all three.

Ray's quick rule:
Before you click, pay, or reply — check it first.

Try a free check:
[Check with Ray] → https://checkray.app/cases/new

---
Ray can be wrong. Results are informational only. Always verify through official sources.

Unsubscribe: [unsubscribe link]
```

---

## Design notes

- Background: `#0d0d0d`
- Card background: `#141414` with `border: 1px solid rgba(255,255,255,0.08)`
- Accent color: `#4ade80` (cm-green)
- Body text: `rgba(255,255,255,0.6)`
- Muted text: `rgba(255,255,255,0.3)`
- CTA button: `linear-gradient(135deg,#22c55e,#16a34a)` with white text

---

## Content guidelines

- **Three tips per edition** — not more, not fewer.
- Keep each tip to 2–3 sentences.
- Never name specific businesses or individuals.
- End every edition with "Ray's quick rule."
- Always include disclaimer and unsubscribe link.
- Never claim certainty — use "may", "watch for", "be careful".

---

## Unsubscribe handling

- One-click unsubscribe link in every email.
- On click: `POST /api/notifications/unsubscribe?token=<token>` → sets `weekly_email_enabled=false` and `unsubscribed_at=now()`.
- Unsubscribe tokens are not yet implemented — see `NOTIFICATIONS_TODO.md`.
```
