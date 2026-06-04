import {
  daysUntil,
  formatDate,
  getComputedDueDate,
  getComputedStatutoryDate,
  isOverdue,
  parseLocalDate
} from "./dateUtils";
import { getCriticalPathTasks, getNextBestAction, getReadiness, isTaskComplete } from "./rules";
import type { Deal, ReadinessResult, Task } from "./types";

export type BriefDisposition = "unset" | "ready" | "on-track" | "at-risk" | "overdue";

export type BriefReadKind = "blockers" | "statutory" | "critical-path";

export interface BriefInstrumentRead {
  kind: BriefReadKind;
  label: string;
  count: number;
  task: Task | null;
  date: Date | null;
  days: number | null;
  clearText: string;
  drillInLabel: string;
}

export interface BriefHeadlineProjection {
  dealName: string;
  closingDateX: string;
  closingDate: Date | null;
  readinessReady: boolean;
  readinessScore: number;
  blockers: number;
  overdue: number;
  criticalOpen: number;
  statutoryOnClock: number;
  daysToClose: number | null;
}

export interface BriefModel {
  dealName: string;
  companyName: string;
  investorName: string;
  closingDateX: string;
  closingDate: Date | null;
  hasClosingDate: boolean;
  daysToClose: number | null;
  disposition: BriefDisposition;
  headline: string;
  projection: BriefHeadlineProjection;
  readiness: ReadinessResult;
  nextBestAction: Task | null;
  overdueTasks: Task[];
  criticalOpenTasks: Task[];
  statutoryOpenTasks: Task[];
  reads: Record<BriefReadKind, BriefInstrumentRead>;
}

const priorityScore: Record<Task["priority"], number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1
};

export function buildBriefModel(deal: Deal, now = new Date()): BriefModel {
  const readiness = getReadiness(deal);
  const closingDate = parseLocalDate(deal.closingDateX);
  const overdueTasks = deal.tasks.filter((task) => isOverdue(task, deal.closingDateX, now));
  const criticalOpenTasks = getCriticalPathTasks(deal.tasks)
    .filter((task) => !isTaskComplete(task))
    .sort((a, b) => compareTaskUrgency(a, b, deal.closingDateX, now));
  const statutoryOpenTasks = deal.tasks
    .filter((task) => Boolean(task.filing) && !isTaskComplete(task))
    .sort((a, b) => compareStatutoryUrgency(a, b, deal.closingDateX, now));

  const projection: BriefHeadlineProjection = {
    dealName: deal.name || "This deal",
    closingDateX: deal.closingDateX,
    closingDate,
    readinessReady: readiness.ready,
    readinessScore: readiness.score,
    blockers: readiness.blockers.length,
    overdue: overdueTasks.length,
    criticalOpen: criticalOpenTasks.length,
    statutoryOnClock: statutoryOpenTasks.length,
    daysToClose: closingDate ? daysBetween(todayOnly(now), closingDate) : null
  };

  const statutoryTask = statutoryOpenTasks[0] ?? null;

  return {
    dealName: projection.dealName,
    companyName: deal.companyName,
    investorName: deal.investorName,
    closingDateX: deal.closingDateX,
    closingDate,
    hasClosingDate: Boolean(closingDate),
    daysToClose: projection.daysToClose,
    disposition: getBriefDisposition(projection),
    headline: buildBriefHeadline(projection),
    projection,
    readiness,
    nextBestAction: getNextBestAction(deal),
    overdueTasks,
    criticalOpenTasks,
    statutoryOpenTasks,
    reads: {
      blockers: {
        kind: "blockers",
        label: "Blockers",
        count: readiness.blockers.length,
        task: [...readiness.blockers].sort((a, b) => compareTaskUrgency(a, b, deal.closingDateX, now))[0] ?? null,
        date: null,
        days: null,
        clearText: "No active closing blockers.",
        drillInLabel: "Open checklist"
      },
      statutory: {
        kind: "statutory",
        label: "Statutory clock",
        count: statutoryOpenTasks.length,
        task: statutoryTask,
        date: statutoryTask ? getStatutoryOrInternalDate(statutoryTask, deal.closingDateX) : null,
        days: statutoryTask ? getStatutoryOrInternalDays(statutoryTask, deal.closingDateX, now) : null,
        clearText: "No open statutory filings.",
        drillInLabel: "Open timeline"
      },
      "critical-path": {
        kind: "critical-path",
        label: "Critical path",
        count: criticalOpenTasks.length,
        task: criticalOpenTasks[0] ?? null,
        date: criticalOpenTasks[0] ? getComputedDueDate(criticalOpenTasks[0], deal.closingDateX) : null,
        days: criticalOpenTasks[0] ? daysUntil(criticalOpenTasks[0], deal.closingDateX, now) : null,
        clearText: "Critical path is clear.",
        drillInLabel: "Open timeline"
      }
    }
  };
}

