export type Phase =
  | "Pre-Execution Items"
  | "Conditions Precedent"
  | "Closing Actions"
  | "Post-Closing Actions";

export type TimelineCode =
  | "Prior to X"
  | "X"
  | "X+10"
  | "X+30"
  | "X+60"
  | "X+90"
  | "Custom";

export type ResponsibleParty =
  | "Company"
  | "Founders"
  | "Investor"
  | "FIRM"
  | "Investor Counsel"
  | "Registered Valuer"
  | "Independent CA / Merchant Banker"
  | "Key Employees"
  | "Parties to Transaction Documents";

export type TaskStatus =
  | "Not Started"
  | "In Progress"
  | "With Client"
  | "With Investor Counsel"
  | "Under Review"
  | "Completed"
  | "Waived"
  | "Converted to CS"
  | "Blocked"
  | "Not Applicable";

export type Priority = "Low" | "Medium" | "High" | "Critical";

export type RiskCategory =
  | "Legal validity risk"
  | "Regulatory filing risk"
  | "Closing blocker"
  | "Investor protection risk"
  | "Founder/company execution risk"
  | "Pure admin";

export type DocumentCategory =
  | "Transaction Documents"
  | "Corporate Approvals"
  | "Valuation"
  | "Private Placement Forms"
  | "RoC Filings"
  | "FEMA Filings"
  | "Employment Agreements"
  | "Articles"
  | "CP Certificate"
  | "Closing Resolutions"
  | "Share Certificates"
  | "Management Rights Letter"
  | "Post-closing Evidence";

export type DocumentStatus =
  | "Not Started"
  | "Draft Shared"
  | "Under Review"
  | "Agreed Form"
  | "Executed"
  | "Filed";

export type NoteCategory =
  | "Client Follow-up"
  | "Investor Counsel Comment"
  | "Waiver Position"
  | "Open Question"
  | "Closing Call Note";

export interface Evidence {
  required: boolean;
  uploaded: boolean;
  label: string;
  externalLink?: string;
  link?: string;
}

export interface DealDocument {
  id: string;
  taskId: string;
  name: string;
  category: DocumentCategory;
  status: DocumentStatus;
  requiredForClosingPack: boolean;
  remarks: string;
}

export interface Dependency {
  taskId: string;
  label: string;
}

export interface Filing {
  form: "PAS-3" | "PAS-4" | "PAS-5" | "MGT-14" | "SH-7" | "DIR-12" | "FC-GPR";
  deadline: TimelineCode;
  authority: "RoC" | "RBI/FIRMS" | "Internal";
  statutoryDays?: number;
  statutoryTrigger?: "Closing Date X" | "Allotment" | "Resolution" | "Internal";
  statutoryNote?: string;
}

export interface Task {
  id: string;
  serialNumber: string;
  phase: Phase;
  timeline: TimelineCode;
  customOffsetDays?: number;
  action: string;
  parties: ResponsibleParty[];
  comments: string;
  status: TaskStatus;
  priority: Priority;
  blocker: boolean;
  evidence: Evidence;
  riskCategory: RiskCategory;
  dependencies: Dependency[];
  owner: string;
  reviewer: string;
  lastUpdated: string;
  notes: string;
  sourceReference: string;
  documentCategory: DocumentCategory;
  documentStatus: DocumentStatus;
  filing?: Filing;
  statutoryDeadlineNote?: string;
  agreedFormRequired?: boolean;
  mandatoryForClosing?: boolean;
}

export interface DealNote {
  id: string;
  category: NoteCategory;
  text: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  name: string;
  companyName: string;
  investorName: string;
  closingDateX: string;
  firmLabel: string;
  tasks: Task[];
  notes: DealNote[];
}

export interface ReadinessResult {
  ready: boolean;
  score: number;
  blockers: Task[];
  pendingCps: Task[];
  waivedCps: Task[];
  convertedToCs: Task[];
  missingEvidence: Task[];
  missingAgreedForm: Task[];
  mandatoryIncomplete: Task[];
  warnings: string[];
}

export interface DependencyWarning {
  id: string;
  label: string;
  blockedTaskId: string;
  prerequisiteTaskId: string;
  severity: "High" | "Medium";
}
