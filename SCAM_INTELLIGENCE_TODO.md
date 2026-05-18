# Scam Intelligence Feed — TODO & Operating Notes

This is CheckRay's **internal** scam-intelligence pipeline. It is an editorial /
research tool, not a verdict engine. It is **not** wired into the analyzer's
scoring and must never claim that any specific message is "confirmed fake" or
"verified scam".

## How to run the local crawler

```bash
npm run scam:intel
```

The script fetches a small set of trusted public scam-alert sources, normalizes
them into `ScamIntelItem` records, deduplicates by URL + title, prints a
terminal digest, and writes JSON snapshots to:

- `data/scam-intel/latest.json`
- `data/scam-intel/YYYY-MM-DD.json`

Both files are git-ignored.

## Sources included (allow list)

| ID | Name | Trust | Why included |
|---|---|---|---|
| `ftc_consumer_alerts` | FTC Consumer Alerts | high | Official US Federal Trade Commission consumer protection alerts. RSS available. |
| `fbi_ic3_psa` | FBI IC3 Public Service Announcements | high | FBI Internet Crime Complaint Center PSAs. HTML index page parsed conservatively. |
| `cisa_advisories` | CISA Cybersecurity Advisories | high | US Cybersecurity & Infrastructure Security Agency advisories. RSS available. Cyber-focused context. |
| `bbb_scam_tracker` | BBB Scam Tracker | medium | Crowd-reported BBB tracker. Trend signal only. Page is client-rendered so we may parse 0 items via plain HTTP — that's expected, not an error. |

## Sources intentionally excluded

- **LinkedIn, Indeed, Glassdoor, ZipRecruiter, monster.com, and any other
  commercial job board.** Their ToS does not allow research scraping and we
  have no business need to mirror their listings.
- **Reddit, X (Twitter), TikTok, Facebook, Instagram, etc.** Rate-limited,
  ToS-sensitive, and content is user-generated rather than a vetted public
  alert.
- **Anything behind a paywall, login wall, or CAPTCHA.** We do not bypass
  authentication or anti-bot challenges.

## Crawl posture

- One sequential fetch per source per run — no parallel hammering.
- 15s timeout per request, no retries.
- One clear User-Agent: `CheckRay MVP research crawler - contact: support@checkray.app`.
- Respect `robots.txt` — only the public alert landing pages and RSS feeds
  above are fetched, and all are explicitly published for the general public.
- No Playwright, no Puppeteer, no headless Chromium.
- No JavaScript execution. Pure `fetch` + lightweight regex / DOM-safe text
  parsing.
- If a source fails, log a warning and continue the others. The script
  exit code remains 0 on partial failure.

## How results are used for "Weekly Scam Watch"

1. A human reviewer reads `data/scam-intel/latest.json` (or the dated file).
2. They pick 3–6 items that are timely, broadly relevant, and well-sourced.
3. They re-phrase each into CheckRay's cautious voice — examples:
   - "Reported scam pattern: …"
   - "Public alert from the FTC: …"
   - "Risk signal trending this week: …"
4. They draft a short blog post / email digest, link back to the original
   source for every item, and ship it.
5. **No emails are auto-sent.** Human review is required before any outbound
   send.

## Hard constraints (must remain true)

- Output is **intelligence only**. The analyzer's scoring is **never**
  auto-updated from crawled content.
- We **never** label a specific user-submitted message as "confirmed fake" or
  "verified scam" based on this feed. We may surface "this matches a public
  scam pattern" type language only after human review.
- We do not auto-email users on the basis of crawl output.
- We do not retain personal data scraped from third-party sites — we only
  retain headline-level public alert summaries.

## Future work

### Daily cron plan
- Run `npm run scam:intel` once per day off a free Vercel cron, GitHub Action,
  or a tiny EC2/Render cron.
- On run, diff against the previous `latest.json` and emit a small "new items"
  list for the human reviewer's queue.

### Supabase persistence plan
A future migration will land a `scam_intel_items` table:

```sql
create table scam_intel_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  source_id text not null,
  source_name text not null,
  source_type text not null,
  trust_level text not null,
  category text not null,
  summary text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  risk_signals text[] not null default '{}',
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id),
  unique (url)
);
create index scam_intel_items_category_idx on scam_intel_items (category);
create index scam_intel_items_fetched_at_idx on scam_intel_items (fetched_at desc);
```

The fetcher would upsert by URL. Reviewer surfaces (still TBD) would filter
`reviewed_at is null` to find unread items.

Supabase is **not required** for the current local-only test. Run the script,
read the JSON, ship a digest.

## Phrasing checklist

When writing any user-facing surface from this feed, use:

- "reported scam pattern"
- "public alert"
- "risk signal"
- "possible trend"

Do not use:

- "confirmed fake"
- "verified scam"
- "guaranteed safe"
- "definitely real" / "definitely fake"
