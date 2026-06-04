"use client";

import { RiskLens } from "@/components/risk/RiskLens";
import { useDealStore } from "@/lib/store";

export function RiskHeatmap() {
  const { deal } = useDealStore();
  return <RiskLens tasks={deal.tasks} />;
}
