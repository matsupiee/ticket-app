import { ORPCError } from "@orpc/server";
import type { Prisma } from "@ticket-app/db";
import { db } from "@ticket-app/db";

import { adjustInventoryCapacity } from "../../../../shared/inventory/adjust-inventory-capacity";
import { requireOrganizerEvent } from "../../../../shared/event/require-organizer-event";
import type { EventEditSalesSettingInput } from "./route";

// 販売設定（在庫種別・在庫・料金種別・販売受付・販売商品）をまとめて保存する（ADR 0011）。
//
// 送られた内容をその時点の完全な目的状態として扱う。ただし削除の扱いは対象ごとに異なる。
//   - 在庫種別 / 料金種別 / 販売受付 / 販売商品: 入力に無い既存行は消さない（実データから参照されうるため）
//   - 販売商品の料金・利用権: 入力を目的状態として差分反映する。実注文から参照されている料金の削除は拒否する
//   - 販売受付の取りやめ: cancelReason を渡すとキャンセル済みにする
//
// 保存順は参照整合性で決まる。在庫種別・料金種別 → 在庫 → 販売受付 → 販売商品の順に処理する。
export async function handler({
  input,
  context,
}: {
  input: EventEditSalesSettingInput;
  context: { session: { user: { id: string } } };
}) {
  await requireOrganizerEvent({
    eventOrganizerId: input.eventOrganizerId,
    eventId: input.eventId,
    userId: context.session.user.id,
  });

  const event = await db.$transaction(async (tx) => {
    const inventoryCategoryIdByKey = await saveInventoryCategories(tx, input);
    const rateTypeIdByKey = await saveRateTypes(tx, input);

    await saveInventories(tx, input, inventoryCategoryIdByKey);
    await saveSaleWindows(tx, input, { inventoryCategoryIdByKey, rateTypeIdByKey });

    return await tx.event.update({
      where: { id: input.eventId },
      data: { updatedAt: new Date() },
    });
  });

  return { id: event.id, updatedAt: event.updatedAt.toISOString() };
}

async function saveInventoryCategories(
  tx: Prisma.TransactionClient,
  input: EventEditSalesSettingInput,
) {
  const idByKey = new Map<string, string>();

  for (const inventoryCategory of input.inventoryCategories) {
    const data = {
      kind: inventoryCategory.kind,
      name: inventoryCategory.name,
      description: inventoryCategory.description,
      displayOrder: inventoryCategory.displayOrder,
      // 接頭辞は整理番号方式のときだけ持てる（ADR 0008）
      entryNumberPrefix:
        inventoryCategory.kind === "ENTRY_NUMBER"
          ? (inventoryCategory.entryNumberPrefix ?? null)
          : null,
    };

    if (inventoryCategory.id) {
      const existing = await tx.inventoryCategory.findFirst({
        where: { id: inventoryCategory.id, eventId: input.eventId },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "指定された在庫種別が見つかりません" });
      }

      const updated = await runWithConflictMessage(
        () => tx.inventoryCategory.update({ where: { id: inventoryCategory.id }, data }),
        "同じ名前または整理番号の接頭辞の在庫種別がすでにあります",
      );
      idByKey.set(inventoryCategory.key, updated.id);
      continue;
    }

    const created = await runWithConflictMessage(
      () => tx.inventoryCategory.create({ data: { eventId: input.eventId, ...data } }),
      "同じ名前または整理番号の接頭辞の在庫種別がすでにあります",
    );
    idByKey.set(inventoryCategory.key, created.id);
  }

  return idByKey;
}

async function saveRateTypes(tx: Prisma.TransactionClient, input: EventEditSalesSettingInput) {
  const idByKey = new Map<string, string>();

  for (const rateType of input.rateTypes) {
    const data = { name: rateType.name, displayOrder: rateType.displayOrder };

    if (rateType.id) {
      const existing = await tx.rateType.findFirst({
        where: { id: rateType.id, eventId: input.eventId },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "指定された料金種別が見つかりません" });
      }

      const updated = await runWithConflictMessage(
        () => tx.rateType.update({ where: { id: rateType.id }, data }),
        "同じ名前の料金種別がすでにあります",
      );
      idByKey.set(rateType.key, updated.id);
      continue;
    }

    const created = await runWithConflictMessage(
      () => tx.rateType.create({ data: { eventId: input.eventId, ...data } }),
      "同じ名前の料金種別がすでにあります",
    );
    idByKey.set(rateType.key, created.id);
  }

  return idByKey;
}

