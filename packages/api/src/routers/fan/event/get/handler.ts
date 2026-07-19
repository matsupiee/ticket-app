import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

import { toFanEventDetail } from "../../../../shared/event-presenter";
import { fanEventInclude } from "../list/handler";

export async function getEventHandler({ input }: { input: { eventId: string } }) {
  const now = new Date();
  const event = await db.event.findFirst({
    where: {
      id: input.eventId,
      saleWindows: {
        some: {
          canceledAt: null,
          OR: [
            {
              publishesAt: null,
            },
            {
              publishesAt: {
                lte: now,
              },
            },
          ],
        },
      },
    },
    include: fanEventInclude(now),
  });

  if (!event) {
    throw new ORPCError("NOT_FOUND");
  }

  return toFanEventDetail(event);
}
