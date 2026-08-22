import { db } from "@ticket-app/db";

import { requireOrganizerEditor } from "../../../../shared/organizer-access";
import { resolveVenueId } from "../../../../shared/event/require-organizer-event";
import type { EventCreateInput } from "./route";

// イベントの基本情報と公演をまとめて作成する（ADR 0010 / ADR 0011）。
// 公演は0件でもよい。会場も日程も未定の段階で下書きイベントを起こせるようにするため。
export async function handler({
  input,
  context,
}: {
  input: EventCreateInput;
  context: { session: { user: { id: string } } };
}) {
  await requireOrganizerEditor({
    organizerId: input.eventOrganizerId,
    userId: context.session.user.id,
  });

  const event = await db.$transaction(async (tx) => {
    const created = await tx.event.create({
      data: {
        organizerId: input.eventOrganizerId,
        name: input.name,
        description: input.description,
        publishesAt: input.publishesAt ? new Date(input.publishesAt) : null,
        closesAt: input.closesAt ? new Date(input.closesAt) : null,
      },
    });

    for (const stage of input.stages) {
      const venueId = await resolveVenueId(tx, {
        eventId: created.id,
        venueId: stage.venueId,
        venueName: stage.venueName,
      });

      await tx.stage.create({
        data: {
          eventId: created.id,
          venueId,
          name: stage.name,
          doorsOpenAt: new Date(stage.doorsOpenAt),
          startsAt: new Date(stage.startsAt),
        },
      });
    }

    return created;
  });

  return { id: event.id, updatedAt: event.updatedAt.toISOString() };
}
