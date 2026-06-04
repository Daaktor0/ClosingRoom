"use client";

import { BookOpenText, CalendarRange, CheckCircle2, DatabaseZap, FileArchive, Flag, GitBranch, Newspaper, Presentation, Search, Settings, ShieldCheck, TableProperties, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, deriveTaskLabel } from "@/components/ui";
import { phases } from "@/lib/constants";
import { scoreFuzzy } from "@/lib/fuzzy";
import { isTaskComplete } from "@/lib/rules";
import type { Deal, Phase, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export type CommandDestination = "Brief" | "Closing Table" | "Closing Pack" | "Timeline" | "Documents" | "Notes & Export" | "Deal Settings";
export type ClosingTableCommand =
  | { id: string; kind: "show-blockers" }
  | { id: string; kind: "show-overdue" }
  | { id: string; kind: "show-phase"; phase: Phase }
  | { id: string; kind: "show-dependencies" }
  | { id: string; kind: "show-risk" };

interface CommandPaletteProps {
  open: boolean;
  deal: Deal;
  onClose: () => void;
  onNavigate: (destination: CommandDestination) => void;
  onClosingTableCommand: (command: ClosingTableCommand) => void;
  onPresent: () => void;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
}

interface CommandAction {
  id: string;
  label: string;
  detail: string;
  keywords: string;
  icon: React.ReactNode;
  run: () => void;
}

export function CommandPalette({
  open,
  deal,
  onClose,
  onNavigate,
  onClosingTableCommand,
  onPresent,
  onUpdateTaskStatus
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = useMemo<CommandAction[]>(() => {
    const navigation: CommandAction[] = [
      {
        id: "open-brief",
        label: "Open Brief",
        detail: "Go to the closing briefing surface",
        keywords: "brief dashboard",
        icon: <Newspaper size={16} />,
        run: () => onNavigate("Brief")
      },
      {
        id: "open-closing-table",
        label: "Open Closing Table",
        detail: "Run Sheet and Workbook",
        keywords: "closing table checklist run sheet workbook",
        icon: <TableProperties size={16} />,
        run: () => onNavigate("Closing Table")
      },
      {
        id: "open-closing-pack",
        label: "Open Closing Pack",
        detail: "Go/no-go readiness board",
        keywords: "closing pack readiness",
        icon: <ShieldCheck size={16} />,
        run: () => onNavigate("Closing Pack")
      },
      {
        id: "open-timeline",
        label: "Open Timeline",
        detail: "Sequence and post-close calendar",
        keywords: "timeline calendar sequence",
        icon: <CalendarRange size={16} />,
        run: () => onNavigate("Timeline")
      },
      {
        id: "open-documents",
        label: "Open Documents",
        detail: "Document room",
        keywords: "documents dms evidence",
        icon: <FileArchive size={16} />,
        run: () => onNavigate("Documents")
      },
      {
        id: "open-risk",
        label: "Open Risk",
        detail: "Open the Closing Table risk lens",
        keywords: "risk heatmap exposure closing table lens",
        icon: <DatabaseZap size={16} />,
        run: () => onClosingTableCommand({ id: `show-risk-${Date.now()}`, kind: "show-risk" })
      },
      {
        id: "open-notes-export",
        label: "Open Notes and Export",
        detail: "Notes, memo exports, import",
        keywords: "notes export import",
        icon: <BookOpenText size={16} />,
        run: () => onNavigate("Notes & Export")
      },
      {
        id: "set-closing-date",
        label: "Set Closing Date X",
        detail: "Open deal settings",
        keywords: "settings close x date",
        icon: <Settings size={16} />,
        run: () => onNavigate("Deal Settings")
      },
      {
        id: "present",
        label: "Present to client",
        detail: "Open screen-share mode",
        keywords: "partner present client",
        icon: <Presentation size={16} />,
        run: onPresent
      }
    ];

    const filterCommands: CommandAction[] = [
      {
        id: "show-dependencies",
        label: "Show dependencies",
        detail: "Open the Closing Table sequencing lens",
        keywords: "dependencies sequencing prerequisite closing table lens",
        icon: <GitBranch size={16} />,
        run: () => onClosingTableCommand({ id: `show-dependencies-${Date.now()}`, kind: "show-dependencies" })
      },
      {
        id: "show-risk",
        label: "Show risk lens",
        detail: "Open the Closing Table risk lens",
        keywords: "risk heatmap exposure closing table lens",
        icon: <DatabaseZap size={16} />,
        run: () => onClosingTableCommand({ id: `show-risk-${Date.now()}`, kind: "show-risk" })
      },
      {
        id: "filter-blockers",
        label: "Show blockers",
        detail: "Open Closing Table filtered to blockers",
        keywords: "filter blockers closing table run sheet",
        icon: <Flag size={16} />,
        run: () => onClosingTableCommand({ id: `filter-blockers-${Date.now()}`, kind: "show-blockers" })
      },
      {
        id: "filter-overdue",
        label: "Show overdue tasks",
        detail: "Open Closing Table filtered to overdue work",
        keywords: "filter overdue closing table run sheet",
        icon: <CalendarRange size={16} />,
        run: () => onClosingTableCommand({ id: `filter-overdue-${Date.now()}`, kind: "show-overdue" })
      },
      ...phases.map<CommandAction>((phase) => ({
        id: `filter-phase-${phase}`,
        label: `Show ${phase}`,
        detail: "Open Closing Table filtered by phase",
        keywords: `filter phase ${phase} closing table run sheet`,
        icon: <TableProperties size={16} />,
        run: () => onClosingTableCommand({ id: `filter-phase-${phase}-${Date.now()}`, kind: "show-phase", phase })
      }))
    ];

    const taskCommands = deal.tasks
      .filter((task) => !isTaskComplete(task))
      .slice()
      .sort((a, b) => Number(b.blocker) - Number(a.blocker) || a.serialNumber.localeCompare(b.serialNumber, "en", { numeric: true }))
      .slice(0, 12)
      .map<CommandAction>((task) => ({
        id: `complete-${task.id}`,
        label: `Mark ${deriveTaskLabel(task.action, 42)} complete`,
        detail: `${task.serialNumber} · ${task.owner}`,
        keywords: `${task.serialNumber} ${task.action} ${task.owner} complete status`,
        icon: <CheckCircle2 size={16} />,
        run: () => onUpdateTaskStatus(task.id, "Completed")
      }));

    return [...navigation, ...filterCommands, ...taskCommands];
  }, [deal.tasks, onClosingTableCommand, onNavigate, onPresent, onUpdateTaskStatus]);

  const filtered = useMemo(() => {
    const normalized = query.trim();
    if (!normalized) return commands;
    return commands
      .map((command) => ({ command, score: scoreFuzzy(normalized, command) }))
      .filter((item): item is { command: CommandAction; score: number } => item.score !== null)
      .sort((a, b) => b.score - a.score || a.command.label.localeCompare(b.command.label))
      .map((item) => item.command);
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, open]);

  if (!open) return null;

  function run(command: CommandAction) {
    command.run();
    setQuery("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="mx-auto mt-20 max-w-2xl overflow-hidden rounded-md border border-[var(--line)] bg-[var(--panel)] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
          <Search size={18} className="shrink-0 text-[var(--muted)]" aria-hidden />
          <input
            className="min-h-10 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelectedIndex((value) => Math.min(value + 1, Math.max(0, filtered.length - 1)));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelectedIndex((value) => Math.max(0, value - 1));
              }
              if (event.key === "Enter" && filtered[selectedIndex]) {
                event.preventDefault();
                run(filtered[selectedIndex]);
              }
            }}
            autoFocus
            placeholder="Command or task..."
          />
          <Button variant="ghost" onClick={onClose} aria-label="Close command palette">
            <X size={16} />
          </Button>
        </div>

        <div className="max-h-[28rem] overflow-y-auto p-2 scrollbar-thin">
          {filtered.length ? filtered.map((command, index) => (
            <button
              key={command.id}
              type="button"
              onClick={() => run(command)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition hover:bg-[var(--panel-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
                index === selectedIndex ? "bg-[var(--panel-strong)]" : ""
              )}
            >
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--background)] text-[var(--accent)]">
                {command.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{command.label}</span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">{command.detail}</span>
              </span>
            </button>
          )) : (
            <p className="rounded-md border border-dashed border-[var(--line)] p-5 text-center text-sm text-[var(--muted)]">No commands match.</p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--line)] px-4 py-2 text-xs text-[var(--muted)]">
          <span>Arrow keys move. Enter runs. Ctrl/Command K reopens.</span>
          <Badge>{filtered.length} commands</Badge>
        </div>
      </div>
    </div>
  );
}
