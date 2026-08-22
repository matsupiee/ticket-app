import { createFileRoute, notFound } from "@tanstack/react-router";

import { EventFormPage } from "@/features/event/(form)/page";
import { client } from "@/lib/orpc";

export const Route = createFileRoute("/(authenticated)/events/$eventId/edit/")({
  component: RouteComponent,
  loader: async ({ params }) => {
    try {
      const organizerAccount = await client.organizer.account.me({});
      const event = await client.organizer.event.get({
        eventOrganizerId: organizerAccount.eventOrganizerId,
        eventId: params.eventId,
      });

      return { event, eventOrganizerId: organizerAccount.eventOrganizerId };
    } catch {
      throw notFound();
    }
  },
});

function RouteComponent() {
  const { event, eventOrganizerId } = Route.useLoaderData();

  return <EventFormPage mode="edit" event={event} eventOrganizerId={eventOrganizerId} />;
}
