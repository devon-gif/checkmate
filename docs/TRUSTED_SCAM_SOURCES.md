# Trusted Scam Sources Plan

CheckRay should prefer official, trusted, and explainable source material when improving scam detection. Do not scrape random sites or rely on unsourced internet summaries.

## Preferred Sources

- FTC scam alerts and consumer guidance
- FBI IC3 annual reports and public service announcements
- Better Business Bureau scam guidance and Scam Tracker trend summaries
- CISA phishing and cyber hygiene guidance
- State attorney general scam alerts
- Official company career pages for job verification
- URL/domain reputation checks as a future enhancement

## Source Use Rules

- Prefer official or well-known consumer-protection sources.
- Do not scrape random blogs, forums, or SEO content.
- Update source summaries periodically; do not require live lookup for every analysis.
- Use source summaries as retrieval context later, clearly separated from user-provided evidence.
- Live web lookup should be optional and reserved for high-risk or unclear cases.
- If source lookup is used in the future, cite the source clearly and do not imply CheckRay verified private facts.

## Future Architecture

Phase 1: static trusted-source docs
- Maintain curated summaries of common scam patterns from official sources.
- Use them to improve prompts, rubrics, and deterministic rule coverage.

Phase 2: weekly source update job
- Add a scheduled job that refreshes trusted-source summaries.
- Review changes before they affect analyzer behavior.

Phase 3: optional live verification
- Add opt-in checks for company/domain/job-post signals where useful.
- Examples: official company career-page lookup, domain age/reputation, and known phishing-domain indicators.
- Keep this optional and rate-limited; do not block normal analysis on live lookup.

Phase 4: user-facing citations
- If CheckRay uses source lookup for a specific report, show concise citations.
- Keep citations separate from the user’s submitted evidence.
- Continue to remind users that Ray can be wrong and important decisions should be verified through official sources.
