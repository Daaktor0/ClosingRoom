import type { DocumentStatus, Phase, ResponsibleParty, RiskCategory, TaskStatus, TimelineCode } from "./types";

export const phases: Phase[] = ["Pre-Execution Items", "Conditions Precedent", "Closing Actions", "Post-Closing Actions"];

export const taskStatuses: TaskStatus[] = [
  "Not Started",
  "In Progress",
  "With Client",
  "With Investor Counsel",
  "Under Review",
  "Completed",
  "Waived",
  "Converted to CS",
  "Blocked",
  "Not Applicable"
];

export const documentStatuses: DocumentStatus[] = ["Not Started", "Draft Shared", "Under Review", "Agreed Form", "Executed", "Filed"];

export const responsibleParties: ResponsibleParty[] = [
  "Company",
  "Founders",
  "Investor",
  "FIRM",
  "Investor Counsel",
  "Registered Valuer",
  "Independent CA / Merchant Banker",
  "Key Employees",
  "Parties to Transaction Documents"
];

export const riskCategories: RiskCategory[] = [
  "Legal validity risk",
  "Regulatory filing risk",
  "Closing blocker",
  "Investor protection risk",
  "Founder/company execution risk",
  "Pure admin"
];

export const timelineCodes: TimelineCode[] = ["Prior to X", "X", "X+10", "X+30", "X+60", "X+90", "Custom"];

export const STATUS_NOTE_MAX_LENGTH = 280;

export const confidentialityReminder =
  "Status only: do not enter confidential, privileged, client-identifying, or document-content material.";
