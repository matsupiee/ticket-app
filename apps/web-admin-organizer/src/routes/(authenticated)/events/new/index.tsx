import { createFileRoute } from "@tanstack/react-router";

import { EventFormPage } from "@/features/event/(form)/page";

export const Route = createFileRoute("/(authenticated)/events/new/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { organizerAccount } = Route.useRouteContext();

  return <EventFormPage mode="create" eventOrganizerId={organizerAccount.eventOrganizerId} />;
}
