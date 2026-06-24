"use client";

import { BriefcaseBusiness, CalendarRange, ChevronDown, Download, LogIn, LogOut, Maximize2, Minimize2, Moon, Newspaper, NotebookPen, Presentation, RotateCcw, Settings, ShieldAlert, Sun, TableProperties, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CommandPalette, type ClosingTableCommand, type CommandDestination } from "@/components/CommandPalette";
import { TheBrief } from "@/components/brief/TheBrief";
import { ClosingPack } from "@/components/checklist/ClosingPack";
import { ClosingTable } from "@/components/checklist/ClosingTable";
import { DealSettings } from "@/components/deals/DealSettings";
import { ExportPanel } from "@/components/ExportPanel";
import { NotesPanel } from "@/components/NotesPanel";
import { PartnerMode } from "@/components/partner/PartnerMode";
import { TimelineView } from "@/components/timeline/TimelineView";
import { Toaster } from "@/components/ui/Toaster";
import { Button } from "@/components/ui";
import { buildBriefModel, type BriefDisposition } from "@/lib/brief";
import { globalDisclaimer } from "@/lib/constants";
import { useDealStore } from "@/lib/store";
import { useDismissable } from "@/lib/useDismissable";
import { cn } from "@/lib/utils";

type View = "Brief" | "Closing Table" | "Closing Pack" | "Timeline" | "Deal Settings" | "Export";

const primaryNavItems: { view: View; icon: React.ReactNode }[] = [
  { view: "Brief", icon: <Newspaper size={16} /> },
  { view: "Closing Table", icon: <TableProperties size={16} /> },
  { view: "Timeline", icon: <CalendarRange size={16} /> }
];

const dispositionMeta: Record<BriefDisposition, { label: string; className: string }> = {
  unset: { label: "Set X", className: "border-[var(--line)] bg-[var(--panel-strong)] text-[var(--muted)]" },
  ready: { label: "Ready", className: "border-green-700/30 bg-green-700/10 text-[var(--success)]" },
  "on-track": { label: "On track", className: "border-teal-700/30 bg-teal-700/10 text-[var(--accent)]" },
  "at-risk": { label: "At risk", className: "border-red-700/30 bg-red-700/10 text-[var(--danger)]" },
  overdue: { label: "Overdue", className: "border-red-700/30 bg-red-700/10 text-[var(--danger)]" }
};

export function ClosingRoomApp() {
  const [view, setView] = useState<View>("Brief");
  const [dark, setDark] = useState(false);
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [mounted, setMounted] = useState(false);
  const [partnerMode, setPartnerMode] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [closingTableCommand, setClosingTableCommand] = useState<ClosingTableCommand | null>(null);
  const deal = useDealStore((state) => state.deal);
  const setClosingDate = useDealStore((state) => state.setClosingDate);
  const updateTaskStatus = useDealStore((state) => state.updateTaskStatus);
  const localMode = useDealStore((state) => state.localMode);
  const resetDemo = useDealStore((state) => state.resetDemo);
  const signOut = useDealStore((state) => state.signOut);
  const syncStatus = useDealStore((state) => state.syncStatus);
  const syncMessage = useDealStore((state) => state.syncMessage);
  const partyLabel = [deal.companyName, deal.investorName].filter(Boolean).join(" · ");

  useEffect(() => {
    setMounted(true);
    const stored = window.localStorage.getItem("closing-room-density");
    if (stored === "compact" || stored === "comfortable") setDensity(stored);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    document.documentElement.dataset.density = density;
    window.localStorage.setItem("closing-room-density", density);
  }, [density]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
      if (event.key === "Escape") setCommandOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function navigate(destination: CommandDestination) {
    setView(destination);
  }

  const briefModel = useMemo(() => buildBriefModel(deal), [deal]);

  const content = useMemo(() => {
    if (view === "Brief") {
      return (
        <TheBrief
          model={briefModel}
          onSetClosingDate={setClosingDate}
          onOpenClosingPack={() => setView("Closing Pack")}
          onOpenChecklist={() => setView("Closing Table")}
          onOpenTimeline={() => setView("Timeline")}
          onOpenNotes={() => setNotesOpen(true)}
        />
      );
    }
    if (view === "Closing Table") return <ClosingTable command={closingTableCommand} />;
    if (view === "Closing Pack") return <ClosingPack deal={deal} readiness={briefModel.readiness} onOpenChecklist={() => setView("Closing Table")} />;
    if (view === "Timeline") return <TimelineView />;
    if (view === "Deal Settings") return <DealSettings />;
    return <ExportPanel />;
  }, [briefModel, closingTableCommand, deal, setClosingDate, view]);

  if (mounted && partnerMode) {
    return <PartnerMode onExit={() => setPartnerMode(false)} dark={dark} onToggleTheme={() => setDark((value) => !value)} />;
  }

  const disposition = dispositionMeta[briefModel.disposition];
  const syncTone = syncStatus === "error" ? "var(--danger)" : syncStatus === "saving" || syncStatus === "loading" ? "var(--warning)" : "var(--success)";

  return (
    <main className="min-h-screen">
      <CommandPalette
        open={commandOpen}
        deal={deal}
        onClose={() => setCommandOpen(false)}
        onNavigate={navigate}
        onClosingTableCommand={(command) => {
          setClosingTableCommand(command);
          setView("Closing Table");
        }}
        onPresent={() => setPartnerMode(true)}
        onOpenNotes={() => setNotesOpen(true)}
        onUpdateTaskStatus={updateTaskStatus}
      />
      <Toaster />
      <div className="border-b border-[var(--line)]">
        <div className="mx-auto flex max-w-[1560px] flex-col gap-4 px-4 py-4 lg:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/deals"
                className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--panel-strong)] hover:text-[var(--foreground)]"
                title="Switch deal"
              >
                <BriefcaseBusiness size={16} />
                <ChevronDown size={14} className="-ml-1" />
              </Link>
              <div className="min-w-0">
                <h1 className="truncate font-display text-2xl font-semibold leading-tight md:text-3xl">{deal.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--muted)]">
                  <span
                    className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[0.7rem] font-medium", disposition.className)}
                  >
                    {disposition.label}
                  </span>
                  {partyLabel ? <span className="truncate">{partyLabel}</span> : <span>Add parties in settings</span>}
                  <span className="inline-flex items-center gap-1.5" title={syncMessage}>
                    <span className="size-2 rounded-full" style={{ background: syncTone }} aria-hidden />
                    <span className="sr-only">{syncMessage}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button onClick={() => setPartnerMode(true)} title="Present to the room">
                <Presentation size={16} /> Present
              </Button>
              <AccountMenu
                dark={dark}
                density={density}
                localMode={localMode}
                onOpenSettings={() => setView("Deal Settings")}
                onOpenExport={() => setView("Export")}
                onOpenNotes={() => setNotesOpen(true)}
                onToggleTheme={() => setDark((value) => !value)}
                onToggleDensity={() => setDensity((value) => (value === "compact" ? "comfortable" : "compact"))}
                onReset={resetDemo}
                onSignOut={signOut}
              />
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto scrollbar-thin pb-0.5">
            {primaryNavItems.map((item) => (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className={cn(
                  "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition",
                  view === item.view
                    ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                    : "border-[var(--line)] bg-[var(--panel)] text-[var(--foreground)] hover:bg-[var(--panel-strong)]"
                )}
              >
                {item.icon}
                {item.view}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-[1560px] px-4 py-5 lg:px-6">
        {mounted ? content : (
          <div className="grid gap-4" aria-hidden>
            <div className="h-32 animate-pulse rounded-md border border-[var(--line)] bg-[var(--panel-strong)]/40" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-md border border-[var(--line)] bg-[var(--panel-strong)]/40" />
              ))}
            </div>
          </div>
        )}
      </div>

      {notesOpen ? <NotesSlideOver onClose={() => setNotesOpen(false)} /> : null}

      <footer className="sticky bottom-0 z-10 border-t border-[var(--line)] bg-[var(--panel-strong)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1560px] items-center gap-2 px-4 py-2.5 text-xs text-[var(--muted)] lg:px-6">
          <ShieldAlert size={14} className="shrink-0 text-[var(--accent)]" />
          <p>{globalDisclaimer}</p>
        </div>
      </footer>
    </main>
  );
}