async function saveInventories(
  tx: Prisma.TransactionClient,
  input: EventEditSalesSettingInput,
  inventoryCategoryIdByKey: Map<string, string>,
) {
  for (const inventory of input.inventories) {
    const stage = await tx.stage.findFirst({
      where: { id: inventory.stageId, eventId: input.eventId },
    });

    if (!stage) {
      throw new ORPCError("NOT_FOUND", { message: "指定された公演が見つかりません" });
    }

    await adjustInventoryCapacity(tx, {
      stageId: stage.id,
      inventoryCategoryId: resolveKey(
        inventoryCategoryIdByKey,
        inventory.inventoryCategoryKey,
        "在庫種別",
      ),
      capacity: inventory.capacity,
    });
  }
}

async function saveSaleWindows(
  tx: Prisma.TransactionClient,
  input: EventEditSalesSettingInput,
  ids: { inventoryCategoryIdByKey: Map<string, string>; rateTypeIdByKey: Map<string, string> },
) {
  for (const saleWindow of input.saleWindows) {
    const data = {
      name: saleWindow.name,
      publishesAt: new Date(saleWindow.publishesAt),
      applicationStartsAt: new Date(saleWindow.applicationStartsAt),
      applicationEndsAt: new Date(saleWindow.applicationEndsAt),
      isSmsAuthRequired: saleWindow.isSmsAuthRequired,
      saleMethod: saleWindow.saleMethod,
      // 先着に切り替えたときに抽選用の値が残らないよう、毎回明示的に入れ直す
      autoLotteryStartsAt:
        saleWindow.saleMethod === "LOTTERY" && saleWindow.autoLotteryStartsAt
          ? new Date(saleWindow.autoLotteryStartsAt)
          : null,
      notifiesLotteryResultAt:
        saleWindow.saleMethod === "LOTTERY" && saleWindow.notifiesLotteryResultAt
          ? new Date(saleWindow.notifiesLotteryResultAt)
          : null,
      maxLotteryItemCount:
        saleWindow.saleMethod === "LOTTERY" ? (saleWindow.maxLotteryItemCount ?? null) : null,
    };

    let saleWindowId = saleWindow.id;

    if (saleWindowId) {
      const existing = await tx.saleWindow.findFirst({
        where: { id: saleWindowId, eventId: input.eventId },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "指定された販売受付が見つかりません" });
      }

      await tx.saleWindow.update({ where: { id: saleWindowId }, data });
    } else {
      const created = await tx.saleWindow.create({ data: { eventId: input.eventId, ...data } });
      saleWindowId = created.id;
    }

    if (saleWindow.cancelReason) {
      await tx.saleWindow.update({
        where: { id: saleWindowId },
        data: { canceledAt: new Date(), cancelReason: saleWindow.cancelReason },
      });
      // キャンセルした受付の販売商品は触らない。申込済みの明細から参照されているため
      continue;
    }

    await tx.saleWindow.update({
      where: { id: saleWindowId },
      data: { canceledAt: null, cancelReason: null },
    });

    for (const offer of saleWindow.offers) {
      await saveSaleOffer(tx, { eventId: input.eventId, saleWindowId, offer, ids });
    }
  }
}

async function saveSaleOffer(
  tx: Prisma.TransactionClient,
  input: {
    eventId: string;
    saleWindowId: string;
    offer: EventEditSalesSettingInput["saleWindows"][number]["offers"][number];
    ids: { inventoryCategoryIdByKey: Map<string, string>; rateTypeIdByKey: Map<string, string> };
  },
) {
  const { offer, ids } = input;
  const data = {
    name: offer.name,
    description: offer.description,
    maxQuantityPerOrder: offer.maxQuantityPerOrder,
    quantityStep: offer.quantityStep,
    displayOrder: offer.displayOrder,
  };

  let saleOfferId = offer.id;

  if (saleOfferId) {
    const existing = await tx.saleOffer.findFirst({
      where: { id: saleOfferId, saleWindowId: input.saleWindowId },
    });

    if (!existing) {
      throw new ORPCError("NOT_FOUND", { message: "指定された販売商品が見つかりません" });
    }

    await tx.saleOffer.update({ where: { id: saleOfferId }, data });
  } else {
    const created = await tx.saleOffer.create({
      data: { saleWindowId: input.saleWindowId, ...data },
    });
    saleOfferId = created.id;
  }

  await saveSaleOfferRates(tx, { saleOfferId, offer, rateTypeIdByKey: ids.rateTypeIdByKey });
  await saveSaleOfferEntitlements(tx, {
    eventId: input.eventId,
    saleOfferId,
    offer,
    inventoryCategoryIdByKey: ids.inventoryCategoryIdByKey,
  });
}

