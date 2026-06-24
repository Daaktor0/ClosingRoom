"use client";

import { createTemplateDeal, seedTasks } from "@/lib/checklistSeed";
import type { DealStatus, PortfolioDeal } from "@/lib/dealPortfolio";
import { getSupabaseClient } from "@/lib/supabaseClient";
import type {
  Deal,
  DealNote,
  DocumentCategory,
  DocumentStatus,
  Evidence,
  Filing,
  Phase,
  Priority,
  ResponsibleParty,
  RiskCategory,
  Task,
  TaskStatus,
  TimelineCode
} from "@/lib/types";

type DealRow = {
  id: string;
  organization_id: string;
  name: string;
  company_name: string;
  investor_name: string;
  closing_date_x: string | null;
};

type DealTaskRow = {
  id: string;
  deal_id: string;
  source_task_id: string;
  serial_number: string;
  phase: string;
  timeline: string;
  custom_offset_days: number | null;
  action: string;
  parties: unknown;
  comments: string;
  status: string;
  priority: string;
  blocker: boolean;
  evidence: unknown;
  risk_category: string;
  owner_label: string;
  reviewer_label: string;
  source_reference: string;
  document_category: string;
  document_status: string;
  filing: unknown;
  statutory_deadline_note: string | null;
  agreed_form_required: boolean;
  mandatory_for_closing: boolean;
  notes: string;
  last_updated: string;
};

type DealNoteRow = {
  id: string;
  category: string;
  text: string;
  created_at: string;
};

type TemplateTaskRow = {
  id: string;
  source_task_id: string;
  serial_number: string;
  phase: string;
  timeline: string;
  action: string;
  parties: unknown;
  comments: string;
  priority: string;
  evidence: unknown;
  risk_category: string;
  owner_label: string;
  reviewer_label: string;
  source_reference: string;
  document_category: string;
  filing: unknown;
  statutory_deadline_note: string | null;
  agreed_form_required: boolean;
  mandatory_for_closing: boolean;
};

type TemplateSource = {
  templateId: string;
  tasks: Task[];
  templateTaskIdBySourceId: Map<string, string>;
};

const SEED_TEMPLATE_NAME = "India Seed Financing - Private Placement";

const seedByTaskId = new Map(seedTasks.map((task) => [task.id, task]));

function requireClient() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  return supabase;
}

function failIf(error: { message: string } | null | undefined) {
  if (error) throw new Error(error.message);
}

function jsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function toTaskRow(task: Task, dealId: string, organizationId: string, templateTaskId?: string | null) {
  return {
    organization_id: organizationId,
    deal_id: dealId,
    template_task_id: templateTaskId ?? null,
    source_task_id: task.id,
    serial_number: task.serialNumber,
    phase: task.phase,
    timeline: task.timeline,
    custom_offset_days: task.customOffsetDays ?? null,
    action: task.action,
    parties: jsonValue(task.parties),
    comments: task.comments,
    status: task.status,
    priority: task.priority,
    blocker: task.blocker,
    evidence: jsonValue(task.evidence),
    risk_category: task.riskCategory,
    owner_label: task.owner,
    reviewer_label: task.reviewer,
    notes: task.notes,
    source_reference: task.sourceReference,
    document_category: task.documentCategory,
    document_status: task.documentStatus,
    filing: task.filing ? jsonValue(task.filing) : null,
    statutory_deadline_note: task.statutoryDeadlineNote ?? null,
    agreed_form_required: task.agreedFormRequired ?? false,
    mandatory_for_closing: task.mandatoryForClosing ?? false
  };
}

