import { ORPCError } from "@orpc/server";
import { db, type Prisma } from "@ticket-app/db";

import { requireOrganizerEditor } from "../../../../shared/organizer-access";

type UpsertSaleOfferRateInput = {
  rateTypeId: string;
  price: number;
  currency: string;
  minQuantity: number;
  maxQuantity: number;
  quantityStep: number;
  displayOrder: number;
};

type UpsertSaleOfferEntitlementInput = {
  performanceId: string;
  seatCategoryId: string;
};

type UpsertSaleOfferInput = {
  eventOrganizerId: string;
  eventId: string;
  saleWindowId: string;
  saleOfferId?: string;
  name: string;
  description: string;
  maxQuantityPerOrder: number;
  displayOrder: number;
  rates: UpsertSaleOfferRateInput[];
  entitlements: UpsertSaleOfferEntitlementInput[];
};

export async function upsertSaleOfferHandler({
  input,
  context,
}: {
  input: UpsertSaleOfferInput;
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

  const saleWindow = await db.saleWindow.findFirst({
    where: { id: input.saleWindowId, eventId: input.eventId },
  });

  if (!saleWindow) {
    throw new ORPCError("NOT_FOUND", { message: "販売受付が見つかりません" });
  }

  if (saleWindow.canceledAt) {
    throw new ORPCError("BAD_REQUEST", {
      message: "キャンセル済みの販売受付には商品を設定できません",
    });
  }

  if (input.rates.length === 0) {
    throw new ORPCError("BAD_REQUEST", { message: "料金設定を1件以上指定してください" });
  }

  if (input.entitlements.length === 0) {
    throw new ORPCError("BAD_REQUEST", { message: "対象の公演・席種を1件以上指定してください" });
  }

  const rateTypeIds = input.rates.map((rate) => rate.rateTypeId);
  if (new Set(rateTypeIds).size !== rateTypeIds.length) {
    throw new ORPCError("BAD_REQUEST", { message: "料金種別が重複しています" });
  }

  const entitlementKeys = input.entitlements.map((entitlement) => entitlementKey(entitlement));
  if (new Set(entitlementKeys).size !== entitlementKeys.length) {
    throw new ORPCError("BAD_REQUEST", { message: "公演・席種の組み合わせが重複しています" });
  }

  const validRateTypeCount = await db.rateType.count({
    where: { eventId: input.eventId, id: { in: rateTypeIds } },
  });

  if (validRateTypeCount !== new Set(rateTypeIds).size) {
    throw new ORPCError("NOT_FOUND", { message: "存在しない料金種別が含まれています" });
  }

  const pools = await db.inventoryPool.findMany({
    where: {
      performance: { eventId: input.eventId },
      seatCategory: { eventId: input.eventId },
      OR: input.entitlements.map((entitlement) => ({
        performanceId: entitlement.performanceId,
        seatCategoryId: entitlement.seatCategoryId,
      })),
    },
  });
  const poolByKey = new Map(pools.map((pool) => [entitlementKey(pool), pool]));

  for (const entitlement of input.entitlements) {
    if (!poolByKey.has(entitlementKey(entitlement))) {
      throw new ORPCError("BAD_REQUEST", {
        message: "対象の公演・席種の在庫が未設定です。先に在庫を設定してください",
      });
    }
  }

  const offer = await db.$transaction(async (tx) => {
    const existingOffer = input.saleOfferId
      ? await tx.saleOffer.findFirst({
          where: { id: input.saleOfferId, saleWindowId: input.saleWindowId },
          include: {
            saleOfferRates: true,
            saleOfferEntitlements: { include: { inventoryPool: true } },
          },
        })
      : null;

    if (input.saleOfferId && !existingOffer) {
      throw new ORPCError("NOT_FOUND", { message: "販売商品が見つかりません" });
    }

    const offerData = {
      name: input.name,
      description: input.description,
      maxQuantityPerOrder: input.maxQuantityPerOrder,
      displayOrder: input.displayOrder,
    };

    const offerRow = existingOffer
      ? await tx.saleOffer.update({ where: { id: existingOffer.id }, data: offerData })
      : await tx.saleOffer.create({
          data: { ...offerData, saleWindowId: input.saleWindowId },
        });

    await syncSaleOfferRates(tx, {
      saleOfferId: offerRow.id,
      existingRates: existingOffer?.saleOfferRates ?? [],
      targetRates: input.rates,
    });
    await syncSaleOfferEntitlements(tx, {
      saleOfferId: offerRow.id,
      existingEntitlements: existingOffer?.saleOfferEntitlements ?? [],
      targetEntitlements: input.entitlements,
      poolByKey,
    });

    return offerRow;
  });

  return {
    id: offer.id,
    updatedAt: offer.updatedAt.toISOString(),
  };
}

function entitlementKey(input: { performanceId: string; seatCategoryId: string }) {
  return `${input.performanceId}:${input.seatCategoryId}`;
}

// rates[] をその時点の完全な目的状態とみなし、既存のSaleOfferRateとの差分(作成/更新/削除)を反映する。
// 実注文(OrderItem)や抽選応募明細(ApplicationPreferenceItem)から参照されている行は削除しない。
async function syncSaleOfferRates(
  tx: Prisma.TransactionClient,
  input: {
    saleOfferId: string;
    existingRates: { id: string; rateTypeId: string }[];
    targetRates: UpsertSaleOfferRateInput[];
  },
) {
  const targetRateTypeIds = new Set(input.targetRates.map((rate) => rate.rateTypeId));
  const ratesToRemove = input.existingRates.filter(
    (rate) => !targetRateTypeIds.has(rate.rateTypeId),
  );

  if (ratesToRemove.length > 0) {
    const removableIds = ratesToRemove.map((rate) => rate.id);
    const [orderedCount, appliedCount] = await Promise.all([
      tx.orderItem.count({ where: { saleOfferRateId: { in: removableIds } } }),
      tx.applicationPreferenceItem.count({ where: { saleOfferRateId: { in: removableIds } } }),
    ]);

    if (orderedCount > 0 || appliedCount > 0) {
      throw new ORPCError("BAD_REQUEST", {
        message: "購入または応募済みの料金設定は削除できません",
      });
    }

    await tx.saleOfferRate.deleteMany({ where: { id: { in: removableIds } } });
  }

  const existingByRateType = new Map(input.existingRates.map((rate) => [rate.rateTypeId, rate]));

  for (const rate of input.targetRates) {
    const existing = existingByRateType.get(rate.rateTypeId);
    const data = {
      price: rate.price,
      currency: rate.currency,
      minQuantity: rate.minQuantity,
      maxQuantity: rate.maxQuantity,
      quantityStep: rate.quantityStep,
      displayOrder: rate.displayOrder,
    };

    if (existing) {
      await tx.saleOfferRate.update({ where: { id: existing.id }, data });
    } else {
      await tx.saleOfferRate.create({
        data: { ...data, saleOfferId: input.saleOfferId, rateTypeId: rate.rateTypeId },
      });
    }
  }
}

// entitlements[] も同様に完全な目的状態とみなして差分反映する。
// 発券済みチケット(TicketEntitlement)から参照されている行は削除しない。
async function syncSaleOfferEntitlements(
  tx: Prisma.TransactionClient,
  input: {
    saleOfferId: string;
    existingEntitlements: {
      id: string;
      performanceId: string | null;
      inventoryPool: { performanceId: string; seatCategoryId: string };
    }[];
    targetEntitlements: UpsertSaleOfferEntitlementInput[];
    poolByKey: Map<string, { id: string }>;
  },
) {
  const keyOf = (entitlement: {
    performanceId: string | null;
    inventoryPool: { performanceId: string; seatCategoryId: string };
  }) =>
    entitlementKey({
      performanceId: entitlement.performanceId ?? entitlement.inventoryPool.performanceId,
      seatCategoryId: entitlement.inventoryPool.seatCategoryId,
    });

  const targetKeys = new Set(
    input.targetEntitlements.map((entitlement) => entitlementKey(entitlement)),
  );
  const entitlementsToRemove = input.existingEntitlements.filter(
    (entitlement) => !targetKeys.has(keyOf(entitlement)),
  );

  if (entitlementsToRemove.length > 0) {
    const removableIds = entitlementsToRemove.map((entitlement) => entitlement.id);
    const ticketedCount = await tx.ticketEntitlement.count({
      where: { saleOfferEntitlementId: { in: removableIds } },
    });

    if (ticketedCount > 0) {
      throw new ORPCError("BAD_REQUEST", {
        message: "発券済みチケットがある公演・席種の組み合わせは削除できません",
      });
    }

    await tx.saleOfferEntitlement.deleteMany({ where: { id: { in: removableIds } } });
  }

  const existingKeys = new Set(input.existingEntitlements.map((entitlement) => keyOf(entitlement)));

  for (const entitlement of input.targetEntitlements) {
    const key = entitlementKey(entitlement);
    if (existingKeys.has(key)) {
      // (performanceId, seatCategoryId) が一致する既存行は inventoryPoolId も一致するため更新不要。
      continue;
    }

    const pool = input.poolByKey.get(key);
    if (!pool) {
      throw new ORPCError("BAD_REQUEST", { message: "対象の公演・席種の在庫が見つかりません" });
    }

    await tx.saleOfferEntitlement.create({
      data: {
        saleOfferId: input.saleOfferId,
        inventoryPoolId: pool.id,
        performanceId: entitlement.performanceId,
      },
    });
  }
}
