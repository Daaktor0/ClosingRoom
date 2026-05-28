import type { Task, TimelineCode } from "./types";

const timelineOffsets: Record<Exclude<TimelineCode, "Custom">, number> = {
  "Prior to X": -1,
  X: 0,
  "X+10": 10,
  "X+30": 30,
  "X+60": 60,
  "X+90": 90
};

export function parseLocalDate(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function formatDate(date: Date | null): string {
  if (!date) return "Set Closing Date X";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getTimelineOffset(task: Pick<Task, "timeline" | "customOffsetDays">): number {
  if (task.timeline === "Custom") return task.customOffsetDays ?? 0;
  return timelineOffsets[task.timeline];
}

export function getComputedDueDate(task: Pick<Task, "timeline" | "customOffsetDays">, closingDateX: string): Date | null {
  const closingDate = parseLocalDate(closingDateX);
  if (!closingDate) return null;
  return addDays(closingDate, getTimelineOffset(task));
}

export function getComputedStatutoryDate(task: Pick<Task, "filing">, closingDateX: string): Date | null {
  const closingDate = parseLocalDate(closingDateX);
  if (!closingDate || !task.filing?.statutoryDays) return null;
  if (task.filing.statutoryTrigger === "Resolution" || task.filing.statutoryTrigger === "Internal") return null;
  return addDays(closingDate, task.filing.statutoryDays);
}

export function formatDeadlinePair(task: Pick<Task, "timeline" | "customOffsetDays" | "filing" | "statutoryDeadlineNote">, closingDateX: string): string {
  const internalDate = formatDate(getComputedDueDate(task, closingDateX));
  const statutoryDate = getComputedStatutoryDate(task, closingDateX);
  if (statutoryDate) return `${internalDate} internal / ${formatDate(statutoryDate)} statutory`;
  if (task.statutoryDeadlineNote) return `${internalDate} internal / ${task.statutoryDeadlineNote}`;
  if (task.filing?.statutoryDays) return `${internalDate} internal / ${task.filing.statutoryDays} days from ${task.filing.statutoryTrigger ?? "trigger"}`;
  return internalDate;
}

export function isOverdue(task: Task, closingDateX: string, now = new Date()): boolean {
  if (["Completed", "Waived", "Converted to CS", "Not Applicable"].includes(task.status)) return false;
  const dueDate = getComputedDueDate(task, closingDateX);
  if (!dueDate) return false;
  return dueDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function daysUntil(task: Task, closingDateX: string, now = new Date()): number | null {
  const dueDate = getComputedDueDate(task, closingDateX);
  if (!dueDate) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000);
}

export type DeadlineUrgency = "overdue" | "due-soon" | "upcoming" | "none";

export function getDeadlineUrgency(task: Task, closingDateX: string, now = new Date()): DeadlineUrgency {
  if (["Completed", "Waived", "Converted to CS", "Not Applicable"].includes(task.status)) return "none";
  const days = daysUntil(task, closingDateX, now);
  if (days === null) return "none";
  if (days < 0) return "overdue";
  if (days <= 7) return "due-soon";
  return "upcoming";
}

export const deadlineUrgencyTone: Record<DeadlineUrgency, "neutral" | "warning" | "danger"> = {
  overdue: "danger",
  "due-soon": "warning",
  upcoming: "neutral",
  none: "neutral"
};

export function deadlineCountdownLabel(task: Task, closingDateX: string, now = new Date()): string | null {
  const days = daysUntil(task, closingDateX, now);
  if (days === null) return null;
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `${days}d left`;
}

export const timelineBuckets: TimelineCode[] = ["Prior to X", "X", "X+10", "X+30", "X+60", "X+90"];
