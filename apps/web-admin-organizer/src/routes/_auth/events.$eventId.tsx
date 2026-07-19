import { createFileRoute, notFound } from "@tanstack/react-router";

import { EventDetailPage } from "@/features/event/(detail)/[eventId]/page";
import { client } from "@/lib/orpc";

export const Route = createFileRoute("/_auth/events/$eventId")({
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

  return <EventDetailPage event={event} eventOrganizerId={eventOrganizerId} />;
}
