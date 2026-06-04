import { phases } from "./constants";
import { addDays, getComputedDueDate, getComputedStatutoryDate, getTimelineOffset, parseLocalDate } from "./dateUtils";
import { getCriticalPathTasks, getDependencyWarnings, getReadiness, isTaskComplete } from "./rules";
import type { Deal, DependencyWarning, Phase, ReadinessResult, Task } from "./types";

const DAY_MS = 86_400_000;

export type TimelineZoom = "week" | "month";
export type TimelinePointKind = "internal" | "statutory";

export interface TimelinePoint {
  id: string;
  kind: TimelinePointKind;
  task: Task;
  date: Date;
  x: number;
  offsetDays: number;
  isCritical: boolean;
  isBlocker: boolean;
  isComplete: boolean;
  isOverdue: boolean;
  countdownLabel: string;
}

export interface UnplottedStatutoryItem {
  id: string;
  task: Task;
  label: string;
  detail: string;
  isCritical: boolean;
  isBlocker: boolean;
}

export interface TimelineTaskRow {
  task: Task;
  phase: Phase;
  internalPoint: TimelinePoint;
  statutoryPoint: TimelinePoint | null;
  unplottedStatutory: UnplottedStatutoryItem | null;
  isCritical: boolean;
  isBlocker: boolean;
  isComplete: boolean;
  isOverdue: boolean;
  dependencyWarnings: DependencyWarning[];
}

export interface TimelineModel {
  hasClosingDate: boolean;
  closingDate: Date | null;
  axisStart: Date | null;
  axisEnd: Date | null;
  today: Date;
  todayX: number | null;
  closingX: number | null;
  rowsByPhase: Record<Phase, TimelineTaskRow[]>;
  preCloseRowsByPhase: Record<Phase, TimelineTaskRow[]>;
  postCloseRowsByPhase: Record<Phase, TimelineTaskRow[]>;
  allRows: TimelineTaskRow[];
  preCloseRows: TimelineTaskRow[];
  postCloseRows: TimelineTaskRow[];
  internalPoints: TimelinePoint[];
  statutoryPoints: TimelinePoint[];
  postCloseInternalPoints: TimelinePoint[];
  postCloseStatutoryPoints: TimelinePoint[];
  unplottedStatutory: UnplottedStatutoryItem[];
  dependencyWarnings: DependencyWarning[];
  readiness: ReadinessResult;
  defaultSelectedTaskId: string | null;
  stats: {
    overdue: number;
    blockers: number;
    criticalOpen: number;
    statutoryPlotted: number;
    statutoryUnplotted: number;
    preClose: number;
    postClose: number;
  };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isDate(date: Date | null | undefined): date is Date {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_MS);
}

export function getTimelinePosition(date: Date, axisStart: Date, axisEnd: Date): number {
  const span = axisEnd.getTime() - axisStart.getTime();
  if (span <= 0) return 0;
  return Math.max(0, Math.min(100, ((date.getTime() - axisStart.getTime()) / span) * 100));
}

