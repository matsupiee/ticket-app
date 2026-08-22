import { db } from "@ticket-app/db";

import { requireOrganizerEvent } from "../../../../shared/event/require-organizer-event";
import { summarizeEventSales } from "../../../../shared/event/summarize-event-sales";
import type { EventGetInput, EventGetOutput } from "./route";

// イベント詳細（ハブ）と各設定ページが必要とするデータを1本で返す（ADR 0012）。
export async function handler({
  input,
  context,
}: {
  input: EventGetInput;
  context: { session: { user: { id: string } } };
}): Promise<EventGetOutput> {
  await requireOrganizerEvent({
    eventOrganizerId: input.eventOrganizerId,
    eventId: input.eventId,
    userId: context.session.user.id,
  });

  const event = await db.event.findUniqueOrThrow({
    where: { id: input.eventId },
    include: {
      stages: { orderBy: { startsAt: "asc" }, include: { venue: true } },
      inventoryCategories: { orderBy: { displayOrder: "asc" } },
      rateTypes: { orderBy: { displayOrder: "asc" } },
      saleWindows: {
        orderBy: { applicationStartsAt: "asc" },
        include: {
          saleOffers: {
            orderBy: { displayOrder: "asc" },
            include: {
              saleOfferRates: true,
              saleOfferEntitlements: { include: { inventoryPool: true } },
            },
          },
        },
      },
    },
  });

  const inventoryPools = await db.inventoryPool.findMany({
    where: { stage: { eventId: event.id } },
  });
  // 販売可能な残数は在庫枠を数えて出す。InventoryPool.capacity は表示用のキャッシュ値なので使わない
  const availableCounts = await db.inventorySlot.groupBy({
    by: ["inventoryPoolId"],
    where: { status: "AVAILABLE", inventoryPool: { stage: { eventId: event.id } } },
    _count: { _all: true },
  });
  const availableByPoolId = new Map(
    availableCounts.map((count) => [count.inventoryPoolId, count._count._all]),
  );

  const soldTickets = await db.ticket.findMany({
    where: { applicationItem: { application: { saleWindow: { eventId: event.id } } } },
    select: { applicationItem: { select: { saleOfferRate: { select: { saleOfferId: true } } } } },
  });
  const soldByOfferId = new Map<string, number>();
  for (const ticket of soldTickets) {
    const saleOfferId = ticket.applicationItem.saleOfferRate.saleOfferId;
    soldByOfferId.set(saleOfferId, (soldByOfferId.get(saleOfferId) ?? 0) + 1);
  }

  const sales = (await summarizeEventSales([event.id])).get(event.id) ?? {
    grossSales: 0,
    ticketsSold: 0,
  };

  return {
    id: event.id,
    name: event.name,
    description: event.description,
    publishesAt: event.publishesAt?.toISOString() ?? null,
    closesAt: event.closesAt?.toISOString() ?? null,
    stages: event.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      venueId: stage.venueId,
      venueName: stage.venue.name,
      doorsOpenAt: stage.doorsOpenAt.toISOString(),
      startsAt: stage.startsAt.toISOString(),
    })),
    inventoryCategories: event.inventoryCategories.map((inventoryCategory) => ({
      id: inventoryCategory.id,
      kind: inventoryCategory.kind,
      name: inventoryCategory.name,
      description: inventoryCategory.description,
      displayOrder: inventoryCategory.displayOrder,
      entryNumberPrefix: inventoryCategory.entryNumberPrefix,
    })),
    rateTypes: event.rateTypes.map((rateType) => ({
      id: rateType.id,
      name: rateType.name,
      displayOrder: rateType.displayOrder,
    })),
    inventoryPools: inventoryPools.map((pool) => ({
      id: pool.id,
      stageId: pool.stageId,
      inventoryCategoryId: pool.inventoryCategoryId,
      capacity: pool.capacity,
      availableQuantity: availableByPoolId.get(pool.id) ?? 0,
    })),
    saleWindows: event.saleWindows.map((saleWindow) => ({
      id: saleWindow.id,
      name: saleWindow.name,
      publishesAt: saleWindow.publishesAt?.toISOString() ?? null,
      applicationStartsAt: saleWindow.applicationStartsAt.toISOString(),
      applicationEndsAt: saleWindow.applicationEndsAt.toISOString(),
      isSmsAuthRequired: saleWindow.isSmsAuthRequired,
      saleMethod: saleWindow.saleMethod,
      autoLotteryStartsAt: saleWindow.autoLotteryStartsAt?.toISOString() ?? null,
      notifiesLotteryResultAt: saleWindow.notifiesLotteryResultAt?.toISOString() ?? null,
      maxLotteryItemCount: saleWindow.maxLotteryItemCount,
      canceledAt: saleWindow.canceledAt?.toISOString() ?? null,
      cancelReason: saleWindow.cancelReason,
      offers: saleWindow.saleOffers.map((offer) => ({
        id: offer.id,
        name: offer.name,
        description: offer.description,
        maxQuantityPerOrder: offer.maxQuantityPerOrder,
        quantityStep: offer.quantityStep,
        displayOrder: offer.displayOrder,
        rates: offer.saleOfferRates.map((rate) => ({
          id: rate.id,
          rateTypeId: rate.rateTypeId,
          price: rate.price,
        })),
        entitlements: offer.saleOfferEntitlements.map((entitlement) => ({
          id: entitlement.id,
          inventoryPoolId: entitlement.inventoryPoolId,
          stageId: entitlement.inventoryPool.stageId,
          inventoryCategoryId: entitlement.inventoryPool.inventoryCategoryId,
        })),
        soldQuantity: soldByOfferId.get(offer.id) ?? 0,
        // 通し券は複数公演の在庫を消費するため、いちばん少ない在庫が売れる上限になる
        availableQuantity: getOfferAvailableQuantity(
          offer.saleOfferEntitlements.map(
            (entitlement) => availableByPoolId.get(entitlement.inventoryPoolId) ?? 0,
          ),
        ),
        minPrice: offer.saleOfferRates.reduce(
          (min, rate) => (rate.price < min ? rate.price : min),
          offer.saleOfferRates[0]?.price ?? 0,
        ),
      })),
    })),
    sales,
  };
}

function getOfferAvailableQuantity(availableQuantities: number[]) {
  if (availableQuantities.length === 0) {
    return 0;
  }

  return Math.min(...availableQuantities);
}
