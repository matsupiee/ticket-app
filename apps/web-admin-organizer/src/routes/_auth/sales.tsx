import { createFileRoute } from "@tanstack/react-router";

import { SalesDashboardPage } from "@/features/sales/page";

export const Route = createFileRoute("/_auth/sales")({
  component: SalesDashboardPage,
});
