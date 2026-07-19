import { createFileRoute, notFound } from "@tanstack/react-router";

import { EventDetailPage } from "@/features/event/(detail)/[eventId]/page";
import { getOrganizerEventById } from "@/features/event/_utils/operations";

export const Route = createFileRoute("/_auth/events/$eventId")({
  component: RouteComponent,
  loader: ({ params }) => {
    const event = getOrganizerEventById(params.eventId);

    if (!event) {
      throw notFound();
    }

    return { event };
  },
});

function RouteComponent() {
  const { event } = Route.useLoaderData();

  return <EventDetailPage event={event} />;
}
