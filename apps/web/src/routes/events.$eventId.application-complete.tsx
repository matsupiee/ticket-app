import { createFileRoute, notFound } from "@tanstack/react-router";

import { ApplicationCompletePage } from "@/features/event/detail/apply-complete/page";
import {
  type ApplicationSelection,
  getDefaultApplicationSelection,
  getEventById,
} from "@/features/event/_utils/ticketing";

export const Route = createFileRoute("/events/$eventId/application-complete")({
  component: RouteComponent,
  validateSearch: (search): Partial<ApplicationSelection> => ({
    saleWindowId: parseOptionalString(search.saleWindowId),
    performanceId: parseOptionalString(search.performanceId),
    offerId: parseOptionalString(search.offerId),
    rateTypeId: parseOptionalString(search.rateTypeId),
    quantity: parseOptionalNumber(search.quantity),
  }),
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
  const search = Route.useSearch();
  const selection = {
    ...getDefaultApplicationSelection(event),
    ...search,
    eventId: event.id,
  };

  return <ApplicationCompletePage event={event} selection={selection} />;
}

function parseOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function parseOptionalNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}