function fromTaskRow(row: DealTaskRow): Task {
  const seed = seedByTaskId.get(row.source_task_id);
  const evidence = row.evidence && typeof row.evidence === "object" ? row.evidence as Evidence : seed?.evidence ?? { required: false, satisfied: false, label: "" };
  const parties = Array.isArray(row.parties) ? row.parties as ResponsibleParty[] : seed?.parties ?? [];
  const filing = row.filing && typeof row.filing === "object" ? row.filing as Filing : undefined;

  return {
    id: row.source_task_id,
    serialNumber: row.serial_number,
    phase: row.phase as Phase,
    timeline: row.timeline as TimelineCode,
    customOffsetDays: row.custom_offset_days ?? undefined,
    action: row.action,
    parties,
    comments: row.comments,
    status: row.status as TaskStatus,
    priority: row.priority as Priority,
    blocker: row.blocker,
    evidence,
    riskCategory: row.risk_category as RiskCategory,
    dependencies: seed?.dependencies.map((dependency) => ({ ...dependency })) ?? [],
    owner: row.owner_label,
    reviewer: row.reviewer_label,
    lastUpdated: row.last_updated,
    notes: row.notes,
    sourceReference: row.source_reference,
    documentCategory: row.document_category as DocumentCategory,
    documentStatus: row.document_status as DocumentStatus,
    filing,
    statutoryDeadlineNote: row.statutory_deadline_note ?? undefined,
    agreedFormRequired: row.agreed_form_required,
    mandatoryForClosing: row.mandatory_for_closing
  };
}

function fromNoteRow(row: DealNoteRow): DealNote {
  return {
    id: row.id,
    category: row.category as DealNote["category"],
    text: row.text,
    createdAt: row.created_at
  };
}

function fromDealRows(dealRow: DealRow, taskRows: DealTaskRow[], noteRows: DealNoteRow[]): Deal {
  return {
    id: dealRow.id,
    name: dealRow.name,
    companyName: dealRow.company_name,
    investorName: dealRow.investor_name,
    closingDateX: dealRow.closing_date_x ?? "",
    firmLabel: "FIRM",
    tasks: taskRows.map(fromTaskRow).sort((a, b) => a.serialNumber.localeCompare(b.serialNumber, "en", { numeric: true })),
    notes: noteRows.map(fromNoteRow)
  };
}

function templateTaskToTask(row: TemplateTaskRow): Task {
  const seed = seedByTaskId.get(row.source_task_id);
  const evidence = row.evidence && typeof row.evidence === "object" ? row.evidence as Evidence : seed?.evidence ?? { required: false, satisfied: false, label: "" };
  const parties = Array.isArray(row.parties) ? row.parties as ResponsibleParty[] : seed?.parties ?? [];
  const filing = row.filing && typeof row.filing === "object" ? row.filing as Filing : undefined;

  return {
    id: row.source_task_id,
    serialNumber: row.serial_number,
    phase: row.phase as Phase,
    timeline: row.timeline as TimelineCode,
    customOffsetDays: undefined,
    action: row.action,
    parties,
    comments: row.comments,
    status: "Not Started",
    priority: row.priority as Priority,
    blocker: false,
    evidence: { ...evidence, satisfied: false },
    riskCategory: row.risk_category as RiskCategory,
    // Dependencies are still recovered from the TS seed by source_task_id; the
    // read path is intentionally unchanged (deal_dependency is a separate ticket).
    dependencies: seed?.dependencies.map((dependency) => ({ ...dependency })) ?? [],
    owner: row.owner_label,
    reviewer: row.reviewer_label,
    lastUpdated: new Date().toISOString(),
    notes: "",
    sourceReference: row.source_reference,
    documentCategory: row.document_category as DocumentCategory,
    documentStatus: "Not Started",
    filing,
    statutoryDeadlineNote: row.statutory_deadline_note ?? undefined,
    agreedFormRequired: row.agreed_form_required,
    mandatoryForClosing: row.mandatory_for_closing
  };
}

/**
 * Reads the global seed template (organization_id IS NULL) and its tasks so new
 * deals instantiate from the DB template tables. Returns null on any error
 * (e.g. tables missing on an older database) OR when the template is unseeded,
 * so every caller can fall back to the in-code TS seed and keep working.
 */
