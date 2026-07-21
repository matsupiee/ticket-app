import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

import { requireOrganizerEditor } from "../../../../shared/organizer-access";

type UpsertSeatCategoryInput = {
  eventOrganizerId: string;
  eventId: string;
  seatCategoryId?: string;
  name: string;
  description: string;
  active: boolean;
  displayOrder: number;
};

export async function upsertSeatCategoryHandler({
  input,
  context,
}: {
  input: UpsertSeatCategoryInput;
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
    where: { id: input.eventId, organizerId: input.eventOrganizerId },
  });

  if (!event) {
    throw new ORPCError("NOT_FOUND");
  }

  const seatCategory = await db.$transaction(async (tx) => {
    const collision = await tx.seatCategory.findUnique({
      where: { eventId_name: { eventId: input.eventId, name: input.name } },
    });

    if (collision && collision.id !== input.seatCategoryId) {
      throw new ORPCError("CONFLICT", { message: "同じ名前の席種が既に存在します" });
    }

    const data = {
      name: input.name,
      description: input.description,
      active: input.active,
      displayOrder: input.displayOrder,
    };

    if (input.seatCategoryId) {
      const existing = await tx.seatCategory.findFirst({
        where: { id: input.seatCategoryId, eventId: input.eventId },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "席種が見つかりません" });
      }

      return tx.seatCategory.update({ where: { id: existing.id }, data });
    }

    return tx.seatCategory.create({ data: { ...data, eventId: input.eventId } });
  });

  return {
    id: seatCategory.id,
    updatedAt: seatCategory.updatedAt.toISOString(),
  };
}
