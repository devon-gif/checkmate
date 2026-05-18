# Ghost Jobs Intelligence Plan

## Purpose

CheckRay should help users review job posts, recruiter messages, and hiring links for possible ghost-job and employment-scam risk signals. The system should stay cautious: it can surface concerns, missing verification, and safer next steps, but it should not claim that a job is definitely fake or definitely real.

## Safe Wording Rules

Use:

- "possible ghost job"
- "risk signals"
- "could not verify"
- "verify through official company channels"
- "this does not prove the listing is fake"

Avoid:

- "fake job"
- "real job"
- "confirmed scam"
- "verified legitimate" unless a human-reviewed source and criteria support that exact claim

## Risk Signals

- Equipment check, deposit, overpayment, wire transfer, or "send money back" language.
- Remote role combined with money movement or equipment-purchase instructions.
- Vague company details, generic HR identity, or no company domain.
- Recruiter email that does not match the claimed company domain.
- Urgent hiring language or no interview required.
- Unrealistic salary for vague or entry-level work.
- No clear hiring process or timeline.
- Generic, template-like job description.
- Suspicious URL or domain mismatch.
- Role appears only on a third-party board and not on an official company career page.
- Old, stale, or frequently reposted listing.

## What Counts As Evidence

- A matching role on an official company career page.
- A matching role on a public ATS board such as Greenhouse, Lever, Ashby, or permitted Workday pages.
- A stable source URL, job ID, title, company, location, and current status.
- Historical snapshots showing role status, description hash, and changes over time.
- User-submitted reports, treated only as soft signals.
- Manual review notes from a curated source list.

## What Does Not Count As Proof

- A reposted or old role by itself.
- A vague job description by itself.
- A missing third-party listing by itself.
- One user report by itself.
- A low automated risk score.
- A high automated risk score without source verification.

## Data Source Plan

Start with safe and permitted sources:

- Official company career pages.
- Public Greenhouse job boards.
- Public Lever job boards.
- Public Ashby job boards.
- Public Workday career pages where permitted.
- User-submitted reports.
- Manually reviewed source lists.

Avoid or treat carefully:

- LinkedIn.
- Indeed.
- Glassdoor.
- ZipRecruiter.
- Any site where scraping violates terms.

## Daily Crawl Plan For Later

- Start with a curated list of company ATS board URLs.
- Fetch once daily.
- Store job ID, title, company, location, posted_at, URL, description_hash, and status.
- Detect reposts and stale roles.
- Compare third-party pages to official company career pages where permitted.
- Log changes over time.
- Never claim fake based only on age or repost status.
- Use human and user reports as soft signals only.

Do not add background jobs, cron, scraping dependencies, Playwright, or Puppeteer until source permissions, rate limits, and storage requirements are clear.

## Database Planning Only

Proposed tables for a future migration:

```sql
create table ghost_job_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  label text not null,
  url text,
  permission_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ghost_job_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references ghost_job_sources(id),
  external_job_id text,
  title text not null,
  company text,
  location text,
  posted_at timestamptz,
  job_url text not null,
  description_hash text,
  status text not null,
  fetched_at timestamptz not null default now()
);

create table ghost_job_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  job_url text,
  company text,
  title text,
  report_text text,
  signal_tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table ghost_job_scores (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references ghost_job_reports(id),
  score integer not null,
  risk_level text not null,
  signals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
```

## Legal And Safety Caveats

- Respect site terms, robots guidance, rate limits, and API policies.
- Prefer official company and ATS sources over third-party job boards.
- Do not scrape LinkedIn, Indeed, Glassdoor, ZipRecruiter, or similar boards at scale unless there is a permitted API or clear public permission.
- Do not store unnecessary personal data from recruiter messages or job applicants.
- Use automated scoring as triage, not a final truth claim.

## Extension Roadmap

- Add build tooling for the CheckRay Browser Extension.
- Read current page URL and selected text with explicit user action.
- Let users paste a job post, link, email, or recruiter message.
- Send user-provided context to a CheckRay API endpoint.
- Show risk score, risk level, common red flags, and safer next steps.
- Include "Open full report" when a full dashboard report exists.
- Save reports to the dashboard only when the user is logged in and consent/UX is clear.

