import type { EvidenceSource } from "./types";

export const PLANNED_SAFE_SOURCE_CATEGORIES = [
  "Official company career pages",
  "Public Greenhouse job boards",
  "Public Lever job boards",
  "Public Ashby job boards",
  "Public Workday career pages where permitted",
  "User-submitted reports",
  "Manually reviewed source lists",
] as const;

export const SOURCES_TO_AVOID_OR_TREAT_CAREFULLY = [
  "LinkedIn",
  "Indeed",
  "Glassdoor",
  "ZipRecruiter",
  "Any site where scraping violates terms",
] as const;

export const plannedEvidenceSources: EvidenceSource[] = [
  {
    id: "official-company-careers",
    type: "official_company",
    label: "Official company career pages",
    permissionNotes:
      "Prefer direct company career pages and respect robots, terms, rate limits, and explicit permissions.",
  },
  {
    id: "public-ats-boards",
    type: "ats_board",
    label: "Public ATS job boards",
    permissionNotes:
      "Greenhouse, Lever, Ashby, and permitted Workday pages may be checked later where access is public and allowed.",
  },
  {
    id: "user-submitted-reports",
    type: "user_report",
    label: "User-submitted reports",
    permissionNotes:
      "Use as soft risk signals only. User reports do not prove that a listing is fake.",
  },
  {
    id: "manual-review-lists",
    type: "manual_review",
    label: "Manually reviewed source lists",
    permissionNotes:
      "Curated sources should be reviewed before entering any crawl or verification workflow.",
  },
];

