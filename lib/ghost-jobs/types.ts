export type GhostJobRiskLevel = "low" | "medium" | "high" | "very_high";

export type EvidenceSourceType =
  | "official_company"
  | "ats_board"
  | "third_party_board"
  | "user_report"
  | "manual_review"
  | "unknown";

export type SourceCheckStatus =
  | "verified"
  | "not_found"
  | "could_not_verify"
  | "permission_limited"
  | "not_checked";

export interface JobListingInput {
  title?: string;
  companyName?: string;
  companyDomain?: string;
  sourceUrl?: string;
  officialCompanyUrl?: string;
  recruiterEmail?: string;
  description?: string;
  messageText?: string;
  location?: string;
  salaryText?: string;
  isRemote?: boolean;
  postedAt?: string;
  repostedCount?: number;
  appearsOnlyOnThirdPartyBoard?: boolean;
  hasHiringTimeline?: boolean;
}

export interface GhostJobSignal {
  id: string;
  label: string;
  weight: number;
  severity: GhostJobRiskLevel;
  evidence: string;
}

export interface GhostJobScoreResult {
  score: number;
  riskLevel: GhostJobRiskLevel;
  summary: string;
  signals: GhostJobSignal[];
  saferNextSteps: string[];
  disclaimer: string;
}

export interface EvidenceSource {
  id: string;
  type: EvidenceSourceType;
  label: string;
  url?: string;
  permissionNotes?: string;
  lastCheckedAt?: string;
}

export interface SourceCheckResult {
  source: EvidenceSource;
  status: SourceCheckStatus;
  matchedJobUrl?: string;
  checkedAt: string;
  notes?: string;
}

