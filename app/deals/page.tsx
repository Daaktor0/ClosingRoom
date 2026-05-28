import { AuthGate } from "@/components/AuthGate";
import { DealsHome } from "@/components/deals/DealsHome";

export default function DealsPage() {
  return (
    <AuthGate>
      <DealsHome />
    </AuthGate>
  );
}
