import { createFileRoute } from "@tanstack/react-router";

import { PlatformMonthlySalesPage } from "@/features/sales/page";

export const Route = createFileRoute("/_auth/sales")({
  component: PlatformMonthlySalesPage,
});
