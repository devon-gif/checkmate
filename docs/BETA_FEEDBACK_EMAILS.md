# BETA_FEEDBACK_EMAILS.md — Templates for collecting beta tester feedback

Use these templates to follow up with early beta testers after they have used
CheckRay at least once. The goal is to learn what Ray got right, what it missed,
where the UI was confusing, and what would make them pay for it.

Do **not** send these on day one. Wait until the tester has had at least one
real experience forwarding a message to Ray.

---

## 1 — Short DM follow-up (iMessage / Slack / Twitter / Instagram)

Send 24–48 hours after the tester's first Ray analysis, or after you see a case
appear in Supabase.

> **Template:**
>
> Hey [name]! Quick check-in — did you get a chance to try CheckRay yet? Would
> love to hear if the result felt accurate or if Ray missed something. Even just
> "it was right" or "it was off" would help me a lot. No pressure at all.

**Customise for:**
- If they haven't used it yet: swap in "I saw you signed up — did you have a
  chance to forward anything to Ray?"
- If you know what message they sent: "I saw you forwarded something — did Ray's
  answer match your gut feeling?"

**Timing rule:** Don't send if it's been less than 2 hours since their first case.
Give them time to read the result and form an opinion.

---

## 2 — Longer email follow-up

Send 3–7 days after the tester's first case, once they've had more time to form
an overall impression. Send as plain text — avoid HTML formatting so it reads as
a personal message, not a newsletter.

---

**Subject:** Quick feedback on CheckRay (7 questions, 5 min)

**Body:**

> Hey [name],
>
> Thanks for being an early tester of CheckRay. I'm still in beta and every bit
> of feedback shapes what I build next. If you have 5 minutes, I'd love to hear
> your honest take.
>
> Feel free to answer as many or as few of these as you have time for — even
> one answer is useful.
>
> ---
>
> **1. Did Ray's risk level feel accurate?**
> (e.g., "It said high risk and it was definitely a scam" or "It said medium but
> I think it was totally fine")
>
> **2. Did Ray miss any red flags you noticed?**
> If yes, what were they?
>
> **3. Did Ray overreact to something that wasn't actually suspicious?**
> What was the message about, and what made it feel like a false alarm?
>
> **4. Was the "safer next step" advice clear and relevant?**
> Did you know what to do after reading it?
>
> **5. Did the dashboard and saved cases work as expected?**
> Any confusion finding your case history, sharing a report, or understanding
> the breakdown?
>
> **6. Would you forward something to Ray again if you got another suspicious
> message?**
> Yes / maybe / no — and why?
>
> **7. What would make CheckRay worth paying $8–12/month for?**
> (Be honest — "nothing" is a valid answer and just as useful as a yes.)
>
> **8. Anything else confusing, broken, or annoying?**
> Signup flow, the email reply, the report layout, anything.
>
> ---
>
> No need to answer in order or write in full sentences — bullet points are
> totally fine.
>
> Thanks again. This really does help.
>
> Devon

---

**Notes on this email:**
- Replace [name] with the tester's first name every time — don't send a generic
  version.
- Keep question 7 in there even if it feels awkward. It's the most important
  one for deciding whether to build a paid tier.
- If you know what message they forwarded to Ray, add a line before question 1:
  "You forwarded [describe message briefly] — I'm referring to that one."
- Do not include a survey link or form. Plain-text email replies are more
  personal and yield longer, more useful responses.

---

## 3 — Follow-up if they haven't tried Ray yet (7-day nudge)

If the tester signed up but no case appears in Supabase after 7 days:

**DM version:**

> Hey [name]! I noticed you signed up for CheckRay but haven't forwarded anything
> to Ray yet. That's totally fine — just wanted to make sure you got the welcome
> email and knew how it worked. If you want, I can send you a quick walkthrough.
> Or if you'd rather wait until you get a suspicious message, that works too!

**Follow-up DM if still no case after 14 days:**

> Hey, no pressure at all — just closing the loop. If CheckRay didn't seem useful
> or the signup was confusing, I'd genuinely love to know. Happy to walk you
> through it or just remove you from the list if it's not the right time. Either
> is fine!

---

## 4 — Thank-you message after feedback received

Send within 24 hours of receiving their reply. Keep it short.

> Thanks so much for taking the time — this is genuinely useful. [Acknowledge
> one specific thing they said.] I'll be in touch if I have follow-up questions
> as I build the next version.

---

## 5 — Question bank (bonus questions for follow-up conversations)

If the tester is engaged and willing to chat further, use these as prompts for a
15-minute voice/video call or a longer async thread:

- "When you first saw the risk score, did you trust it immediately or did you
  second-guess it?"
- "Did you feel like you understood *why* Ray reached that conclusion, or did
  it feel like a black box?"
- "Did you share the report link with anyone else (a family member, friend)?"
- "How do you usually handle suspicious messages today — do you Google them,
  ask someone, or just ignore them?"
- "Is there anyone in your life you'd want to forward CheckRay to? Who and why?"
- "If Ray said 'this looks safe' and you later found out it was a scam, how would
  that affect your trust in the product?"
- "What's the one thing that would make you open the Ray email faster when you
  get a result?"

---

## 6 — How to record responses

Create a row in a local spreadsheet or Notion table with these columns:

| Field | Notes |
|---|---|
| Tester name | First name only |
| Date of first case | From Supabase `cases.created_at` |
| DM sent date | |
| DM reply: accurate? | Yes / No / Partial / No response |
| Email sent date | |
| Q1 accuracy | Their words |
| Q2 missed flags | Their words |
| Q3 false alarm | Their words |
| Q4 next step clarity | Their words |
| Q5 dashboard feedback | Their words |
| Q6 would use again | Yes / Maybe / No |
| Q7 would pay | Yes / Maybe / No + notes |
| Q8 bugs/confusion | Their words |
| Net sentiment | Positive / Neutral / Negative |
| Action taken | e.g., filed bug, added eval case, noted UX gap |

Review the response table after every 3–5 new testers to spot patterns before
making product changes.

---

## 7 — Cadence guidance

| Tester activity | When to send |
|---|---|
| Signed up, no case yet | 7-day nudge DM |
| First case complete | 24–48h: short DM follow-up |
| 3+ cases in dashboard | 3–7 days after signup: long email |
| Highly engaged (5+ cases) | Invite to 15-min call |
| No response after 2 DMs | Stop; remove from active list |
| Gave negative feedback | Respond within 24h; dig in |

Do not send the long email and the DM on the same day. Stagger them by at least
24 hours.

---

## 8 — Reference: what to look for in Supabase before reaching out

Before sending any follow-up, check these tables to personalise your message:

```sql
-- How many cases has this user submitted?
SELECT COUNT(*) FROM cases WHERE user_id = '<uid>';

-- What risk levels did Ray return?
SELECT risk_level, created_at FROM cases WHERE user_id = '<uid>' ORDER BY created_at;

-- Did they click a feedback button in a Ray email?
SELECT value, source FROM case_feedback WHERE email = '<email>' ORDER BY created_at;
```

If they submitted a `case_feedback` row with `value = 'negative'`, prioritise
them for follow-up — they may have caught an error worth fixing.