async function resolveTemplateSource(): Promise<TemplateSource | null> {
  try {
    const supabase = requireClient();
    const { data: templateRows, error: templateError } = await supabase
      .from("template")
      .select("id, version")
      .is("organization_id", null)
      .eq("name", SEED_TEMPLATE_NAME)
      .order("version", { ascending: false })
      .limit(1);
    if (templateError || !templateRows?.length) return null;

    const templateId = templateRows[0].id as string;
    const { data: taskRows, error: taskError } = await supabase
      .from("template_task")
      .select("*")
      .eq("template_id", templateId);
    if (taskError || !taskRows?.length) return null;

    const rows = taskRows as TemplateTaskRow[];
    const tasks = rows
      .map(templateTaskToTask)
      .sort((a, b) => a.serialNumber.localeCompare(b.serialNumber, "en", { numeric: true }));
    const templateTaskIdBySourceId = new Map(rows.map((row) => [row.source_task_id, row.id]));
    return { templateId, tasks, templateTaskIdBySourceId };
  } catch {
    return null;
  }
}

type SeedDealBuild = {
  deal: Deal;
  templateId: string | null;
  templateTaskIdBySourceId: Map<string, string>;
};

/** Builds the deal to seed, preferring the DB template and falling back to the TS seed. */
async function buildSeedDeal(input?: Parameters<typeof createTemplateDeal>[0]): Promise<SeedDealBuild> {
  const base = createTemplateDeal(input);
  const source = await resolveTemplateSource();
  if (!source) {
    return { deal: base, templateId: null, templateTaskIdBySourceId: new Map() };
  }
  return {
    deal: { ...base, tasks: source.tasks },
    templateId: source.templateId,
    templateTaskIdBySourceId: source.templateTaskIdBySourceId
  };
}

