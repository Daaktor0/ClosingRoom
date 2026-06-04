"use client";

import { BookOpenText, BriefcaseBusiness, CalendarRange, FileArchive, LogIn, LogOut, Moon, Newspaper, Presentation, RotateCcw, Settings, ShieldAlert, ShieldCheck, Sun, TableProperties } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CommandPalette, type ClosingTableCommand, type CommandDestination } from "@/components/CommandPalette";
import { TheBrief } from "@/components/brief/TheBrief";
import { ClosingPack } from "@/components/checklist/ClosingPack";
import { ClosingTable } from "@/components/checklist/ClosingTable";
import { DealSettings } from "@/components/deals/DealSettings";
import { DocumentsRoom } from "@/components/documents/DocumentsRoom";
import { ExportPanel } from "@/components/ExportPanel";
import { NotesPanel } from "@/components/NotesPanel";
import { PartnerMode } from "@/components/partner/PartnerMode";
import { TimelineView } from "@/components/timeline/TimelineView";
import { Toaster } from "@/components/ui/Toaster";
import { Badge, Button, Tooltip } from "@/components/ui";
import { buildBriefModel } from "@/lib/brief";
import { globalDisclaimer } from "@/lib/constants";
import { glossary } from "@/lib/glossary";
import { useDealStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type View = "Brief" | "Closing Table" | "Closing Pack" | "Timeline" | "Documents" | "Notes & Export" | "Deal Settings";

const primaryNavItems: { view: View; icon: React.ReactNode }[] = [
  { view: "Brief", icon: <Newspaper size={16} /> },
  { view: "Closing Table", icon: <TableProperties size={16} /> },
  { view: "Timeline", icon: <CalendarRange size={16} /> }
];

const utilityNavItems: { view: View; icon: React.ReactNode }[] = [
  { view: "Closing Pack", icon: <ShieldCheck size={14} /> },
  { view: "Documents", icon: <FileArchive size={16} /> },
  { view: "Notes & Export", icon: <BookOpenText size={14} /> }
];

export function ClosingRoomApp() {
  const [view, setView] = useState<View>("Brief");
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [partnerMode, setPartnerMode] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [closingTableCommand, setClosingTableCommand] = useState<ClosingTableCommand | null>(null);
  const deal = useDealStore((state) => state.deal);
  const setClosingDate = useDealStore((state) => state.setClosingDate);
  const updateTaskStatus = useDealStore((state) => state.updateTaskStatus);
  const localMode = useDealStore((state) => state.localMode);
  const resetDemo = useDealStore((state) => state.resetDemo);
  const signOut = useDealStore((state) => state.signOut);
  const syncStatus = useDealStore((state) => state.syncStatus);
  const syncMessage = useDealStore((state) => state.syncMessage);
  const partyLabel = [deal.companyName, deal.investorName].filter(Boolean).join(" - ");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

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
        />
      );
    }
    if (view === "Closing Table") return <ClosingTable command={closingTableCommand} />;
    if (view === "Closing Pack") return <ClosingPack deal={deal} readiness={briefModel.readiness} onOpenChecklist={() => setView("Closing Table")} />;
    if (view === "Timeline") return <TimelineView />;
    if (view === "Documents") return <DocumentsRoom />;
    if (view === "Deal Settings") return <DealSettings />;
    return (
      <div className="grid gap-4">
        <NotesPanel />
        <ExportPanel />
      </div>
    );
  }, [briefModel, closingTableCommand, deal, setClosingDate, view]);

  if (mounted && partnerMode) {
    return <PartnerMode onExit={() => setPartnerMode(false)} dark={dark} onToggleTheme={() => setDark((value) => !value)} />;
  }

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
        onUpdateTaskStatus={updateTaskStatus}
      />
      <Toaster />
      <div className="grid-bg border-b border-[var(--line)]">
        <div className="mx-auto flex max-w-[1560px] flex-col gap-5 px-4 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone="accent">Indian fundraise control room</Badge>
                {deal.companyName ? <Badge>{deal.companyName}</Badge> : null}
              </div>
              <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">{deal.name}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
                {partyLabel ? `${partyLabel} - ` : "Complete deal setup to add parties. "}CPs, X-relative deadlines, evidence, dependencies, statutory filings and closing readiness.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={syncStatus === "error" ? "danger" : syncStatus === "saving" || syncStatus === "loading" ? "warning" : "success"}>
                {syncMessage}
              </Badge>
              <Link href="/deals" className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--panel-strong)]">
                <BriefcaseBusiness size={16} /> Deals
              </Link>
              <Button variant="secondary" onClick={() => setView("Deal Settings")} title="Deal settings">
                <Settings size={16} /> Settings
              </Button>
              <Button onClick={() => setPartnerMode(true)} title="Open Partner Mode">
                <Presentation size={16} /> Partner Mode
              </Button>
              <Button variant="secondary" onClick={() => setDark((value) => !value)} title="Toggle theme">
                {dark ? <Sun size={16} /> : <Moon size={16} />} {dark ? "Light" : "Dark"}
              </Button>
              <Button variant="danger" onClick={resetDemo} title={localMode ? "Reset demo data" : "Reset this deal from the template"}>
                <RotateCcw size={16} /> {localMode ? "Reset demo data" : "Reset deal"}
              </Button>
              {localMode ? (
                <Link href="/deals" className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-transparent bg-[var(--foreground)] px-3 py-2 text-sm font-medium text-[var(--background)] transition hover:opacity-90">
                  <LogIn size={16} /> Sign in to save
                </Link>
              ) : (
                <Button variant="secondary" onClick={signOut} title="Sign out">
                  <LogOut size={16} /> Sign out
                </Button>
              )}
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2 pb-1">
            <div className="flex gap-2 overflow-x-auto scrollbar-thin">
              {primaryNavItems.map((item) => (
                <button
                  key={item.view}
                  onClick={() => setView(item.view)}
                  className={cn(
                    "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition",
                    view === item.view
                      ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                      : "border-[var(--line)] bg-[var(--panel)] text-[var(--foreground)] hover:bg-[var(--panel-strong)]"
                  )}
                >
                  {item.icon}
                  {item.view}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--panel)]/70 p-1">
              <span className="px-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Utilities</span>
              {utilityNavItems.map((item) => (
                <button
                  key={item.view}
                  onClick={() => setView(item.view)}
                  className={cn(
                    "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded px-2 text-xs font-medium transition",
                    view === item.view
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "text-[var(--muted)] hover:bg-[var(--panel-strong)] hover:text-[var(--foreground)]"
                  )}
                >
                  {item.icon}
                  {item.view}
                </button>
              ))}
            </div>
          </nav>

          <div className="flex flex-wrap gap-2">
            {Object.entries(glossary).map(([term, description]) => (
              <Tooltip key={term} label={description}>
                <Badge>{term}</Badge>
              </Tooltip>
            ))}
          </div>
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

      <footer className="sticky bottom-0 z-10 border-t border-[var(--line)] bg-[var(--panel-strong)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1560px] items-center gap-2 px-4 py-2.5 text-xs text-[var(--muted)] lg:px-6">
          <ShieldAlert size={14} className="shrink-0 text-[var(--accent)]" />
          <p>{globalDisclaimer}</p>
        </div>
      </footer>
    </main>
  );
}
