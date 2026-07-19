import { createFileRoute } from "@tanstack/react-router";

import { OrganizerDashboardPage } from "@/features/event/(list)/page";

export const Route = createFileRoute("/_auth/")({
  component: OrganizerDashboardPage,
});
