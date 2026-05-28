import type { Deal } from "./types";

export type DealStatus = "active" | "closed" | "on-hold";

export interface PortfolioDeal extends Deal {
  status: DealStatus;
  leadPartner: string;
  assignedToCurrentUser: boolean;
  templateName: string;
}
