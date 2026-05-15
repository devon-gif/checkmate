# CheckMate

CheckMate is a text, email, and web-first personal risk assistant for suspicious
messages, links, bills, job offers, rental listings, and marketplace conversations.

The current MVP uses a server-side Vercel AI SDK risk router with structured
JSON output. Stripe, Twilio inbound SMS/MMS, and Resend inbound email can plug
into the same data model later.

## Stack

- Next.js App Router
- TypeScript
- Supabase Auth and Postgres
- Tailwind CSS and shadcn-style local UI components
- Vercel deployment
- Vercel AI SDK-ready app structure

## Core Routes

- `/dashboard` - authenticated case dashboard
- `/cases/new` - paste text or enter a URL for analysis
- `/api/analyze-case` - authenticated risk analyzer API

## Data Model

The MVP migration adds:

- `cases`
- `case_messages`
- `case_attachments`
- `risk_reports`
- `usage_events`

Row-level security is enabled so authenticated users can only access their own
cases and case-owned records. Risk reports are authorized through the owning
case.

## Setup

Copy environment variables:

```bash
cp .env.example .env
```

Required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Required for `/api/analyze-case` and optional for the legacy chat route:

```bash
OPENAI_API_KEY=
CHECKMATE_ANALYZER_MODEL=gpt-4o-mini
```

Install dependencies:

```bash
pnpm install
```

Start Supabase locally:

```bash
npx supabase start
```

Apply migrations:

```bash
npx supabase db reset
```

Run the app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Analyzer Behavior

`/api/analyze-case` calls `analyzeCase` in `lib/checkmate.ts`. It detects URLs
in the submitted text, then uses Vercel AI SDK `generateObject` with a Zod
schema to classify cases into:

- `scam_text`
- `job_scam_or_ghost_job`
- `bill_or_fee`
- `phishing_url`
- `rental_or_marketplace`
- `unknown`

Each report includes:

- `risk_score` from 0 to 100
- `risk_level`: `low`, `medium`, `high`, or `very_high`
- summary
- red flags
- recommended actions
- safe reply
- disclaimer
- sources

The analyzer prompt is intentionally conservative: it avoids certainty, avoids
legal/medical/financial advice, warns users not to share sensitive information
when risk is high, and uses domain-specific checks for job scams and bills or
fees.
