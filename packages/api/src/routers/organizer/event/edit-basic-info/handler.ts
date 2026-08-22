import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

import {
  requireOrganizerEvent,
  resolveVenueId,
} from "../../../../shared/event/require-organizer-event";
import type { EventEditBasicInfoInput } from "./route";

// イベントの基本情報と公演を編集する（ADR 0011）。
// 公演の削除手段は用意していないため（ADR 0004）、入力に含まれない既存公演は残す。
export async function handler({
  input,
  context,
}: {
  input: EventEditBasicInfoInput;
  context: { session: { user: { id: string } } };
}) {
  await requireOrganizerEvent({
    eventOrganizerId: input.eventOrganizerId,
    eventId: input.eventId,
    userId: context.session.user.id,
  });

  const event = await db.$transaction(async (tx) => {
    const updated = await tx.event.update({
      where: { id: input.eventId },
      data: {
        name: input.name,
        description: input.description,
        publishesAt: input.publishesAt ? new Date(input.publishesAt) : null,
        closesAt: input.closesAt ? new Date(input.closesAt) : null,
      },
    });

    for (const stage of input.stages) {
      const venueId = await resolveVenueId(tx, {
        eventId: input.eventId,
        venueId: stage.venueId,
        venueName: stage.venueName,
      });

      if (!stage.stageId) {
        await tx.stage.create({
          data: {
            eventId: input.eventId,
            venueId,
            name: stage.name,
            doorsOpenAt: new Date(stage.doorsOpenAt),
            startsAt: new Date(stage.startsAt),
          },
        });
        continue;
      }

      // 他イベントの公演IDを渡して書き換えられないようにする
      const existing = await tx.stage.findFirst({
        where: { id: stage.stageId, eventId: input.eventId },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "指定された公演が見つかりません" });
      }

      await tx.stage.update({
        where: { id: stage.stageId },
        data: {
          venueId,
          name: stage.name,
          doorsOpenAt: new Date(stage.doorsOpenAt),
          startsAt: new Date(stage.startsAt),
        },
      });
    }

    return updated;
  });

  return { id: event.id, updatedAt: event.updatedAt.toISOString() };
}
