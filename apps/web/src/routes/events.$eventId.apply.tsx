import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";

import { TicketApplicationPage } from "@/features/event/detail/apply/page";
import { getEventById } from "@/features/event/_utils/ticketing";

export const Route = createFileRoute("/events/$eventId/apply")({
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
  const { eventId } = Route.useParams();
  const navigate = useNavigate({ from: "/events/$eventId/apply" });

  return (
    <TicketApplicationPage
      event={event}
      onComplete={(selection) => {
        navigate({
          to: "/events/$eventId/application-complete",
          params: { eventId },
          search: selection,
        });
      }}
    />
  );
}
