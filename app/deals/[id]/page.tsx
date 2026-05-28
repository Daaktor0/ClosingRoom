import { AuthGate } from "@/components/AuthGate";
import { DealWorkspace } from "@/components/deals/DealWorkspace";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AuthGate>
      <DealWorkspace dealId={id} />
    </AuthGate>
  );
}
