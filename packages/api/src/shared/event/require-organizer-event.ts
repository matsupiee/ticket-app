import { ORPCError } from "@orpc/server";
import type { Prisma } from "@ticket-app/db";
import { db } from "@ticket-app/db";

import { requireOrganizerEditor } from "../organizer-access";

// 主催者イベントの書き込みAPIに共通する入口。
// 「編集権限があること」と「そのイベントがその主催者のものであること」の2つを確認する。
// 他主催者のイベントは存在自体を伏せたいので FORBIDDEN ではなく NOT_FOUND を返す。
export async function requireOrganizerEvent(input: {
  eventOrganizerId: string;
  eventId: string;
  userId: string;
}) {
  await requireOrganizerEditor({ organizerId: input.eventOrganizerId, userId: input.userId });

  const event = await db.event.findFirst({
    where: { id: input.eventId, organizerId: input.eventOrganizerId },
  });

  if (!event) {
    throw new ORPCError("NOT_FOUND");
  }

  return event;
}

// 会場はイベントに紐づかないグローバルなテーブルなので、他主催者のデータを書き換えないよう
// 名前の更新は行わない。同じイベント内で同名の会場が既に使われていれば再利用する（ADR 0004）。
export async function resolveVenueId(
  tx: Prisma.TransactionClient,
  input: { eventId: string; venueId?: string; venueName: string },
) {
  if (input.venueId) {
    const usedInEvent = await tx.stage.findFirst({
      where: { eventId: input.eventId, venueId: input.venueId },
    });

    if (usedInEvent) {
      return input.venueId;
    }
  }

  const sameNameInEvent = await tx.stage.findFirst({
    where: { eventId: input.eventId, venue: { name: input.venueName } },
    select: { venueId: true },
  });

  if (sameNameInEvent) {
    return sameNameInEvent.venueId;
  }

  const created = await tx.venue.create({ data: { name: input.venueName } });

  return created.id;
}
