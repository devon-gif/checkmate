# Ghost-Job Intelligence Foundation

This folder contains a scoped, deterministic starter foundation for future CheckRay ghost-job review.

It does not call external APIs, scrape job boards, run crawlers, or claim that a job is definitely fake or definitely real. The scoring module only highlights risk signals from user-provided data and safe verification context.

## Files

- `types.ts`: Shared input, signal, score, evidence, and source-check types.
- `risk-signals.ts`: Signal identifiers and small text helpers.
- `score.ts`: Deterministic starter scoring function.
- `sources.ts`: Planned safe source categories and sources to avoid or treat carefully.
- `score.test.ts`: Lightweight documented test cases for the starter scorer.

## Language Rules

Use cautious wording:

- "possible ghost job"
- "risk signals"
- "could not verify"
- "verify through official company channels"

Avoid definitive claims from automated checks:

- Do not say a role is definitely fake.
- Do not say a role is definitely real.
- Do not treat age, reposting, or a user report as proof.

