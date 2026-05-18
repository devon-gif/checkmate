import {
  GHOST_JOB_SIGNAL_IDS,
  buildSignal,
  normalizeGhostJobText,
} from "./risk-signals";
import type {
  GhostJobRiskLevel,
  GhostJobScoreResult,
  GhostJobSignal,
  JobListingInput,
} from "./types";

const DISCLAIMER =
  "Ray can be wrong. This result highlights risk signals only. Verify through official company channels.";

export function scoreGhostJobRisk(
  input: JobListingInput,
): GhostJobScoreResult {
  const text = normalizeGhostJobText(input);
  const signals: GhostJobSignal[] = [];

  const hasEquipmentCheck = /equipment|check|cheque|deposit|mobile deposit/.test(
    text,
  );
  const hasMoneyMovement =
    /wire|western union|zelle|cash app|venmo|send (the )?money back|refund|overpayment|purchase equipment/.test(
      text,
    );

  if (hasEquipmentCheck) {
    signals.push(
      buildSignal({
        id: GHOST_JOB_SIGNAL_IDS.equipmentCheck,
        label: "Equipment or payment check language",
        weight: 28,
        severity: "high",
        evidence:
          "The listing or message appears to mention checks, deposits, or equipment purchases.",
      }),
    );
  }

  if (hasMoneyMovement) {
    signals.push(
      buildSignal({
        id: GHOST_JOB_SIGNAL_IDS.moneyMovement,
        label: "Request to move or return money",
        weight: 32,
        severity: "very_high",
        evidence:
          "The text appears to reference wiring, refunding, overpayment, or sending money back.",
      }),
    );
  }

  if (isVagueCompany(input, text)) {
    signals.push(
      buildSignal({
        id: GHOST_JOB_SIGNAL_IDS.vagueCompany,
        label: "Vague company details",
        weight: 12,
        severity: "medium",
        evidence:
          "The company identity or verifiable employer details appear limited.",
      }),
    );
  }

  if (!input.companyDomain && !hasCompanyLikeEmail(input.recruiterEmail)) {
    signals.push(
      buildSignal({
        id: GHOST_JOB_SIGNAL_IDS.noCompanyDomain,
        label: "No verified company domain",
        weight: 12,
        severity: "medium",
        evidence:
          "No official company domain or company-like recruiter email was provided.",
      }),
    );
  }

  if (/urgent|immediate start|start today|act fast|limited slots|hire immediately/.test(text)) {
    signals.push(
      buildSignal({
        id: GHOST_JOB_SIGNAL_IDS.urgentLanguage,
        label: "Urgent hiring language",
        weight: 10,
        severity: "medium",
        evidence:
          "The text appears to pressure the reader toward a fast decision.",
      }),
    );
  }

  if (input.isRemote && hasMoneyMovement) {
    signals.push(
      buildSignal({
        id: GHOST_JOB_SIGNAL_IDS.remoteMoneyMovement,
        label: "Remote role with money movement",
        weight: 20,
        severity: "very_high",
        evidence:
          "Remote roles that ask applicants to move money or handle checks are high-risk.",
      }),
    );
  }

  if (hasUnrealisticSalary(input, text)) {
    signals.push(
      buildSignal({
        id: GHOST_JOB_SIGNAL_IDS.unrealisticSalary,
        label: "Unrealistic compensation signal",
        weight: 14,
        severity: "medium",
        evidence:
          "The compensation appears unusually high for vague or entry-level context.",
      }),
    );
  }

  if (input.hasHiringTimeline === false || /no interview|interview not required/.test(text)) {
    signals.push(
      buildSignal({
        id: GHOST_JOB_SIGNAL_IDS.noHiringTimeline,
        label: "No clear hiring timeline",
        weight: 7,
        severity: "low",
        evidence:
          "The listing does not provide a clear hiring process or timeline.",
      }),
    );
  }

  if (hasGenericDescription(text)) {
    signals.push(
      buildSignal({
        id: GHOST_JOB_SIGNAL_IDS.genericDescription,
        label: "Generic job description",
        weight: 8,
        severity: "low",
        evidence:
          "The description appears broad or template-like without specific responsibilities.",
      }),
    );
  }

  if (hasDomainMismatch(input)) {
    signals.push(
      buildSignal({
        id: GHOST_JOB_SIGNAL_IDS.domainMismatch,
        label: "Suspicious URL or domain mismatch",
        weight: 18,
        severity: "high",
        evidence:
          "The source URL, official URL, company domain, or recruiter email may not align.",
      }),
    );
  }

  if (input.appearsOnlyOnThirdPartyBoard) {
    signals.push(
      buildSignal({
        id: GHOST_JOB_SIGNAL_IDS.thirdPartyOnly,
        label: "Could not verify on official company site",
        weight: signals.length > 0 ? 16 : 12,
        severity: signals.length > 0 ? "high" : "medium",
        evidence:
          "The role appears to exist only on a third-party board in the provided context.",
      }),
    );
  }

  if ((input.repostedCount ?? 0) > 0) {
    const repostedCount = input.repostedCount ?? 0;
    signals.push(
      buildSignal({
        id: GHOST_JOB_SIGNAL_IDS.reposted,
        label: "Reposted or stale listing signal",
        weight: Math.min(10, 4 + repostedCount * 2),
        severity: "low",
        evidence:
          "A reposted or older listing is a soft signal and should not be treated as proof by itself.",
      }),
    );
  }

  let score = clampScore(
    signals.reduce((total, signal) => total + signal.weight, 0),
  );

  if (hasEquipmentCheck && /deposit/.test(text) && hasMoneyMovement) {
    score = Math.max(score, 91);
  }

  if (hasEquipmentCheck && /deposit|mobile deposit/.test(text) && input.isRemote) {
    score = Math.max(score, 68);
  }

  const softSignalIds = new Set<string>([
    GHOST_JOB_SIGNAL_IDS.genericDescription,
    GHOST_JOB_SIGNAL_IDS.noHiringTimeline,
    GHOST_JOB_SIGNAL_IDS.reposted,
    GHOST_JOB_SIGNAL_IDS.vagueCompany,
  ]);
  const onlySoftSignals = signals.every((signal) =>
    softSignalIds.has(signal.id),
  );

  if (onlySoftSignals) {
    score = Math.min(score, 49);
  }

  const riskLevel = getRiskLevel(score);

  return {
    score,
    riskLevel,
    summary: getSummary(riskLevel),
    signals,
    saferNextSteps: [
      "Verify the role through the official company careers page.",
      "Contact the company using an email or phone number from its official site.",
      "Do not deposit checks, buy equipment, or send money back to a recruiter.",
      "Treat user reports and repost age as risk signals, not proof.",
    ],
    disclaimer: DISCLAIMER,
  };
}

