import { globalDisclaimer, phases } from "./constants";
import { getComputedDueDate, getComputedStatutoryDate, isOverdue } from "./dateUtils";
import { getCompletionPercent, getOwnerPendingCounts, getPhaseTasks, getReadiness } from "./rules";
import { percent } from "./utils";
import type { Deal, Task } from "./types";

const closedStatuses = ["Completed", "Waived", "Converted to CS", "Not Applicable"];
const ACCENT = "FF0D9488";
const GREEN = "FFC6EFCE";
const RED = "FFFFC7CE";
const AMBER = "FFFFEB9C";

function statusFillArgb(status: string): string | null {
  if (closedStatuses.includes(status)) return GREEN;
  if (status === "Blocked") return RED;
  if (status === "Not Started") return null;
  return AMBER;
}

function statutoryText(task: Task, closingDateX: string): string {
  const date = getComputedStatutoryDate(task, closingDateX);
  if (date) return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  if (task.statutoryDeadlineNote) return task.statutoryDeadlineNote;
  if (task.filing?.statutoryDays) return `${task.filing.statutoryDays} days from ${task.filing.statutoryTrigger ?? "trigger"}`;
  return "";
}

type Worksheet = import("exceljs").Worksheet;

function styleHeaderRow(ws: Worksheet, columnCount: number): void {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT } };
  header.alignment = { vertical: "middle" };
  header.height = 18;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnCount } };
}

export async function downloadExcelWorkbook(deal: Deal): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = deal.firmLabel;
  wb.created = new Date();

  const readiness = getReadiness(deal);
  const cpTasks = getPhaseTasks(deal.tasks, "Conditions Precedent");
  const cpPercent = percent(cpTasks.filter((task) => closedStatuses.includes(task.status)).length, cpTasks.length);

  // Overview sheet
  const overview = wb.addWorksheet("Overview");
  overview.columns = [
    { key: "label", width: 26 },
    { key: "value", width: 52 }
  ];
  const overviewRows: [string, string | number][] = [
    ["Deal", deal.name],
    ["Company", deal.companyName],
    ["Investor", deal.investorName],
    ["Closing Date X", deal.closingDateX || "Not set"],
    ["Report generated", new Date().toLocaleString("en-IN")],
    ["Readiness verdict", readiness.ready ? "Ready to close" : "Not ready to close"],
    ["Readiness score", `${readiness.score}%`],
    ["Overall completion", `${getCompletionPercent(deal.tasks)}%`],
    ["CP completion", `${cpPercent}%`],
    ["Open blockers", readiness.blockers.length],
    ["Total tasks", deal.tasks.length]
  ];
  overview.addRow(["Closing Status Report", ""]);
  overview.getRow(1).font = { bold: true, size: 15, color: { argb: ACCENT } };
  overviewRows.forEach(([label, value]) => {
    const row = overview.addRow({ label, value });
    row.getCell("label").font = { bold: true };
  });
  overview.addRow(["", ""]);
  const note = overview.addRow(["Confidentiality", globalDisclaimer]);
  note.getCell("label").font = { bold: true };
  note.getCell("value").alignment = { wrapText: true };
  note.getCell("value").font = { italic: true, color: { argb: "FF8A5A00" } };

  // One sheet per phase
  const phaseColumns = [
    { header: "S.No.", key: "sno", width: 8 },
    { header: "Action", key: "action", width: 50 },
    { header: "Parties", key: "parties", width: 24 },
    { header: "Owner", key: "owner", width: 16 },
    { header: "Reviewer", key: "reviewer", width: 16 },
    { header: "Status", key: "status", width: 18 },
    { header: "Priority", key: "priority", width: 10 },
    { header: "Risk", key: "risk", width: 24 },
    { header: "Internal Due", key: "due", width: 14 },
    { header: "Statutory Limit", key: "statutory", width: 22 },
    { header: "Evidence", key: "evidence", width: 14 },
    { header: "Doc Status", key: "doc", width: 14 },
    { header: "Last Updated", key: "updated", width: 14 },
    { header: "Source", key: "source", width: 34 }
  ];

  for (const phase of phases) {
    const ws = wb.addWorksheet(phase);
    ws.columns = phaseColumns;
    const phaseTasks = getPhaseTasks(deal.tasks, phase);
    for (const task of phaseTasks) {
      const due = getComputedDueDate(task, deal.closingDateX);
      const row = ws.addRow({
        sno: task.serialNumber,
        action: task.action,
        parties: task.parties.join(", "),
        owner: task.owner,
        reviewer: task.reviewer,
        status: task.status,
        priority: task.priority,
        risk: task.riskCategory,
        due: due ?? "",
        statutory: statutoryText(task, deal.closingDateX),
        evidence: task.evidence.satisfied ? "Satisfied / linked" : "Missing",
        doc: task.documentStatus,
        updated: task.lastUpdated ? new Date(task.lastUpdated) : "",
        source: task.sourceReference
      });
      row.alignment = { vertical: "top", wrapText: true };
      const fill = statusFillArgb(task.status);
      if (fill) {
        row.getCell("status").fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
      }
      if (isOverdue(task, deal.closingDateX)) {
        row.getCell("due").fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
      }
    }
    ws.getColumn("due").numFmt = "dd mmm yyyy";
    ws.getColumn("updated").numFmt = "dd mmm yyyy";
    styleHeaderRow(ws, phaseColumns.length);
  }

  // Deadlines sheet
  const deadlines = wb.addWorksheet("Deadlines");
  const deadlineColumns = [
    { header: "S.No.", key: "sno", width: 8 },
    { header: "Phase", key: "phase", width: 22 },
    { header: "Action", key: "action", width: 52 },
    { header: "Internal Due", key: "due", width: 14 },
    { header: "Statutory Limit", key: "statutory", width: 24 },
    { header: "Statutory Hard Limit", key: "isStatutory", width: 18 },
    { header: "Status", key: "status", width: 18 }
  ];
  deadlines.columns = deadlineColumns;
  const dated = deal.tasks
    .map((task) => ({ task, date: getComputedDueDate(task, deal.closingDateX) }))
    .filter((item): item is { task: Task; date: Date } => item.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  for (const { task, date } of dated) {
    const row = deadlines.addRow({
      sno: task.serialNumber,
      phase: task.phase,
      action: task.action,
      due: date,
      statutory: statutoryText(task, deal.closingDateX),
      isStatutory: task.filing?.statutoryDays ? "Yes" : "No",
      status: task.status
    });
    row.alignment = { vertical: "top", wrapText: true };
    const fill = statusFillArgb(task.status);
    if (fill) row.getCell("status").fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    if (isOverdue(task, deal.closingDateX)) {
      row.getCell("due").fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
    }
  }
  deadlines.getColumn("due").numFmt = "dd mmm yyyy";
  styleHeaderRow(deadlines, deadlineColumns.length);

  // Owner-wise pending sheet
  const owners = wb.addWorksheet("Owners");
  owners.columns = [
    { header: "Owner", key: "owner", width: 28 },
    { header: "Open Items", key: "count", width: 14 }
  ];
  Object.entries(getOwnerPendingCounts(deal.tasks))
    .sort((a, b) => b[1] - a[1])
    .forEach(([owner, count]) => owners.addRow({ owner, count }));
  styleHeaderRow(owners, 2);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `closing-workbook-${deal.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}
