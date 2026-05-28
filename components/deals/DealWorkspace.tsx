"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ClosingRoomApp } from "@/components/ClosingRoomApp";
import { Button, Card, SectionHeader } from "@/components/ui";
import { useDealStore } from "@/lib/store";

export function DealWorkspace({ dealId }: { dealId?: string }) {
  const loadDealById = useDealStore((state) => state.loadDealById);
  const loadFromSupabase = useDealStore((state) => state.loadFromSupabase);
  const syncStatus = useDealStore((state) => state.syncStatus);
  const syncMessage = useDealStore((state) => state.syncMessage);
  const loadedDealId = useDealStore((state) => state.deal.id);

  useEffect(() => {
    if (dealId) {
      loadDealById(dealId);
    } else {
      loadFromSupabase();
    }
  }, [dealId, loadDealById, loadFromSupabase]);

  if (syncStatus === "error") {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <Card className="w-full max-w-md">
          <SectionHeader eyebrow="Tracker" title="Could not load this deal" />
          <p className="text-sm text-[var(--danger)]">{syncMessage}</p>
          <Link href="/deals" className="mt-4 inline-block">
            <Button variant="secondary">Back to deals</Button>
          </Link>
        </Card>
      </main>
    );
  }

  const ready = dealId ? loadedDealId === dealId : syncStatus === "idle" && syncMessage === "Saved in Supabase";

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <Card className="w-full max-w-md">
          <SectionHeader eyebrow="Tracker" title="Loading deal" />
          <p className="text-sm text-[var(--muted)]">{syncMessage}</p>
        </Card>
      </main>
    );
  }

  return <ClosingRoomApp />;
}
