import { createFileRoute } from "@tanstack/react-router";

import { SettlementListPage } from "@/features/settlement/page";

export const Route = createFileRoute("/_auth/settlements")({
  component: SettlementListPage,
});
