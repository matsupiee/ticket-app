import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

import { requireOrganizerEditor } from "../../../../shared/organizer-access";
import { adjustInventoryCapacity } from "../../../../shared/inventory/adjust-inventory-capacity";

type AdjustInventoryInput = {
  eventOrganizerId: string;
  eventId: string;
  performanceId: string;
  seatCategoryId: string;
  admissionMethod: "GENERAL_ADMISSION" | "NUMBERED_ENTRY" | "RESERVED_SEAT";
  seatAllocationMethod: "NONE" | "LOTTERY_LATER" | "IMMEDIATE";
  capacityDelta: number;
  reason: string;
};

export async function adjustInventoryHandler({
  input,
  context,
}: {
  input: AdjustInventoryInput;
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

  const performance = await db.performance.findFirst({
    where: { id: input.performanceId, eventId: input.eventId },
  });

  if (!performance) {
    throw new ORPCError("NOT_FOUND", { message: "公演が見つかりません" });
  }

  const seatCategory = await db.seatCategory.findFirst({
    where: { id: input.seatCategoryId, eventId: input.eventId },
  });

  if (!seatCategory) {
    throw new ORPCError("NOT_FOUND", { message: "席種が見つかりません" });
  }

  // input.reason を保存する監査ログ用の列がスキーマ上存在しないため、構造化ログにのみ出力する。
  console.info("[organizer.event.adjustInventory] reason", {
    eventId: input.eventId,
    performanceId: input.performanceId,
    seatCategoryId: input.seatCategoryId,
    capacityDelta: input.capacityDelta,
    reason: input.reason,
    userId: context.session.user.id,
  });

  const pool = await db.$transaction((tx) =>
    adjustInventoryCapacity(tx, {
      performanceId: input.performanceId,
      seatCategoryId: input.seatCategoryId,
      admissionMethod: input.admissionMethod,
      seatAllocationMethod: input.seatAllocationMethod,
      capacityDelta: input.capacityDelta,
    }),
  );

  return {
    id: pool.id,
    updatedAt: pool.updatedAt.toISOString(),
  };
}