export function getBriefDisposition(projection: BriefHeadlineProjection): BriefDisposition {
  if (!projection.closingDate) return "unset";
  if (projection.readinessReady) return "ready";
  if (projection.daysToClose !== null && projection.daysToClose < 0) return "overdue";
  if (projection.blockers > 0 || projection.overdue > 0) return "at-risk";
  return "on-track";
}

export function buildBriefHeadline(projection: BriefHeadlineProjection): string {
  const disposition = getBriefDisposition(projection);
  const name = projection.dealName;

  if (disposition === "unset") {
    return `Set Closing Date X to generate ${name}'s closing brief.`;
  }

  const xDate = formatDate(projection.closingDate);

  if (disposition === "ready") {
    if (projection.daysToClose !== null && projection.daysToClose < 0) {
      return `${name} is ready to close. X was ${xDate}. Nothing stands between you and a clean close.`;
    }
    return `${name} is ready to close on ${xDate}. Nothing stands between you and a clean close.`;
  }

  const obstacleClause = buildObstacleClause(projection, disposition);
  if (disposition === "overdue") {
    return `${name}'s ${xDate} close date has passed with items still open. ${obstacleClause}`;
  }
  if (disposition === "at-risk") {
    return `${name}'s ${xDate} close is at risk. ${obstacleClause}`;
  }
  return `${name} is tracking to close on ${xDate}. ${obstacleClause}`;
}

function buildObstacleClause(projection: BriefHeadlineProjection, disposition: BriefDisposition): string {
  const parts = [
    pluralize(projection.blockers, "blocker"),
    pluralize(projection.statutoryOnClock, "statutory filing"),
    disposition === "overdue" ? null : pluralize(projection.overdue, "overdue item")
  ].filter((part): part is string => Boolean(part));

  if (!parts.length) return "Nothing stands in the way.";
  return `${naturalJoin(parts)} stand between you and a clean close.`;
}

function pluralize(count: number, label: string): string | null {
  if (!count) return null;
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function naturalJoin(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function compareTaskUrgency(a: Task, b: Task, closingDateX: string, now: Date): number {
  const blockerDelta = Number(b.blocker) - Number(a.blocker);
  if (blockerDelta !== 0) return blockerDelta;

  const priorityDelta = priorityScore[b.priority] - priorityScore[a.priority];
  if (priorityDelta !== 0) return priorityDelta;

  return getSortTime(getComputedDueDate(a, closingDateX)) - getSortTime(getComputedDueDate(b, closingDateX))
    || (daysUntil(a, closingDateX, now) ?? Number.MAX_SAFE_INTEGER) - (daysUntil(b, closingDateX, now) ?? Number.MAX_SAFE_INTEGER);
}

function compareStatutoryUrgency(a: Task, b: Task, closingDateX: string, now: Date): number {
  return getSortTime(getStatutoryOrInternalDate(a, closingDateX)) - getSortTime(getStatutoryOrInternalDate(b, closingDateX))
    || compareTaskUrgency(a, b, closingDateX, now);
}

function getSortTime(date: Date | null): number {
  return date?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function getStatutoryOrInternalDate(task: Task, closingDateX: string): Date | null {
  return getComputedStatutoryDate(task, closingDateX) ?? getComputedDueDate(task, closingDateX);
}

function getStatutoryOrInternalDays(task: Task, closingDateX: string, now: Date): number | null {
  const date = getStatutoryOrInternalDate(task, closingDateX);
  if (!date) return null;
  return daysBetween(todayOnly(now), date);
}

function todayOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((todayOnly(to).getTime() - todayOnly(from).getTime()) / 86_400_000);
}
