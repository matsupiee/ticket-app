import { EventWizard } from "../_components/event-wizard/event-wizard";

export function EventNewPage({ eventOrganizerId }: { eventOrganizerId: string }) {
  return <EventWizard mode="create" eventOrganizerId={eventOrganizerId} />;
}
