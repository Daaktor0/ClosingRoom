import { formatDate, formatDeadlinePair, getComputedDueDate, getComputedStatutoryDate } from "./dateUtils";
import { getOwnerPendingCounts, getReadiness, isTaskComplete } from "./rules";
import type { Deal, Task } from "./types";

function csvEscape(value: string): string {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

function dueDate(task: Task, deal: Deal): string {
  return formatDate(getComputedDueDate(task, deal.closingDateX));
}

export function exportTasksCsv(deal: Deal): string {
  const headers = [
    "S. No.",
    "Phase",
    "Timeline",
    "Computed Due Date",
    "Statutory Deadline",
    "Action",
    "Responsible Parties",
    "Status",
    "Evidence",
    "Risk",
    "Blocker",
    "Owner",
    "Last Updated",
    "Source"
  ];
  const rows = deal.tasks.map((task) => [
    task.serialNumber,
    task.phase,
    task.timeline,
    dueDate(task, deal),
    task.filing?.statutoryDays ? formatDate(getComputedStatutoryDate(task, deal.closingDateX)) : task.statutoryDeadlineNote ?? "",
    task.action,
    task.parties.join("; "),
    task.status,
    `${task.evidence.satisfied ? "Satisfied / linked" : "Missing"} - ${task.evidence.label}`,
    task.riskCategory,
    task.blocker ? "Yes" : "No",
    task.owner,
    task.lastUpdated,
    task.sourceReference
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function exportDealJson(deal: Deal): string {
  return JSON.stringify(deal, null, 2);
}

export function exportMarkdownReport(deal: Deal): string {
  const readiness = getReadiness(deal);
  const completed = deal.tasks.filter(isTaskComplete);
  const pendingBlockers = readiness.blockers;
  const upcoming = deal.tasks
    .filter((task) => !isTaskComplete(task))
    .map((task) => ({ task, date: getComputedDueDate(task, deal.closingDateX) }))
    .filter((item) => item.date)
    .sort((a, b) => Number(a.date) - Number(b.date))
    .slice(0, 8);
  const ownerCounts = getOwnerPendingCounts(deal.tasks);

  return `# Closing Status Report - ${deal.name}

**Company:** ${deal.companyName}  
**Investor:** ${deal.investorName}  
**Closing Date X:** ${deal.closingDateX ? formatDate(getComputedDueDate({ timeline: "X" }, deal.closingDateX)) : "Not set"}  
**Closing Readiness:** ${readiness.ready ? "Ready to close" : "Not ready to close"} (${readiness.score}%)

## Executive Conclusion
${readiness.ready ? "The tracker indicates that mandatory pre-closing items and CPs are operationally satisfied." : "The tracker indicates that closing should not proceed until the pending blockers and missing evidence below are resolved, waived or converted to CS where appropriate."}

## Completed Items
${completed.length ? completed.map((task) => `- ${task.serialNumber}: ${task.action}`).join("\n") : "- None recorded."}

## Pending Blockers
${pendingBlockers.length ? pendingBlockers.map((task) => `- ${task.serialNumber}: ${task.action} (${task.owner})`).join("\n") : "- No active blockers."}

## Upcoming Deadlines
${upcoming.length ? upcoming.map(({ task }) => `- ${task.serialNumber}: ${formatDeadlinePair(task, deal.closingDateX)} - ${task.action}`).join("\n") : "- Set Closing Date X to compute deadlines."}

## Owner-wise Pending Items
${Object.entries(ownerCounts).length ? Object.entries(ownerCounts).map(([owner, count]) => `- ${owner}: ${count}`).join("\n") : "- No pending items."}

## Post-closing Deadlines
${deal.tasks.filter((task) => task.phase === "Post-Closing Actions").map((task) => `- ${task.serialNumber}: ${task.timeline} / ${formatDeadlinePair(task, deal.closingDateX)} - ${task.action} [${task.status}]`).join("\n")}
`;
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
