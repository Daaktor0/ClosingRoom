import { createSeedDeal } from "./checklistSeed";
import { addDays, toInputDate } from "./dateUtils";
import type { Deal, Task } from "./types";

export type DealStatus = "active" | "closed" | "on-hold";

export interface PortfolioDeal extends Deal {
  status: DealStatus;
  leadPartner: string;
  assignedToCurrentUser: boolean;
  templateName: string;
}

function patchTasks(deal: Deal, patches: Record<string, Partial<Task>>): Deal {
  return {
    ...deal,
    tasks: deal.tasks.map((task) => ({ ...task, ...patches[task.id] }))
  };
}

export function createPortfolioDeals(): PortfolioDeal[] {
  const today = new Date();
  const demo = createSeedDeal();

  const closingSoon = patchTasks(createSeedDeal(), {
    "cp-egm-approval": { status: "Completed" },
    "cp-sh7-mgt14": { status: "In Progress" },
    "cp-transaction-docs-execution": { status: "Completed" },
    "cp-pas4-pas5": { status: "Completed" },
    "cp-agreed-form-documents": { status: "Completed", documentStatus: "Agreed Form" },
    "cp-fulfilment-certificate": { status: "In Progress" }
  });

  const closed = patchTasks(createSeedDeal(), Object.fromEntries(createSeedDeal().tasks.map((task) => [task.id, { status: "Completed" }])));

  return [
    {
      ...demo,
      id: "demo-series-a",
      status: "active",
      leadPartner: "Meera Rao",
      assignedToCurrentUser: true,
      templateName: "India Seed Financing - Private Placement"
    },
    {
      ...closingSoon,
      id: "growth-round-helio",
      name: "Growth Round Closing",
      companyName: "HelioGrid Energy Private Limited",
      investorName: "SouthBridge Ventures",
      closingDateX: toInputDate(addDays(today, 9)),
      status: "active",
      leadPartner: "Arjun Menon",
      assignedToCurrentUser: false,
      templateName: "India Seed Financing - Private Placement"
    },
    {
      ...closed,
      id: "bridge-round-nova",
      name: "Bridge Round Closing",
      companyName: "NovaLedger Fintech Private Limited",
      investorName: "Ridge Capital",
      closingDateX: toInputDate(addDays(today, -18)),
      status: "closed",
      leadPartner: "Meera Rao",
      assignedToCurrentUser: true,
      templateName: "India Seed Financing - Private Placement"
    }
  ];
}

export function createNewPortfolioDeal({ name, closingDateX, leadPartner }: { name: string; closingDateX: string; leadPartner: string }): PortfolioDeal {
  const deal = createSeedDeal();
  return {
    ...deal,
    id: `deal-${Date.now()}`,
    name,
    companyName: "New Investee Company",
    investorName: "Lead Investor",
    closingDateX,
    status: "active",
    leadPartner,
    assignedToCurrentUser: true,
    templateName: "India Seed Financing - Private Placement"
  };
}