function maxDate(dates: Date[]): Date {
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function countdownLabel(date: Date, today: Date): string {
  const days = daysBetween(date, today);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `${days}d left`;
}

function emptyRowsByPhase(): Record<Phase, TimelineTaskRow[]> {
  return phases.reduce<Record<Phase, TimelineTaskRow[]>>((acc, phase) => {
    acc[phase] = [];
    return acc;
  }, {} as Record<Phase, TimelineTaskRow[]>);
}

const statusOrder: Record<Task["status"], number> = {
  Blocked: 0,
  "With Client": 1,
  "With Investor Counsel": 1,
  "Not Started": 2,
  "In Progress": 3,
  "Under Review": 4,
  Completed: 5,
  Waived: 6,
  "Converted to CS": 6,
  "Not Applicable": 7
};

function compareSequenceRows(a: TimelineTaskRow, b: TimelineTaskRow): number {
  if (a.isBlocker !== b.isBlocker) return Number(b.isBlocker) - Number(a.isBlocker);
  if (a.isCritical !== b.isCritical) return Number(b.isCritical) - Number(a.isCritical);
  const statusDelta = statusOrder[a.task.status] - statusOrder[b.task.status];
  if (statusDelta !== 0) return statusDelta;
  return a.task.serialNumber.localeCompare(b.task.serialNumber, "en", { numeric: true });
}

function compareCalendarRows(a: TimelineTaskRow, b: TimelineTaskRow): number {
  if (a.isComplete !== b.isComplete) return Number(a.isComplete) - Number(b.isComplete);
  if (a.isBlocker !== b.isBlocker) return Number(b.isBlocker) - Number(a.isBlocker);
  if (a.isCritical !== b.isCritical) return Number(b.isCritical) - Number(a.isCritical);
  return a.internalPoint.date.getTime() - b.internalPoint.date.getTime();
}

export function getStatutoryTriggerLabel(task: Pick<Task, "filing" | "statutoryDeadlineNote">): string | null {
  if (task.statutoryDeadlineNote) return task.statutoryDeadlineNote;
  if (!task.filing) return null;
  if (task.filing.statutoryDays) return `${task.filing.statutoryDays} days from ${task.filing.statutoryTrigger ?? "statutory trigger"}`;
  return `${task.filing.form} - ${task.filing.authority}`;
}

export function buildTimelineModel(deal: Deal, now = new Date()): TimelineModel {
  const today = startOfDay(now);
  const closingDate = parseLocalDate(deal.closingDateX);
  const readiness = getReadiness(deal);
  const dependencyWarnings = getDependencyWarnings(deal.tasks);
  const warningsByTask = new Map<string, DependencyWarning[]>();
  for (const warning of dependencyWarnings) {
    const list = warningsByTask.get(warning.blockedTaskId) ?? [];
    list.push(warning);
    warningsByTask.set(warning.blockedTaskId, list);
  }

  const emptyRows = emptyRowsByPhase();

  if (!closingDate) {
    return {
      hasClosingDate: false,
      closingDate: null,
      axisStart: null,
      axisEnd: null,
      today,
      todayX: null,
      closingX: null,
      rowsByPhase: emptyRows,
      preCloseRowsByPhase: emptyRowsByPhase(),
      postCloseRowsByPhase: emptyRowsByPhase(),
      allRows: [],
      preCloseRows: [],
      postCloseRows: [],
      internalPoints: [],
      statutoryPoints: [],
      postCloseInternalPoints: [],
      postCloseStatutoryPoints: [],
      unplottedStatutory: [],
      dependencyWarnings,
      readiness,
      defaultSelectedTaskId: null,
      stats: {
        overdue: 0,
        blockers: deal.tasks.filter((task) => task.blocker && !isTaskComplete(task)).length,
        criticalOpen: 0,
        statutoryPlotted: 0,
        statutoryUnplotted: 0,
        preClose: 0,
        postClose: 0
      }
    };
  }

  const criticalIds = new Set(getCriticalPathTasks(deal.tasks).map((task) => task.id));

  const internalPoints: TimelinePoint[] = [];
  const statutoryPoints: TimelinePoint[] = [];
  const unplottedStatutory: UnplottedStatutoryItem[] = [];
  const allRows: TimelineTaskRow[] = [];
  const preCloseRows: TimelineTaskRow[] = [];
  const postCloseRows: TimelineTaskRow[] = [];
  const rowsByPhase = emptyRowsByPhase();
  const preCloseRowsByPhase = emptyRowsByPhase();
  const postCloseRowsByPhase = emptyRowsByPhase();

  for (const task of deal.tasks) {
    const dueDate = getComputedDueDate(task, deal.closingDateX);
    if (!dueDate) continue;

    const statutoryDate = getComputedStatutoryDate(task, deal.closingDateX);
    const isComplete = isTaskComplete(task);
    const isCritical = criticalIds.has(task.id);
    const isBlocker = task.blocker && !isComplete;
    const isOverdue = !isComplete && dueDate < today;
    const offsetDays = getTimelineOffset(task);
    const internalPoint: TimelinePoint = {
      id: `${task.id}:internal`,
      kind: "internal",
      task,
      date: dueDate,
      x: 0,
      offsetDays,
      isCritical,
      isBlocker,
      isComplete,
      isOverdue,
      countdownLabel: countdownLabel(dueDate, today)
    };
    internalPoints.push(internalPoint);

    const statutoryPoint: TimelinePoint | null = statutoryDate
      ? {
          id: `${task.id}:statutory`,
          kind: "statutory",
          task,
          date: statutoryDate,
          x: 0,
          offsetDays: daysBetween(statutoryDate, closingDate),
          isCritical,
          isBlocker,
          isComplete,
          isOverdue: !isComplete && statutoryDate < today,
          countdownLabel: countdownLabel(statutoryDate, today)
        }
      : null;

    if (statutoryPoint) statutoryPoints.push(statutoryPoint);

    const triggerLabel = getStatutoryTriggerLabel(task);
    const unplotted = triggerLabel && !statutoryDate
      ? {
          id: `${task.id}:statutory-unplotted`,
          task,
          label: task.filing?.form ?? task.serialNumber,
          detail: triggerLabel,
          isCritical,
          isBlocker
        }
      : null;

    if (unplotted) unplottedStatutory.push(unplotted);

    const row: TimelineTaskRow = {
      task,
      phase: task.phase,
      internalPoint,
      statutoryPoint,
      unplottedStatutory: unplotted,
      isCritical,
      isBlocker,
      isComplete,
      isOverdue,
      dependencyWarnings: warningsByTask.get(task.id) ?? []
    };

    rowsByPhase[task.phase].push(row);
    allRows.push(row);
    if (offsetDays <= 0) {
      preCloseRowsByPhase[task.phase].push(row);
      preCloseRows.push(row);
    } else {
      postCloseRowsByPhase[task.phase].push(row);
      postCloseRows.push(row);
    }
  }

  const postCloseDates = postCloseRows.flatMap((row) => [row.internalPoint.date, row.statutoryPoint?.date].filter(isDate));
  const latestPostClose = postCloseDates.length ? maxDate([...postCloseDates, closingDate, today > closingDate ? today : closingDate]) : addDays(closingDate, 30);
  const axisStart = closingDate;
  const margin = Math.max(2, Math.round(daysBetween(latestPostClose, closingDate) * 0.04));
  const axisEnd = addDays(latestPostClose, margin);
  const todayX = getTimelinePosition(today, axisStart, axisEnd);
  const closingX = getTimelinePosition(closingDate, axisStart, axisEnd);

  for (const point of internalPoints) {
    point.x = getTimelinePosition(point.date, axisStart, axisEnd);
  }
  for (const point of statutoryPoints) {
    point.x = getTimelinePosition(point.date, axisStart, axisEnd);
  }

  const postCloseInternalPoints = postCloseRows.map((row) => row.internalPoint);
  const postCloseStatutoryPoints = postCloseRows
    .map((row) => row.statutoryPoint)
    .filter((point): point is TimelinePoint => Boolean(point));

  for (const phase of phases) {
    rowsByPhase[phase].sort(compareCalendarRows);
    preCloseRowsByPhase[phase].sort(compareSequenceRows);
    postCloseRowsByPhase[phase].sort(compareCalendarRows);
  }
  preCloseRows.sort(compareSequenceRows);
  postCloseRows.sort(compareCalendarRows);

  const defaultSelectedTaskId =
    preCloseRows.find((row) => row.isBlocker)?.task.id ??
    preCloseRows.find((row) => row.isCritical && !row.isComplete)?.task.id ??
    allRows.find((row) => row.isOverdue)?.task.id ??
    postCloseRows.find((row) => row.isBlocker)?.task.id ??
    postCloseRows.find((row) => row.isCritical && !row.isComplete)?.task.id ??
    allRows[0]?.task.id ??
    null;

  return {
    hasClosingDate: true,
    closingDate,
    axisStart,
    axisEnd,
    today,
    todayX,
    closingX,
    rowsByPhase,
    preCloseRowsByPhase,
    postCloseRowsByPhase,
    allRows,
    preCloseRows,
    postCloseRows,
    internalPoints,
    statutoryPoints,
    postCloseInternalPoints,
    postCloseStatutoryPoints,
    unplottedStatutory,
    dependencyWarnings,
    readiness,
    defaultSelectedTaskId,
    stats: {
      overdue: allRows.filter((row) => row.isOverdue).length,
      blockers: allRows.filter((row) => row.isBlocker).length,
      criticalOpen: allRows.filter((row) => row.isCritical && !row.isComplete).length,
      statutoryPlotted: statutoryPoints.length,
      statutoryUnplotted: unplottedStatutory.length,
      preClose: preCloseRows.length,
      postClose: postCloseRows.length
    }
  };
}

export function getTimelineTicks(axisStart: Date, axisEnd: Date, zoom: TimelineZoom): Date[] {
  const intervalDays = zoom === "week" ? 7 : 30;
  const ticks: Date[] = [];
  let cursor = startOfDay(axisStart);
  while (cursor <= axisEnd) {
    ticks.push(cursor);
    cursor = addDays(cursor, intervalDays);
  }
  if (!ticks.some((tick) => tick.getTime() === axisEnd.getTime())) ticks.push(axisEnd);
  return ticks;
}

export function getTimelineAxisWidth(zoom: TimelineZoom): number {
  return zoom === "week" ? 1320 : 920;
}
