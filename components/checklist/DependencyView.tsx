"use client";

import { DependencyLens } from "@/components/checklist/DependencyLens";
import { useDealStore } from "@/lib/store";

export function DependencyView() {
  const { deal } = useDealStore();
  return <DependencyLens tasks={deal.tasks} allTasks={deal.tasks} />;
}
