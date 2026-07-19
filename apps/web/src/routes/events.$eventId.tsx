import { Outlet, createFileRoute, notFound, useRouterState } from "@tanstack/react-router";

import { EventDetailPage } from "@/features/event/detail/page";
import { client } from "@/lib/orpc";

export const Route = createFileRoute("/events/$eventId")({
  component: RouteComponent,
  loader: async ({ params }) => {
    try {
      const event = await client.fan.event.get({
        eventId: params.eventId,
      });

      return { event };
    } catch {
      throw notFound();
    }
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
