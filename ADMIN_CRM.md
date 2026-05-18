# Admin / CRM Foundation

## What was built

### Routes
| Route | Purpose |
|---|---|
| `/admin` | Overview stats: users, cases, checks/7d, open tickets, plan breakdown |
| `/admin/customers` | Searchable customer list with plan badge + case count |
| `/admin/customers/[id]` | Customer detail: account info, billing, recent cases, support tickets, internal notes |
| `/admin/tickets` | Support ticket queue with status filter tabs and inline status update |
| `/support` | Public support form (works logged in and out) |

### API Routes
| Route | Method | Purpose |
|---|---|---|
| `/api/support/submit` | POST | Submit a support ticket (public) |
| `/api/admin/tickets` | GET | List tickets (admin) |
| `/api/admin/tickets` | PATCH | Update ticket status (admin) |
| `/api/admin/notes` | POST | Add internal note on a user (admin) |

### DB Migration
`supabase/migrations/20260518120000_add_admin_crm_tables.sql`
- `admin_users` — future role-based access table
- `support_tickets` — user-submitted support requests
- `support_notes` — internal admin notes per user
- `admin_audit_logs` — admin action trail

All three admin tables have RLS set to deny public access (service role only).
`support_tickets` allows users to insert their own rows.

## How to become an admin

Add your email to `.env.local`:
```
ADMIN_EMAILS=you@yourdomain.com
```

Multiple admins:
```
ADMIN_EMAILS=alice@co.com,bob@co.com
```

`ADMIN_EMAILS` is **server-only** — never included in the client bundle.

## Apply the migration

```bash
supabase db push
# or
supabase migration up
```

## Security notes

- `/admin/*` is protected by middleware (requires auth session) AND by `requireAdmin()` in the layout (requires email in `ADMIN_EMAILS`)
- All admin DB operations use the service role key (server-only)
- No impersonation — read-only data access only in this iteration
- Admin audit logs table is in place for future write-action tracking

## Future work (not yet built)
- [ ] Bulk email / message to customer segment
- [ ] Impersonation (view-as-user) — carefully scoped
- [ ] Admin audit log viewer page
- [ ] Email notification on new support ticket
- [ ] Stripe refund / coupon actions via Stripe API
- [ ] Export customers to CSV
