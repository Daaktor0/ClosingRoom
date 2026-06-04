"use client";

import { CalendarClock, GitBranch, Lock, TriangleAlert } from "lucide-react";
import { Badge, StatusPill, TaskRef, deriveTaskLabel } from "@/components/ui";
import { phases } from "@/lib/constants";
import { formatDate } from "@/lib/dateUtils";
import {
  getTimelineAxisWidth,
  getTimelinePosition,
  getTimelineTicks,
  type TimelineModel,
  type TimelinePoint,
  type TimelineTaskRow,
  type TimelineZoom
} from "@/lib/timeline";
import { cn } from "@/lib/utils";

interface TimelineAxisProps {
  model: TimelineModel;
  zoom: TimelineZoom;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}

export function TimelineAxis({ model, zoom, selectedTaskId, onSelectTask }: TimelineAxisProps) {
  if (!model.axisStart || !model.axisEnd) return null;

  const axisWidth = getTimelineAxisWidth(zoom);
  const labelWidth = 340;
  const gridStyle = { gridTemplateColumns: `${labelWidth}px ${axisWidth}px` };
  const totalWidth = labelWidth + axisWidth;
  const ticks = getTimelineTicks(model.axisStart, model.axisEnd, zoom);
  const calendarPhases = phases.filter((phase) => model.postCloseRowsByPhase[phase].length > 0);
  const visiblePhases = calendarPhases.length ? calendarPhases : phases.filter((phase) => phase === "Post-Closing Actions");

  return (
    <div className="overflow-x-auto pb-2 scrollbar-thin">
      <div className="grid gap-3" style={{ minWidth: totalWidth }}>
        <div className="grid overflow-hidden rounded-md border border-[var(--line)] bg-[var(--panel)]" style={gridStyle}>
          <div className="border-r border-[var(--line)] p-4">
            <p className="font-display text-lg font-semibold">After-close calendar</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              {formatDate(model.axisStart)} to {formatDate(model.axisEnd)}
            </p>
          </div>
          <div className="relative h-20 border-b border-[var(--line)] bg-[var(--panel-strong)]/45">
            {ticks.map((tick) => (
              <div
                key={tick.toISOString()}
                className="absolute top-0 h-full border-l border-[var(--line)]/70"
                style={{ left: `${getTimelinePosition(tick, model.axisStart!, model.axisEnd!)}%` }}
              >
                <span className="absolute left-2 top-3 whitespace-nowrap font-measure text-[0.65rem] font-medium text-[var(--muted)]">
                  {formatDate(tick)}
                </span>
              </div>
            ))}
            <AxisMarker x={model.todayX} label="Today" tone="today" />
            <AxisMarker x={model.closingX} label="Closing Date X" tone="closing" />
          </div>
        </div>

        {visiblePhases.map((phase) => {
          const rows = model.postCloseRowsByPhase[phase];
          return (
            <section key={phase} className="overflow-hidden rounded-md border border-[var(--line)] bg-[var(--panel)]">
              <div className="grid border-b border-[var(--line)] bg-[var(--panel-strong)]/45" style={gridStyle}>
                <div className="border-r border-[var(--line)] px-4 py-3">
                  <p className="font-display text-lg font-semibold">{phase}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{rows.length} post-close items</p>
                </div>
                <div className="relative min-h-14">
                  <BandMarker x={model.todayX} tone="today" />
                  <BandMarker x={model.closingX} tone="closing" />
                </div>
              </div>
              {rows.length ? rows.map((row) => (
                  <TimelineRow
                    key={row.task.id}
                    row={row}
                    model={model}
                    gridStyle={gridStyle}
                    selected={selectedTaskId === row.task.id}
                    onSelectTask={onSelectTask}
                  />
                )) : (
                  <div className="grid border-b border-[var(--line)] text-left last:border-b-0" style={gridStyle}>
                    <div className="border-r border-[var(--line)] p-3 text-sm text-[var(--muted)]">No post-close items to plot.</div>
                    <div className="relative min-h-20 bg-[var(--panel)]">
                      <BandMarker x={model.todayX} tone="today" />
                      <BandMarker x={model.closingX} tone="closing" />
                      <div className="absolute left-0 right-0 top-1/2 border-t border-[var(--line)]" />
                    </div>
                  </div>
                )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function AxisMarker({ x, label, tone }: { x: number | null; label: string; tone: "today" | "closing" }) {
  if (x === null) return null;
  const color = tone === "today" ? "var(--foreground)" : "var(--accent)";
  return (
    <div className="absolute top-0 h-full" style={{ left: `${x}%` }}>
      <div className="h-full border-l-2" style={{ borderColor: color }} />
      <span
        className={cn(
          "absolute top-10 -translate-x-1/2 whitespace-nowrap rounded-full border px-2 py-1 text-[0.65rem] font-semibold uppercase",
          tone === "today" ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-teal-700/10 text-[var(--accent)]"
        )}
        style={{ borderColor: color }}
      >
        {label}
      </span>
    </div>
  );
}

function BandMarker({ x, tone }: { x: number | null; tone: "today" | "closing" }) {
  if (x === null) return null;
  return (
    <div
      className={cn("absolute inset-y-0 border-l", tone === "today" ? "border-[var(--foreground)]/45" : "border-[var(--accent)]/60")}
      style={{ left: `${x}%` }}
    />
  );
}

function TimelineRow({
  row,
  model,
  gridStyle,
  selected,
  onSelectTask
}: {
  row: TimelineTaskRow;
  model: TimelineModel;
  gridStyle: React.CSSProperties;
  selected: boolean;
  onSelectTask: (taskId: string) => void;
}) {
  const task = row.task;

  return (
    <div
      className={cn(
        "grid w-full border-b border-[var(--line)] text-left transition last:border-b-0 hover:bg-[var(--panel-strong)]/45",
        selected ? "bg-teal-700/10" : "",
        row.isOverdue ? "bg-red-700/5" : ""
      )}
      style={gridStyle}
    >
      <button
        type="button"
        onClick={() => onSelectTask(task.id)}
        className={cn(
          "border-r border-[var(--line)] p-3 text-left transition hover:bg-[var(--panel-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]",
          row.isCritical ? "border-l-4 border-l-[var(--foreground)]" : "border-l-4 border-l-transparent"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug">
              <TaskRef task={task} />
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusPill status={task.status} />
              {row.isBlocker ? <Badge tone="danger"><TriangleAlert size={12} />Blocker</Badge> : null}
              {row.isCritical ? <Badge>Critical path</Badge> : null}
              {row.unplottedStatutory ? <Badge tone="statutory"><Lock size={12} />{row.unplottedStatutory.label}</Badge> : null}
              {row.dependencyWarnings.length ? <Badge tone="warning"><GitBranch size={12} />Sequencing</Badge> : null}
            </div>
          </div>
        </div>
      </button>

      <div className="relative min-h-[6.75rem] overflow-hidden bg-[var(--panel)]">
        <BandMarker x={model.todayX} tone="today" />
        <BandMarker x={model.closingX} tone="closing" />
        <div className="absolute left-0 right-0 top-1/2 border-t border-[var(--line)]" />
        <TimelineMarker point={row.internalPoint} selected={selected} onSelectTask={onSelectTask} />
        {row.statutoryPoint ? <TimelineMarker point={row.statutoryPoint} selected={selected} onSelectTask={onSelectTask} /> : null}
        <span className="absolute bottom-2 left-3 font-measure text-[0.65rem] font-medium text-[var(--muted)]">
          X{row.internalPoint.offsetDays >= 0 ? `+${row.internalPoint.offsetDays}` : row.internalPoint.offsetDays}
        </span>
      </div>
    </div>
  );
}

function TimelineMarker({
  point,
  selected,
  onSelectTask
}: {
  point: TimelinePoint;
  selected: boolean;
  onSelectTask: (taskId: string) => void;
}) {
  const isStatutory = point.kind === "statutory";
  const markerLabel = isStatutory ? point.task.filing?.form ?? "Statutory" : "Internal";
  const top = isStatutory ? "calc(50% + 1.65rem)" : "50%";

  const title = `${deriveTaskLabel(point.task.action)} — ${markerLabel}, ${formatDate(point.date)} (${point.countdownLabel})${point.isBlocker ? " · blocker" : ""}${point.isCritical ? " · critical path" : ""}. ${point.task.status}.`;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(event) => {
        event.stopPropagation();
        onSelectTask(point.task.id);
      }}
      className={cn(
        "absolute z-10 flex min-h-7 items-center justify-center gap-1.5 rounded-full border px-2 text-[0.68rem] font-semibold shadow-sm transition hover:z-20 hover:scale-110",
        isStatutory ? "bg-orange-900/10 text-[var(--statutory-hard-stop)]" : "bg-teal-700/10 text-[var(--accent)]",
        point.isOverdue && !isStatutory ? "border-red-700/40 bg-red-700/10 text-[var(--danger)]" : "",
        point.isCritical || selected ? "ring-2 ring-[var(--foreground)]/35" : ""
      )}
      style={{
        left: `${point.x}%`,
        top,
        transform: "translate(-50%, -50%)",
        borderColor: isStatutory
          ? "color-mix(in srgb, var(--statutory-hard-stop) 48%, transparent)"
          : point.isOverdue
            ? "color-mix(in srgb, var(--danger) 48%, transparent)"
            : "color-mix(in srgb, var(--accent) 42%, transparent)"
      }}
    >
      {isStatutory ? <Lock size={12} aria-hidden /> : <CalendarClock size={12} aria-hidden />}
      {markerLabel}
    </button>
  );
}
