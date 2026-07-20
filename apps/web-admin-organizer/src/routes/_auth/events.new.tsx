import { createFileRoute } from "@tanstack/react-router";

import { EventNewPage } from "@/features/event/(new)/page";

export const Route = createFileRoute("/_auth/events/new")({
  component: RouteComponent,
});

function RouteComponent() {
  const { organizerAccount } = Route.useRouteContext();

  return <EventNewPage eventOrganizerId={organizerAccount.eventOrganizerId} />;
}
