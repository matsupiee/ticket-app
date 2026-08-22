import { createFileRoute } from "@tanstack/react-router";

import { OrganizerDashboardPage } from "@/features/event/(list)/page";

export const Route = createFileRoute("/(authenticated)/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { organizerAccount } = Route.useRouteContext();

  return <OrganizerDashboardPage eventOrganizerId={organizerAccount.eventOrganizerId} />;
}
