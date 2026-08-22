import { ORPCError } from "@orpc/server";
import type { Prisma } from "@ticket-app/db";

type AdjustInventoryCapacityInput = {
  stageId: string;
  inventoryCategoryId: string;
  // 差分ではなく、あるべき枚数を渡す（ADR 0011）
  capacity: number;
};

// 公演 × 在庫種別ごとの在庫(InventoryPool)を、指定された枚数になるまで増減する。
//
// 増加時は InventorySlot を追加作成する。整理番号は作成時ではなく注文への割り当て時に
// InventoryPool.nextEntryNumber から採番するため、ここでは entryNumber を入れない（ADR 0005）。
// 減少時は status: "AVAILABLE" かつ確保も発券もされていない枠だけを削除する。
// HELD の枠と、発券済み(TicketEntitlement がある)枠は絶対に削除しない。
export async function adjustInventoryCapacity(
  tx: Prisma.TransactionClient,
  input: AdjustInventoryCapacityInput,
) {
  if (input.capacity < 0) {
    throw new ORPCError("BAD_REQUEST", { message: "在庫数は0以上で指定してください" });
  }

  const existingPool = await tx.inventoryPool.findUnique({
    where: {
      stageId_inventoryCategoryId: {
        stageId: input.stageId,
        inventoryCategoryId: input.inventoryCategoryId,
      },
    },
  });

  const pool =
    existingPool ??
    (await tx.inventoryPool.create({
      data: {
        stageId: input.stageId,
        inventoryCategoryId: input.inventoryCategoryId,
        capacity: 0,
      },
    }));

  // capacity は表示用のキャッシュ値なので、実際の枠数を数えてから増減する
  const currentSlotCount = await tx.inventorySlot.count({
    where: { inventoryPoolId: pool.id },
  });
  const delta = input.capacity - currentSlotCount;

  if (delta === 0) {
    return pool.capacity === input.capacity
      ? pool
      : await tx.inventoryPool.update({
          where: { id: pool.id },
          data: { capacity: input.capacity },
        });
  }

  if (delta > 0) {
    await tx.inventorySlot.createMany({
      data: Array.from({ length: delta }, () => ({ inventoryPoolId: pool.id })),
    });

    return await tx.inventoryPool.update({
      where: { id: pool.id },
      data: { capacity: input.capacity },
    });
  }

  const decreaseCount = -delta;
  const removableSlots = await tx.inventorySlot.findMany({
    where: {
      inventoryPoolId: pool.id,
      status: "AVAILABLE",
      slotHold: null,
      ticketEntitlements: { none: { canceledAt: null } },
    },
    orderBy: { createdAt: "desc" },
    take: decreaseCount,
    select: { id: true },
  });

  if (removableSlots.length < decreaseCount) {
    throw new ORPCError("BAD_REQUEST", {
      message: `販売済み・確保済みの枠は削除できません(削除可能: ${removableSlots.length}件 / 要求: ${decreaseCount}件)`,
    });
  }

  const deleted = await tx.inventorySlot.deleteMany({
    where: { id: { in: removableSlots.map((slot) => slot.id) }, status: "AVAILABLE" },
  });

  if (deleted.count !== decreaseCount) {
    throw new ORPCError("CONFLICT", {
      message: "在庫の状態が変更されたため削除に失敗しました。やり直してください",
    });
  }

  return await tx.inventoryPool.update({
    where: { id: pool.id },
    data: { capacity: input.capacity },
  });
}
