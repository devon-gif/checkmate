# Admin / CRM — Future Work

This file tracks all admin and customer management features that are explicitly
deferred from the MVP. Do not build these until the core product is stable.

---

## User Management

- [ ] View all users (paginated table: email, signed up, plan, status)
- [ ] Search users by email or user ID
- [ ] View individual user profile: cases, checks, billing status
- [ ] Manually grant free checks or extend trial
- [ ] Flag / suspend abusive users
- [ ] Delete user and all their data (GDPR)

---

## Case & Check Management

- [ ] View all cases across all users
- [ ] Filter cases by risk level, category, date
- [ ] View individual case with full risk report
- [ ] Mark cases as reviewed / false positive
- [ ] Bulk export cases as CSV

---

## Billing Management

- [ ] View all subscriptions and their status
- [ ] See MRR / churn at a glance
- [ ] Deep-link to Stripe customer in Stripe Dashboard
- [ ] Issue refunds (currently handled manually in Stripe Dashboard)
- [ ] Manually activate / deactivate a subscription
- [ ] View Stripe webhook event log

---

## Support

- [ ] Add Crisp or Tawk.to chat script for live support
  - TODO: Add Crisp `<script>` tag to layout.tsx once account is created
  - Crisp: https://crisp.chat
  - Tawk.to: https://tawk.to
- [ ] Support notes per user (internal only)
- [ ] Ticket / email thread view
- [ ] Link support conversation to user account

---

## Abuse / Safety

- [ ] Abuse flags on cases (automated or manual)
- [ ] Rate limit overrides per user
- [ ] IP / device fingerprint blocking
- [ ] Daily summary of high-risk checks (email digest)

---

## Analytics

- [ ] Total checks per day chart
- [ ] Trial-to-paid conversion rate
- [ ] Most common categories (scam text, phishing URL, etc.)
- [ ] Avg risk score over time
- [ ] Cohort retention: % of trial users who subscribe

---

## Access Control

- [ ] Admin-only route prefix (`/admin/**`) protected by role check
- [ ] `is_admin` boolean on `users` table
- [ ] Middleware: block non-admins from `/admin/**`
- [ ] Audit log: who did what and when

---

## Family / Team Plans (post-MVP)

- [ ] Invite family members to a shared plan
- [ ] Per-seat billing
- [ ] Shared case history view (opt-in)
- [ ] Parent / guardian mode

---

## SMS & Email Forwarding (post-MVP)

- [ ] Dedicated CheckRay phone number per user
- [ ] Forward suspicious texts directly to Ray
- [ ] Email alias (e.g., check@checkray.com) for forwarding scam emails
- [ ] Auto-analyze forwarded messages and reply with risk summary

---

> Current MVP: anonymous 1-check limit, 7-day trial, Stripe Pro subscription.
> Refunds handled manually in the Stripe Dashboard.