async function getCurrentUserAndOrganization() {
  const supabase = requireClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  failIf(userError);
  const user = userData.user;
  if (!user) throw new Error("Sign in to load tracker data.");

  const { data: memberships, error: membershipError } = await supabase
    .from("membership")
    .select("organization_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);
  failIf(membershipError);

  const organizationId = memberships?.[0]?.organization_id as string | undefined;
  if (!organizationId) throw new Error("No organization membership was found for this user.");

  return { user, organizationId };
}

async function createSeedDealInSupabase(organizationId: string, userId: string): Promise<DealRow> {
  const supabase = requireClient();
  const { deal: seed, templateId, templateTaskIdBySourceId } = await buildSeedDeal();
  const { data: dealRow, error: dealError } = await supabase
    .from("deal")
    .insert({
      organization_id: organizationId,
      template_id: templateId,
      name: seed.name,
      company_name: seed.companyName,
      investor_name: seed.investorName,
      closing_date_x: seed.closingDateX || null,
      status: "active",
      created_by_user_id: userId
    })
    .select("*")
    .single();
  failIf(dealError);

  await insertSeedChildren(dealRow as DealRow, organizationId, userId, seed, templateTaskIdBySourceId);
  return dealRow as DealRow;
}

async function insertSeedChildren(
  dealRow: DealRow,
  organizationId: string,
  userId: string,
  seed: Deal,
  templateTaskIdBySourceId: Map<string, string> = new Map()
) {
  const supabase = requireClient();
  // Callers only seed a deal that has zero tasks (createDeal on a fresh row,
  // ensureDealHasTasks behind a !tasks.length guard), so a plain insert is
  // safe and avoids depending on a deal_task unique constraint that may be
  // missing on already-provisioned databases.
  const { error: tasksError } = await supabase
    .from("deal_task")
    .insert(seed.tasks.map((task) => toTaskRow(task, dealRow.id, organizationId, templateTaskIdBySourceId.get(task.id))));
  failIf(tasksError);

  if (seed.notes.length) {
    const { error: notesError } = await supabase
      .from("deal_note")
      .insert(seed.notes.map((note) => ({
        organization_id: organizationId,
        deal_id: dealRow.id,
        actor_user_id: userId,
        category: note.category,
        text: note.text
      })));
    failIf(notesError);
  }
}

async function ensureDealHasTasks(dealRow: DealRow, organizationId: string, userId: string): Promise<Deal> {
  let deal = await loadDeal(dealRow);

  if (!deal.tasks.length) {
    const { deal: seed, templateId, templateTaskIdBySourceId } = await buildSeedDeal();
    await insertSeedChildren(dealRow, organizationId, userId, seed, templateTaskIdBySourceId);
    if (templateId) {
      // Best-effort: link the deal to the template it was seeded from.
      await supabaseUpdateDealTemplate(dealRow.id, templateId);
    }
    deal = await loadDeal(dealRow);
  }

  return deal;
}

async function supabaseUpdateDealTemplate(dealId: string, templateId: string) {
  const supabase = requireClient();
  const { error } = await supabase.from("deal").update({ template_id: templateId }).eq("id", dealId);
  // Non-fatal: tasks already seeded; the link is a convenience only.
  if (error) console.warn("Could not link deal to template:", error.message);
}

async function loadDeal(dealRow: DealRow): Promise<Deal> {
  const supabase = requireClient();
  const [{ data: taskRows, error: taskError }, { data: noteRows, error: noteError }] = await Promise.all([
    supabase.from("deal_task").select("*").eq("deal_id", dealRow.id),
    supabase.from("deal_note").select("id, category, text, created_at").eq("deal_id", dealRow.id).order("created_at", { ascending: false })
  ]);
  failIf(taskError);
  failIf(noteError);
  return fromDealRows(dealRow, (taskRows ?? []) as DealTaskRow[], (noteRows ?? []) as DealNoteRow[]);
}

export async function loadOrCreateCurrentDeal(): Promise<Deal> {
  const supabase = requireClient();
  const { user, organizationId } = await getCurrentUserAndOrganization();

  const { data: dealRows, error: dealsError } = await supabase
    .from("deal")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(1);
  failIf(dealsError);

  const dealRow = (dealRows?.[0] as DealRow | undefined) ?? await createSeedDealInSupabase(organizationId, user.id);
  return ensureDealHasTasks(dealRow, organizationId, user.id);
}

export async function saveDealPatch(dealId: string, patch: Pick<Deal, "name" | "companyName" | "investorName"> | Pick<Deal, "closingDateX">) {
  const supabase = requireClient();
  const rowPatch: Record<string, string | null> = {};
  if ("name" in patch) rowPatch.name = patch.name;
  if ("companyName" in patch) rowPatch.company_name = patch.companyName;
  if ("investorName" in patch) rowPatch.investor_name = patch.investorName;
  if ("closingDateX" in patch) rowPatch.closing_date_x = patch.closingDateX || null;

  const { data, error } = await supabase.from("deal").update(rowPatch).eq("id", dealId).select("id").single();
  failIf(error);
  if (!data) throw new Error("Deal was not saved. Refresh and confirm this account still has access to the deal.");
}

export async function saveTaskPatch(dealId: string, taskId: string, patch: Partial<Pick<Task, "status" | "evidence" | "documentStatus" | "notes" | "owner">>) {
  const supabase = requireClient();
  const rowPatch: Record<string, unknown> = {};
  if ("status" in patch) rowPatch.status = patch.status;
  if ("evidence" in patch) rowPatch.evidence = jsonValue(patch.evidence);
  if ("documentStatus" in patch) rowPatch.document_status = patch.documentStatus;
  if ("notes" in patch) rowPatch.notes = patch.notes;
  if ("owner" in patch) rowPatch.owner_label = patch.owner;
  rowPatch.last_updated = new Date().toISOString();

  const { data, error } = await supabase
    .from("deal_task")
    .update(rowPatch)
    .eq("deal_id", dealId)
    .eq("source_task_id", taskId)
    .select("id")
    .single();
  failIf(error);
  if (!data) throw new Error("Task was not saved. Refresh and confirm this account still has access to the deal.");
}

export async function createDealNote(dealId: string, note: Omit<DealNote, "id" | "createdAt">): Promise<DealNote> {
  const supabase = requireClient();
  const { user, organizationId } = await getCurrentUserAndOrganization();
  const { data, error } = await supabase
    .from("deal_note")
    .insert({
      organization_id: organizationId,
      deal_id: dealId,
      actor_user_id: user.id,
      category: note.category,
      text: note.text
    })
    .select("id, category, text, created_at")
    .single();
  failIf(error);
  return fromNoteRow(data as DealNoteRow);
}

export async function resetCurrentDeal(dealId: string): Promise<Deal> {
  const supabase = requireClient();
  const { organizationId } = await getCurrentUserAndOrganization();
  const { deal: seed, templateId, templateTaskIdBySourceId } = await buildSeedDeal();

  const { data: dealRow, error: dealError } = await supabase
    .from("deal")
    .update({
      template_id: templateId,
      name: seed.name,
      company_name: seed.companyName,
      investor_name: seed.investorName,
      closing_date_x: seed.closingDateX || null
    })
    .eq("id", dealId)
    .select("*")
    .single();
  failIf(dealError);

  await Promise.all(seed.tasks.map((task) =>
    supabase
      .from("deal_task")
      .update(toTaskRow(task, dealId, organizationId, templateTaskIdBySourceId.get(task.id)))
      .eq("deal_id", dealId)
      .eq("source_task_id", task.id)
      .then(({ error }) => failIf(error))
  ));

  return loadDeal(dealRow as DealRow);
}

export async function loadDealById(dealId: string): Promise<Deal> {
  const supabase = requireClient();
  const { user, organizationId } = await getCurrentUserAndOrganization();
  const { data: dealRow, error } = await supabase.from("deal").select("*").eq("id", dealId).single();
  failIf(error);
  return ensureDealHasTasks(dealRow as DealRow, organizationId, user.id);
}

export async function createDeal(input: {
  name: string;
  companyName: string;
  investorName: string;
  closingDateX: string;
}): Promise<Deal> {
  const supabase = requireClient();
  const { user, organizationId } = await getCurrentUserAndOrganization();
  const { deal: seed, templateId, templateTaskIdBySourceId } = await buildSeedDeal({
    name: input.name,
    companyName: input.companyName,
    investorName: input.investorName,
    closingDateX: input.closingDateX
  });
  const { data: dealRow, error } = await supabase
    .from("deal")
    .insert({
      organization_id: organizationId,
      template_id: templateId,
      name: input.name,
      company_name: input.companyName,
      investor_name: input.investorName,
      closing_date_x: input.closingDateX || null,
      status: "active",
      lead_partner_user_id: user.id,
      created_by_user_id: user.id
    })
    .select("*")
    .single();
  failIf(error);

  await insertSeedChildren(dealRow as DealRow, organizationId, user.id, seed, templateTaskIdBySourceId);
  return loadDeal(dealRow as DealRow);
}

export async function listDeals(): Promise<PortfolioDeal[]> {
  const supabase = requireClient();
  const { user, organizationId } = await getCurrentUserAndOrganization();

  const [{ data: dealRows, error: dealError }, { data: taskRows, error: taskError }, { data: memberRows, error: memberError }] =
    await Promise.all([
      supabase.from("deal").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
      supabase.from("deal_task").select("*").eq("organization_id", organizationId),
      supabase.from("membership").select("user_id, email").eq("organization_id", organizationId)
    ]);
  failIf(dealError);
  failIf(taskError);
  failIf(memberError);

  const emailByUser = new Map((memberRows ?? []).map((row) => [row.user_id as string, row.email as string]));
  const tasksByDeal = new Map<string, DealTaskRow[]>();
  for (const row of (taskRows ?? []) as DealTaskRow[]) {
    const list = tasksByDeal.get(row.deal_id) ?? [];
    list.push(row);
    tasksByDeal.set(row.deal_id, list);
  }

  return (dealRows ?? []).map((row) => {
    const dealRow = row as DealRow & { status: string; lead_partner_user_id: string | null; created_by_user_id: string };
    const deal = fromDealRows(dealRow, tasksByDeal.get(dealRow.id) ?? [], []);
    const leadId = dealRow.lead_partner_user_id ?? dealRow.created_by_user_id;
    const status: DealStatus = dealRow.status === "on_hold" ? "on-hold" : (dealRow.status as DealStatus);
    return {
      ...deal,
      status,
      leadPartner: emailByUser.get(leadId) ?? "Unassigned",
      assignedToCurrentUser: dealRow.lead_partner_user_id === user.id || dealRow.created_by_user_id === user.id,
      templateName: "India Seed Financing - Private Placement"
    };
  });
}
