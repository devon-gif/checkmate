import { scoreGhostJobRisk } from "./score";
import type { GhostJobRiskLevel, JobListingInput } from "./types";

interface ScoreExample {
  name: string;
  input: JobListingInput;
  expectedRiskLevel: GhostJobRiskLevel;
}

export const scoreGhostJobRiskExamples: ScoreExample[] = [
  {
    name: "Fake equipment check job",
    input: {
      title: "Remote assistant",
      companyName: "HR Department",
      description:
        "We will send a check for equipment. Deposit it, purchase equipment, and wire the remaining money back.",
      isRemote: true,
      hasHiringTimeline: false,
    },
    expectedRiskLevel: "very_high",
  },
  {
    name: "Vague remote job with no company domain",
    input: {
      title: "Remote operations coordinator",
      companyName: "Fast growing company",
      description:
        "Seeking a self motivated person with good communication skills who can work independently.",
      isRemote: true,
      hasHiringTimeline: false,
    },
    expectedRiskLevel: "medium",
  },
  {
    name: "Old or reposted listing only",
    input: {
      title: "Product designer",
      companyName: "Example Studio",
      companyDomain: "examplestudio.com",
      officialCompanyUrl: "https://examplestudio.com/careers/product-designer",
      repostedCount: 2,
    },
    expectedRiskLevel: "low",
  },
  {
    name: "Legit-looking job with official company domain",
    input: {
      title: "Senior frontend engineer",
      companyName: "Example Co",
      companyDomain: "example.com",
      recruiterEmail: "recruiting@example.com",
      officialCompanyUrl: "https://example.com/careers/senior-frontend-engineer",
      description:
        "Build production React interfaces with a clear interview process and team-specific responsibilities.",
      hasHiringTimeline: true,
    },
    expectedRiskLevel: "low",
  },
  {
    name: "Suspicious recruiter text-only offer",
    input: {
      messageText:
        "Urgent remote offer. No interview required. We will send a mobile deposit check for your equipment.",
      isRemote: true,
      recruiterEmail: "hiringteam@gmail.com",
      hasHiringTimeline: false,
    },
    expectedRiskLevel: "high",
  },
];

export function runScoreGhostJobRiskExamples() {
  return scoreGhostJobRiskExamples.map((example) => ({
    name: example.name,
    expectedRiskLevel: example.expectedRiskLevel,
    actualRiskLevel: scoreGhostJobRisk(example.input).riskLevel,
  }));
}

