# CheckRay / CheckMate

### AI-assisted risk analysis for suspicious digital interactions

CheckRay is a web-first product for helping people evaluate suspicious texts, emails, links, bills, job offers, rental listings and marketplace conversations.

**Live product:** [checkray.app](https://checkray.app)  
**Focus:** AI product UX · structured model output · trust & safety · evidence · full-stack prototyping

---

## The product problem

Scam detection is not simply a classification problem.

A useful product has to help a person answer:

1. **What looks suspicious?**
2. **Why does it look suspicious?**
3. **How confident should I be?**
4. **What is the safest next action?**

CheckRay is designed around those questions rather than around an open-ended chatbot.

## Core experience

A user can submit suspicious text or a URL and receive a structured risk report containing:

- risk score and severity
- plain-English summary
- detected red flags
- recommended actions
- a safer response when appropriate
- supporting sources / evidence
- clear uncertainty and safety language

The product also includes authenticated case history and infrastructure for expanding the same analysis model into email, SMS and browser workflows.

## Design principles

### Show reasoning, not just a verdict
The interface surfaces red flags, evidence and recommended actions so the user can understand *why* something was flagged.

### Structure AI output
Model responses are constrained to typed, validated objects rather than free-form prose wherever possible.

### Be conservative with high-risk claims
The analyzer avoids presenting uncertain conclusions as fact and avoids replacing professional legal, medical or financial advice.

### Keep humans in control
The system provides guidance and evidence; consequential decisions remain with the user.

## Stack

| Area | Technology |
| --- | --- |
| App | Next.js, React, TypeScript |
| UI | Tailwind CSS, Radix UI, Framer Motion |
| Data / Auth | Supabase + Postgres + RLS |
| AI | Vercel AI SDK / OpenAI |
| Validation | Zod structured output |
| Email | Resend |
| Billing | Stripe |
| Observability | Sentry |
| Testing | Analyzer evals, Playwright, load-test tooling |
| Deployment | Vercel |

## Architecture

The core analysis route uses a server-side risk router that:

1. receives authenticated case input
2. detects relevant URLs and context
3. selects risk-analysis behavior
4. requests schema-constrained AI output
5. validates the response
6. persists the report against the user's case
7. returns a structured UI-ready result

Supported analysis categories include:

- scam / suspicious messages
- job scams and ghost-job patterns
- bills and payment requests
- phishing URLs
- rental / marketplace risk
- unknown / ambiguous cases

## Data and privacy

The application uses Supabase authentication and Postgres with Row Level Security. Authenticated users can access only their own cases and records, and risk reports inherit authorization through their parent case.

## Why this project is in my portfolio

CheckRay is one of my clearest examples of the kind of Creative Technologist work I want to keep doing: taking an ambiguous human problem, designing a trustworthy interaction model, connecting it to real AI and backend infrastructure, and turning it into a working product.

---

## Local development

```bash
cp .env.example .env
pnpm install
npx supabase start
npx supabase db reset
pnpm dev
```

At minimum, configure Supabase credentials. AI analysis additionally requires an OpenAI API key.

---

**Devon Archer**  
Creative Technologist / Product Designer  
[Portfolio](https://www.archerdesign.shop/devon) · [Live product](https://checkray.app)
