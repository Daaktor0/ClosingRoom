import { daysUntil, getComputedDueDate, isOverdue } from "./dateUtils";
import { percent } from "./utils";
import type { Deal, DependencyWarning, Phase, ReadinessResult, Task, TaskStatus } from "./types";

export const completeStatuses: TaskStatus[] = ["Completed", "Waived", "Converted to CS", "Not Applicable"];
export const operationallyCompleteStatuses: TaskStatus[] = ["Completed", "Waived", "Converted to CS", "Not Applicable"];

export function isTaskComplete(task: Task): boolean {
  return completeStatuses.includes(task.status);
}

export function isTaskSatisfiedForClosing(task: Task): boolean {
  if (task.phase === "Conditions Precedent") {
    return ["Completed", "Waived", "Converted to CS", "Not Applicable"].includes(task.status);
  }
  return ["Completed", "Not Applicable"].includes(task.status);
}

export function getPhaseTasks(tasks: Task[], phase: Phase): Task[] {
  return tasks.filter((task) => task.phase === phase);
}

export function getCompletionPercent(tasks: Task[]): number {
  return percent(tasks.filter(isTaskComplete).length, tasks.length);
}

export function getPostClosingComplianceScore(tasks: Task[]): number {
  return getCompletionPercent(getPhaseTasks(tasks, "Post-Closing Actions"));
}

export function getReadiness(deal: Deal): ReadinessResult {
  const tasks = deal.tasks;
  const cps = getPhaseTasks(tasks, "Conditions Precedent");
  const closingPrerequisites = tasks.filter((task) => task.timeline === "Prior to X" && task.mandatoryForClosing);
  const mandatoryIncomplete = closingPrerequisites.filter((task) => !isTaskSatisfiedForClosing(task));
  const pendingCps = cps.filter((task) => !isTaskSatisfiedForClosing(task));
  const waivedCps = cps.filter((task) => task.status === "Waived");
  const convertedToCs = cps.filter((task) => task.status === "Converted to CS");
  const blockers = tasks.filter((task) => task.blocker && !isTaskSatisfiedForClosing(task));
  const missingEvidence = closingPrerequisites.filter(
    (task) => task.evidence.required && !task.evidence.uploaded && !["Waived", "Converted to CS", "Not Applicable"].includes(task.status)
  );
  const missingAgreedForm = closingPrerequisites.filter(
    (task) => task.agreedFormRequired && task.documentStatus !== "Agreed Form" && task.documentStatus !== "Executed" && task.status !== "Waived"
  );

  const requiredIds = [
    "cp-valuation-certificate",
    "cp-board-approval",
    "cp-egm-approval",
    "cp-sh7-mgt14",
    "cp-transaction-docs-execution",
    "cp-pas4-pas5",
    "cp-agreed-form-documents",
    "cp-fulfilment-certificate"
  ];

  const criticalFailures = requiredIds
    .map((id) => tasks.find((task) => task.id === id))
    .filter((task): task is Task => Boolean(task))
    .filter((task) => !isTaskSatisfiedForClosing(task));

  const warnings = [
    ...criticalFailures.map((task) => `${task.serialNumber} ${task.action.slice(0, 96)}${task.action.length > 96 ? "..." : ""}`),
    ...getDependencyWarnings(tasks).map((warning) => warning.label)
  ];

  const totalReadinessChecks = closingPrerequisites.length + requiredIds.length;
  const failedChecks = new Set([...mandatoryIncomplete, ...criticalFailures, ...missingEvidence, ...missingAgreedForm].map((task) => task.id)).size;
  const score = Math.max(0, percent(totalReadinessChecks - failedChecks, totalReadinessChecks));

  return {
    ready: failedChecks === 0 && blockers.length === 0,
    score,
    blockers,
    pendingCps,
    waivedCps,
    convertedToCs,
    missingEvidence,
    missingAgreedForm,
    mandatoryIncomplete,
    warnings
  };
}

export function getDependencyWarnings(tasks: Task[]): DependencyWarning[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const warnings: DependencyWarning[] = [];

  for (const task of tasks) {
    if (isTaskComplete(task)) continue;
    for (const dependency of task.dependencies) {
      const prerequisite = byId.get(dependency.taskId);
      if (!prerequisite || isTaskComplete(prerequisite)) continue;
      warnings.push({
        id: `${dependency.taskId}->${task.id}`,
        label: `${dependency.label}: ${prerequisite.serialNumber} is ${prerequisite.status}, blocking ${task.serialNumber}.`,
        blockedTaskId: task.id,
        prerequisiteTaskId: prerequisite.id,
        severity: task.priority === "Critical" || prerequisite.priority === "Critical" ? "High" : "Medium"
      });
    }
  }

  return warnings;
}

export function getUpcomingDeadlines(deal: Deal, limit = 6): Task[] {
  return deal.tasks
    .filter((task) => !isTaskComplete(task))
    .map((task) => ({ task, days: daysUntil(task, deal.closingDateX) }))
    .filter((item): item is { task: Task; days: number } => item.days !== null && item.days >= 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, limit)
    .map((item) => item.task);
}

export function getOverdueTasks(deal: Deal): Task[] {
  return deal.tasks.filter((task) => isOverdue(task, deal.closingDateX));
}

export function getCriticalPathTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => task.priority === "Critical" || task.blocker || task.dependencies.length > 0);
}

export function getNextBestAction(deal: Deal): Task | null {
  const byId = new Map(deal.tasks.map((task) => [task.id, task]));
  const priorityScore: Record<Task["priority"], number> = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1
  };

  const candidates = deal.tasks.filter((task) => {
    if (isTaskComplete(task) || task.status === "Blocked") return false;
    return task.dependencies.every((dependency) => {
      const prerequisite = byId.get(dependency.taskId);
      return !prerequisite || isTaskComplete(prerequisite);
    });
  });

  return candidates.sort((a, b) => {
    const blockerDelta = Number(b.blocker) - Number(a.blocker);
    if (blockerDelta !== 0) return blockerDelta;
    const priorityDelta = priorityScore[b.priority] - priorityScore[a.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return Number(getComputedDueDate(a, deal.closingDateX) ?? Number.MAX_SAFE_INTEGER) - Number(getComputedDueDate(b, deal.closingDateX) ?? Number.MAX_SAFE_INTEGER);
  })[0] ?? null;
}

export function getOwnerPendingCounts(tasks: Task[]): Record<string, number> {
  return tasks.reduce<Record<string, number>>((acc, task) => {
    if (isTaskComplete(task)) return acc;
    acc[task.owner] = (acc[task.owner] ?? 0) + 1;
    return acc;
  }, {});
}
