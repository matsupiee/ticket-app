import { createFileRoute, notFound } from "@tanstack/react-router";

import { EventInventoryCategoriesPage } from "@/features/event/(inventory-categories)/[eventId]/page";
import { client } from "@/lib/orpc";

export const Route = createFileRoute("/(authenticated)/events/$eventId/inventory-categories/")({
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

  return <EventInventoryCategoriesPage event={event} eventOrganizerId={eventOrganizerId} />;
}