async function saveSaleOfferRates(
  tx: Prisma.TransactionClient,
  input: {
    saleOfferId: string;
    offer: EventEditSalesSettingInput["saleWindows"][number]["offers"][number];
    rateTypeIdByKey: Map<string, string>;
  },
) {
  const targetPrices = new Map(
    input.offer.rates.map((rate) => [
      resolveKey(input.rateTypeIdByKey, rate.rateTypeKey, "料金種別"),
      rate.price,
    ]),
  );
  const existingRates = await tx.saleOfferRate.findMany({
    where: { saleOfferId: input.saleOfferId },
    include: { _count: { select: { applicationItems: true } } },
  });

  for (const existingRate of existingRates) {
    const price = targetPrices.get(existingRate.rateTypeId);

    if (price === undefined) {
      // 申し込み済みの明細から参照されている料金は消せない（ADR 0004）
      if (existingRate._count.applicationItems > 0) {
        throw new ORPCError("BAD_REQUEST", {
          message: "申し込みがある料金は削除できません",
        });
      }

      await tx.saleOfferRate.delete({ where: { id: existingRate.id } });
      continue;
    }

    if (existingRate.price !== price) {
      await tx.saleOfferRate.update({ where: { id: existingRate.id }, data: { price } });
    }

    targetPrices.delete(existingRate.rateTypeId);
  }

  for (const [rateTypeId, price] of targetPrices) {
    await tx.saleOfferRate.create({
      data: { saleOfferId: input.saleOfferId, rateTypeId, price },
    });
  }
}

async function saveSaleOfferEntitlements(
  tx: Prisma.TransactionClient,
  input: {
    eventId: string;
    saleOfferId: string;
    offer: EventEditSalesSettingInput["saleWindows"][number]["offers"][number];
    inventoryCategoryIdByKey: Map<string, string>;
  },
) {
  const targetPoolIds = new Set<string>();

  for (const entitlement of input.offer.entitlements) {
    const inventoryCategoryId = resolveKey(
      input.inventoryCategoryIdByKey,
      entitlement.inventoryCategoryKey,
      "在庫種別",
    );
    const pool = await tx.inventoryPool.findUnique({
      where: {
        stageId_inventoryCategoryId: { stageId: entitlement.stageId, inventoryCategoryId },
      },
    });

    // 在庫が無い組み合わせは売れないので、先に在庫を作ってもらう（ADR 0004）
    if (!pool) {
      throw new ORPCError("BAD_REQUEST", {
        message: "券の対象になる在庫がありません。先に公演ごとの在庫数を設定してください",
      });
    }

    targetPoolIds.add(pool.id);
  }

  const existingEntitlements = await tx.saleOfferEntitlement.findMany({
    where: { saleOfferId: input.saleOfferId },
  });

  for (const existing of existingEntitlements) {
    if (targetPoolIds.has(existing.inventoryPoolId)) {
      targetPoolIds.delete(existing.inventoryPoolId);
      continue;
    }

    await tx.saleOfferEntitlement.delete({ where: { id: existing.id } });
  }

  for (const inventoryPoolId of targetPoolIds) {
    await tx.saleOfferEntitlement.create({
      data: { saleOfferId: input.saleOfferId, inventoryPoolId },
    });
  }
}

function resolveKey(idByKey: Map<string, string>, key: string, label: string) {
  const id = idByKey.get(key);

  if (!id) {
    throw new ORPCError("BAD_REQUEST", {
      message: `${label}(${key})が入力に含まれていません`,
    });
  }

  return id;
}

async function runWithConflictMessage<T>(operation: () => Promise<T>, message: string) {
  try {
    return await operation();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ORPCError("CONFLICT", { message });
    }

    throw error;
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}
