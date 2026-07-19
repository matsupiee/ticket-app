import { createFileRoute } from "@tanstack/react-router";

import { PlatformDashboardPage } from "@/features/organizer/page";

export const Route = createFileRoute("/_auth/")({
  component: PlatformDashboardPage,
});