function isVagueCompany(input: JobListingInput, text: string): boolean {
  if (!input.companyName && /our client|confidential|fast growing company/.test(text)) {
    return true;
  }

  return Boolean(
    input.companyName &&
      /company|recruiting team|hr department|hiring manager/i.test(
        input.companyName,
      ),
  );
}

function hasCompanyLikeEmail(email?: string): boolean {
  if (!email) {
    return false;
  }

  return !/@(gmail|yahoo|outlook|hotmail|icloud)\./i.test(email);
}

function hasUnrealisticSalary(input: JobListingInput, text: string): boolean {
  const salaryText = input.salaryText ?? text;
  const amounts = Array.from(salaryText.matchAll(/\$?([1-9]\d{2,5})(?:,\d{3})?/g))
    .map((match) => Number(match[1].replace(",", "")))
    .filter(Number.isFinite);

  const mentionsLowExperience = /entry.level|no experience|data entry|assistant/.test(
    text,
  );

  return amounts.some((amount) => amount >= 120000) && mentionsLowExperience;
}

function hasGenericDescription(text: string): boolean {
  const genericPhrases = [
    "self motivated",
    "good communication skills",
    "work independently",
    "fast paced environment",
    "other duties as assigned",
  ];

  const matches = genericPhrases.filter((phrase) => text.includes(phrase));
  return matches.length >= 2;
}

function hasDomainMismatch(input: JobListingInput): boolean {
  const sourceHost = getHost(input.sourceUrl);
  const officialHost = getHost(input.officialCompanyUrl);
  const companyDomain = input.companyDomain?.toLowerCase().replace(/^www\./, "");
  const emailDomain = input.recruiterEmail?.split("@")[1]?.toLowerCase();

  if (companyDomain && emailDomain && emailDomain !== companyDomain) {
    return true;
  }

  if (officialHost && companyDomain && !officialHost.endsWith(companyDomain)) {
    return true;
  }

  if (
    sourceHost &&
    companyDomain &&
    !sourceHost.endsWith(companyDomain) &&
    /career|job|apply|work/.test(sourceHost)
  ) {
    return false;
  }

  return Boolean(
    sourceHost &&
      companyDomain &&
      !sourceHost.endsWith(companyDomain) &&
      /secure|verify|apply-now|jobs-career/.test(sourceHost),
  );
}

function getHost(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function getRiskLevel(score: number): GhostJobRiskLevel {
  if (score >= 85) {
    return "very_high";
  }

  if (score >= 65) {
    return "high";
  }

  if (score >= 35) {
    return "medium";
  }

  return "low";
}

function getSummary(riskLevel: GhostJobRiskLevel): string {
  if (riskLevel === "very_high") {
    return "Possible ghost job or scam pattern with severe risk signals.";
  }

  if (riskLevel === "high") {
    return "Possible ghost job with multiple risk signals. Verify through official company channels.";
  }

  if (riskLevel === "medium") {
    return "Some ghost-job risk signals are present. More verification is needed.";
  }

  return "Few ghost-job risk signals were found in the provided information.";
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}
