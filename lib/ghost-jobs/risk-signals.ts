import type { GhostJobSignal, JobListingInput } from "./types";

export const GHOST_JOB_SIGNAL_IDS = {
  equipmentCheck: "equipment-check-language",
  moneyMovement: "money-movement-request",
  vagueCompany: "vague-company-details",
  noCompanyDomain: "no-company-domain",
  urgentLanguage: "urgent-hiring-language",
  remoteMoneyMovement: "remote-role-money-movement",
  unrealisticSalary: "unrealistic-salary",
  noHiringTimeline: "no-hiring-timeline",
  genericDescription: "generic-job-description",
  domainMismatch: "suspicious-url-domain-mismatch",
  thirdPartyOnly: "third-party-only-listing",
  reposted: "reposted-or-stale-signal",
} as const;

export function normalizeGhostJobText(input: JobListingInput): string {
  return [
    input.title,
    input.companyName,
    input.description,
    input.messageText,
    input.location,
    input.salaryText,
    input.sourceUrl,
    input.officialCompanyUrl,
    input.recruiterEmail,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function buildSignal(
  signal: Omit<GhostJobSignal, "evidence"> & { evidence?: string },
): GhostJobSignal {
  return {
    ...signal,
    evidence: signal.evidence ?? "Risk signal found in provided listing text.",
  };
}