function AccountMenu({
  dark,
  density,
  localMode,
  onOpenSettings,
  onOpenExport,
  onOpenNotes,
  onToggleTheme,
  onToggleDensity,
  onReset,
  onSignOut
}: {
  dark: boolean;
  density: "comfortable" | "compact";
  localMode: boolean;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  onOpenNotes: () => void;
  onToggleTheme: () => void;
  onToggleDensity: () => void;
  onReset: () => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismissable(ref, () => setOpen(false), open);

  function run(action: () => void) {
    action();
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <Button variant="secondary" onClick={() => setOpen((value) => !value)} aria-expanded={open} title="Account & deal menu">
        <Settings size={16} /> Menu <ChevronDown size={14} />
      </Button>
      {open ? (
        <div className="absolute right-0 top-11 z-40 w-56 rounded-md border border-[var(--line)] bg-[var(--panel)] p-1.5 shadow-xl">
          <MenuItem icon={<Settings size={15} />} label="Deal settings" onClick={() => run(onOpenSettings)} />
          <MenuItem icon={<Download size={15} />} label="Export" onClick={() => run(onOpenExport)} />
          <MenuItem icon={<NotebookPen size={15} />} label="Notes" onClick={() => run(onOpenNotes)} />
          <MenuItem icon={dark ? <Sun size={15} /> : <Moon size={15} />} label={dark ? "Light theme" : "Dark theme"} onClick={() => run(onToggleTheme)} />
          <MenuItem
            icon={density === "compact" ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
            label={density === "compact" ? "Comfortable density" : "Compact density"}
            onClick={() => run(onToggleDensity)}
          />
          <div className="my-1 h-px bg-[var(--line)]" />
          <MenuItem icon={<RotateCcw size={15} />} label={localMode ? "Reset demo data" : "Reset deal"} tone="danger" onClick={() => run(onReset)} />
          {localMode ? (
            <Link
              href="/deals"
              className="flex items-center gap-2.5 rounded px-2.5 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--panel-strong)]"
            >
              <LogIn size={15} /> Sign in to save
            </Link>
          ) : (
            <MenuItem icon={<LogOut size={15} />} label="Sign out" onClick={() => run(onSignOut)} />
          )}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  tone = "default"
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm font-medium transition hover:bg-[var(--panel-strong)]",
        tone === "danger" ? "text-[var(--danger)]" : "text-[var(--foreground)]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function NotesSlideOver({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDismissable(ref, onClose, true);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Deal notes">
      <div ref={ref} className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-[var(--line)] bg-[var(--background)] shadow-2xl scrollbar-thin">
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--line)] bg-[var(--background)] px-4 py-3">
          <p className="font-display text-lg font-semibold">Deal notes</p>
          <Button variant="ghost" onClick={onClose} aria-label="Close notes">
            <X size={16} />
          </Button>
        </div>
        <div className="p-4">
          <NotesPanel />
        </div>
      </div>
    </div>
  );
}
