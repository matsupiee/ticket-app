import { ORPCError } from "@orpc/server";
import type { Prisma } from "@ticket-app/db";

type AdjustInventoryCapacityInput = {
  performanceId: string;
  seatCategoryId: string;
  admissionMethod: "GENERAL_ADMISSION" | "NUMBERED_ENTRY" | "RESERVED_SEAT";
  seatAllocationMethod: "NONE" | "LOTTERY_LATER" | "IMMEDIATE";
  capacityDelta: number;
};

// 公演×席種ごとの在庫(InventoryPool)を増減する。
// 増加時は InventoryUnit を entryNumber の連番で追加作成し、
// 減少時は status: "AVAILABLE" のユニットのみ(entryNumber の大きい方から)削除する。
// HELD/SOLD のユニットは絶対に削除しない。
export async function adjustInventoryCapacity(
  tx: Prisma.TransactionClient,
  input: AdjustInventoryCapacityInput,
) {
  if (input.admissionMethod === "RESERVED_SEAT") {
    throw new ORPCError("BAD_REQUEST", {
      message: "指定席の在庫調整は現在サポートされていません",
    });
  }

  if (input.capacityDelta === 0) {
    throw new ORPCError("BAD_REQUEST", { message: "capacityDeltaは0以外を指定してください" });
  }

  const existingPool = await tx.inventoryPool.findUnique({
    where: {
      performanceId_seatCategoryId: {
        performanceId: input.performanceId,
        seatCategoryId: input.seatCategoryId,
      },
    },
  });

  if (!existingPool && input.capacityDelta < 0) {
    throw new ORPCError("BAD_REQUEST", { message: "在庫が未作成のため減少できません" });
  }

  if (
    existingPool &&
    (existingPool.admissionMethod !== input.admissionMethod ||
      existingPool.seatAllocationMethod !== input.seatAllocationMethod)
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message:
        "既存の在庫と入場方式・座席割当方式が一致しません。方式の変更はサポートされていません",
    });
  }

  const pool =
    existingPool ??
    (await tx.inventoryPool.create({
      data: {
        performanceId: input.performanceId,
        seatCategoryId: input.seatCategoryId,
        admissionMethod: input.admissionMethod,
        seatAllocationMethod: input.seatAllocationMethod,
        capacity: 0,
      },
    }));

  if (input.capacityDelta > 0) {
    const maxEntryNumber = await tx.inventoryUnit.aggregate({
      where: { inventoryPoolId: pool.id },
      _max: { entryNumber: true },
    });
    const nextEntryNumber = (maxEntryNumber._max.entryNumber ?? 0) + 1;

    await tx.inventoryUnit.createMany({
      data: Array.from({ length: input.capacityDelta }, (_, index) => ({
        inventoryPoolId: pool.id,
        performanceId: input.performanceId,
        entryNumber: input.admissionMethod === "NUMBERED_ENTRY" ? nextEntryNumber + index : null,
      })),
    });

    return tx.inventoryPool.update({
      where: { id: pool.id },
      data: { capacity: { increment: input.capacityDelta } },
    });
  }

  const decreaseCount = -input.capacityDelta;
  const removableUnits = await tx.inventoryUnit.findMany({
    where: { inventoryPoolId: pool.id, status: "AVAILABLE" },
    orderBy: [{ entryNumber: "desc" }, { createdAt: "desc" }],
    take: decreaseCount,
    select: { id: true },
  });

  if (removableUnits.length < decreaseCount) {
    throw new ORPCError("BAD_REQUEST", {
      message: `削除可能な在庫が不足しています(削除可能: ${removableUnits.length}件 / 要求: ${decreaseCount}件)`,
    });
  }

  const deleted = await tx.inventoryUnit.deleteMany({
    where: { id: { in: removableUnits.map((unit) => unit.id) }, status: "AVAILABLE" },
  });

  if (deleted.count !== decreaseCount) {
    throw new ORPCError("CONFLICT", {
      message: "在庫の状態が変更されたため削除に失敗しました。やり直してください",
    });
  }

  return tx.inventoryPool.update({
    where: { id: pool.id },
    data: { capacity: { decrement: decreaseCount } },
  });
}
