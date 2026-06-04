"use client";

import { CalendarClock, Settings } from "lucide-react";
import { Card, Field, Masthead, inputClass } from "@/components/ui";
import { useDealStore } from "@/lib/store";
import type { Deal } from "@/lib/types";

type DealMeta = Pick<Deal, "name" | "companyName" | "investorName">;

export function DealSettings() {
  const { deal, setClosingDate, updateDealMeta } = useDealStore();

  function updateMeta(patch: Partial<DealMeta>) {
    updateDealMeta({
      name: deal.name,
      companyName: deal.companyName,
      investorName: deal.investorName,
      ...patch
    });
  }

  return (
    <div className="grid gap-4">
      <Card>
        <Masthead
          eyebrow="Deal Settings"
          title="Deal details and Closing Date X"
          subtitle="Set the deal identity and the X anchor used by the Brief, Timeline, statutory clocks, and closing readiness views."
          action={<Settings size={22} className="text-[var(--accent)]" aria-hidden />}
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Deal name">
            <input className={inputClass} value={deal.name} onChange={(event) => updateMeta({ name: event.target.value })} />
          </Field>
          <Field label="Company">
            <input className={inputClass} value={deal.companyName} onChange={(event) => updateMeta({ companyName: event.target.value })} />
          </Field>
          <Field label="Investor">
            <input className={inputClass} value={deal.investorName} onChange={(event) => updateMeta({ investorName: event.target.value })} />
          </Field>
          <Field label="Closing Date X">
            <input className={inputClass} type="date" value={deal.closingDateX} onChange={(event) => setClosingDate(event.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <CalendarClock size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" aria-hidden />
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            X is the closing date: investor remittance and share issuance. Internal targets and statutory hard limits recalculate from this date where the trigger is X or allotment.
          </p>
        </div>
      </Card>
    </div>
  );
}
