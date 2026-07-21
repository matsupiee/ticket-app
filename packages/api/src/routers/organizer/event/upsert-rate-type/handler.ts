import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

import { requireOrganizerEditor } from "../../../../shared/organizer-access";

type UpsertRateTypeInput = {
  eventOrganizerId: string;
  eventId: string;
  rateTypeId?: string;
  name: string;
  displayOrder: number;
};

export async function upsertRateTypeHandler({
  input,
  context,
}: {
  input: UpsertRateTypeInput;
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

  const rateType = await db.$transaction(async (tx) => {
    const collision = await tx.rateType.findUnique({
      where: { eventId_name: { eventId: input.eventId, name: input.name } },
    });

    if (collision && collision.id !== input.rateTypeId) {
      throw new ORPCError("CONFLICT", { message: "同じ名前の料金種別が既に存在します" });
    }

    const data = {
      name: input.name,
      displayOrder: input.displayOrder,
    };

    if (input.rateTypeId) {
      const existing = await tx.rateType.findFirst({
        where: { id: input.rateTypeId, eventId: input.eventId },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "料金種別が見つかりません" });
      }

      return tx.rateType.update({ where: { id: existing.id }, data });
    }

    return tx.rateType.create({ data: { ...data, eventId: input.eventId } });
  });

  return {
    id: rateType.id,
    updatedAt: rateType.updatedAt.toISOString(),
  };
}
