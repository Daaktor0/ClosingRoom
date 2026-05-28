"use client";

import { BookOpenText, CalendarRange, CheckSquare2, DatabaseZap, FileArchive, GitBranch, LayoutDashboard, Moon, RotateCcw, ShieldAlert, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ClosingReadiness } from "@/components/checklist/ClosingReadiness";
import { DependencyView } from "@/components/checklist/DependencyView";
import { MasterChecklistTable } from "@/components/checklist/MasterChecklistTable";
import { DealDashboard } from "@/components/dashboard/DealDashboard";
import { DocumentsRoom } from "@/components/documents/DocumentsRoom";
import { ExportPanel } from "@/components/ExportPanel";
import { ImportChecklist } from "@/components/ImportChecklist";
import { NotesPanel } from "@/components/NotesPanel";
import { RiskHeatmap } from "@/components/risk/RiskHeatmap";
import { TimelineView } from "@/components/timeline/TimelineView";
import { Badge, Button, Tooltip } from "@/components/ui";
import { globalDisclaimer } from "@/lib/constants";
import { glossary } from "@/lib/glossary";
import { useDealStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type View = "Dashboard" | "Checklist" | "Readiness" | "Timeline" | "Dependencies" | "Documents" | "Risk" | "Notes & Export";

const navItems: { view: View; icon: React.ReactNode }[] = [
  { view: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { view: "Checklist", icon: <CheckSquare2 size={16} /> },
  { view: "Readiness", icon: <ShieldAlert size={16} /> },
  { view: "Timeline", icon: <CalendarRange size={16} /> },
  { view: "Dependencies", icon: <GitBranch size={16} /> },
  { view: "Documents", icon: <FileArchive size={16} /> },
  { view: "Risk", icon: <DatabaseZap size={16} /> },
  { view: "Notes & Export", icon: <BookOpenText size={16} /> }
];

export default function Home() {
  const [view, setView] = useState<View>("Dashboard");
  const [dark, setDark] = useState(false);
  const resetDemo = useDealStore((state) => state.resetDemo);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  const content = useMemo(() => {
    if (view === "Dashboard") return <DealDashboard />;
    if (view === "Checklist") return <MasterChecklistTable />;
    if (view === "Readiness") return <ClosingReadiness />;
    if (view === "Timeline") return <TimelineView />;
    if (view === "Dependencies") return <DependencyView />;
    if (view === "Documents") return <DocumentsRoom />;
    if (view === "Risk") return <RiskHeatmap />;
    return (
      <div className="grid gap-4">
        <NotesPanel />
        <ExportPanel />
        <ImportChecklist />
      </div>
    );
  }, [view]);

  return (
    <main className="min-h-screen">
      <div className="grid-bg border-b border-[var(--line)]">
        <div className="mx-auto flex max-w-[1560px] flex-col gap-5 px-4 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone="accent">Indian fundraise control room</Badge>
                <Badge>LocalStorage MVP</Badge>
              </div>
              <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">Fundraise Closing Tracker</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
                A deal-closing control room for CPs, X-relative deadlines, evidence, dependencies, statutory filings and closing readiness.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setDark((value) => !value)} title="Toggle theme">
                {dark ? <Sun size={16} /> : <Moon size={16} />} {dark ? "Light" : "Dark"}
              </Button>
              <Button variant="danger" onClick={resetDemo} title="Reset demo data">
                <RotateCcw size={16} /> Reset demo data
              </Button>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {navItems.map((item) => (
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

      <div className="mx-auto max-w-[1560px] px-4 py-5 lg:px-6">{content}</div>

      <footer className="sticky bottom-0 z-10 border-t border-[var(--line)] bg-[var(--panel-strong)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1560px] items-center gap-2 px-4 py-2.5 text-xs text-[var(--muted)] lg:px-6">
          <ShieldAlert size={14} className="shrink-0 text-[var(--accent)]" />
          <p>{globalDisclaimer}</p>
        </div>
      </footer>
    </main>
  );
}
