import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

import { organizerEventInclude } from "../../../../shared/event/organizer-event-include";
import { summarizeOrganizerEvent } from "../../../../shared/event/summarize-organizer-event";
import { requireOrganizerEditor } from "../../../../shared/organizer-access";

export async function getOrganizerEventHandler({
  input,
  context,
}: {
  input: {
    eventOrganizerId: string;
    eventId: string;
  };
  context: {
    session: {
      user: {
        id: string;
      };
    };
  };
}) {
  await requireOrganizerEditor({
    organizerId: input.eventOrganizerId,
    userId: context.session.user.id,
  });

  const event = await db.event.findFirst({
    where: {
      id: input.eventId,
      organizerId: input.eventOrganizerId,
    },
    include: organizerEventInclude(),
  });

  if (!event) {
    throw new ORPCError("NOT_FOUND");
  }

  return summarizeOrganizerEvent(event);
}
