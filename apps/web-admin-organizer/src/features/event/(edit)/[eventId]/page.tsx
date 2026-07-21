import type { GetEventOutput } from "@ticket-app/api/routers/organizer/event/get/route";

import { EventWizard } from "../../_components/event-wizard/event-wizard";

export function EventEditPage({
  event,
  eventOrganizerId,
}: {
  event: GetEventOutput;
  eventOrganizerId: string;
}) {
  return <EventWizard mode="edit" eventOrganizerId={eventOrganizerId} initialEvent={event} />;
}
