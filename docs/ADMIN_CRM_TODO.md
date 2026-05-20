# Admin CRM — TODO

> Future items for the CheckRay admin area. Not yet implemented.
> See also: `docs/ADMIN_CRM_TESTS.md` for existing admin test coverage.

---

## Call Ray — Future Admin Features

When the "Call Ray" phone support feature is built (see `docs/CALL_RAY_ROADMAP.md`),
the admin area should be extended to include:

### Call Ray Sessions View (`/admin/call-ray`)

- List all `call_ray_sessions` records
- Filter by: status, risk level, category, date range
- Search by: phone number (masked), provider call ID
- Show: risk score badge, category, contact preference, delivery status
- Link to: full transcript (if consent given), related cases record, admin review record

### Transcript Review Queue

- List sessions with `status = 'pending_review'`
- Show: transcript summary, risk score, red flags, recommended actions
- Actions: Approve (send summary), Reject (cancel delivery), Escalate
- Required for: all sessions with `risk_score >= 75` (Phase 2 and Phase 3)
- Auto-release timer option: auto-approve after N hours if no admin action (Phase 4)

### Failed Delivery Queue

- List `call_ray_messages` with `status = 'failed'`
- Show: channel (SMS/email), recipient (masked), error reason, session link
- Actions: Retry delivery, Mark as resolved, Contact user manually

### High-Risk Call Cases

- List sessions with `risk_level = 'very_high'`
- Show: situation summary, red flags, whether summary was sent
- Flag for: potential abuse, coordinated scam campaigns, repeat targets
- Option to: create a support ticket on behalf of the caller

### Follow-Up Needed

- List sessions where the user may need additional support:
  - `has_already_acted = true` (user already sent money or personal info)
  - `is_urgent = true`
  - `risk_level IN ('high', 'very_high')`
  - No linked user account (anonymous caller)
- Admin can mark as "followed up" or "no action needed"

---

## Other Admin TODO Items

- [ ] Bulk export of case data (CSV) for compliance reporting
- [ ] Admin audit log: who approved/rejected which call sessions
- [ ] Admin notification (email or Slack) for new high-risk sessions requiring review
- [ ] Data retention controls: trigger transcript deletion after N days per policy

---

*Last updated: 2026-05-20*
