import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

import { requireOrganizerEditor } from "../../../../shared/organizer-access";

export async function updateEventHandler({
  input,
  context,
}: {
  input: {
    eventOrganizerId: string;
    eventId: string;
    name: string;
    description: string;
    status: "DRAFT" | "ON_SALE" | "PAUSED" | "ENDED" | "CANCELED";
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
    select: {
      id: true,
    },
  });

  if (!event) {
    throw new ORPCError("NOT_FOUND");
  }

  const updatedEvent = await db.event.update({
    where: {
      id: input.eventId,
    },
    data: {
      name: input.name,
      description: input.description,
      status: input.status,
    },
  });

  return {
    id: updatedEvent.id,
    updatedAt: updatedEvent.updatedAt.toISOString(),
  };
}
