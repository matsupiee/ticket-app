import { Outlet, createFileRoute, notFound, useRouterState } from "@tanstack/react-router";

import { EventDetailPage } from "@/features/event/detail/page";
import { getEventById } from "@/features/event/_utils/ticketing";

export const Route = createFileRoute("/events/$eventId")({
  component: RouteComponent,
  loader: ({ params }) => {
    const event = getEventById(params.eventId);

    if (!event) {
      throw notFound();
    }

    return { event };
  },
});

function RouteComponent() {
  const { event } = Route.useLoaderData();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname !== `/events/${event.id}`) {
    return <Outlet />;
  }

  return <EventDetailPage event={event} />;
}
