import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

import { requireOrganizerEditor } from "../../../../shared/organizer-access";

type PublicTicketingInput = {
  venueName: string;
  performanceName: string;
  doorsOpenAt: string;
  startsAt: string;
  seatCategoryName: string;
  rateTypeName: string;
  price: number;
  capacity: number;
  maxQuantityPerOrder: number;
  saleWindowName: string;
  saleStartsAt: string;
  saleEndsAt: string;
  saleMethod: "FIRST_COME" | "LOTTERY";
};

export async function updateEventHandler({
  input,
  context,
}: {
  input: {
    eventOrganizerId: string;
    eventId: string;
    name: string;
    description: string;
    publicTicketing?: PublicTicketingInput;
  };
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

  const publicTicketing = input.publicTicketing
    ? {
        ...input.publicTicketing,
        startsAt: parseDate(input.publicTicketing.startsAt),
        doorsOpenAt: parseDate(input.publicTicketing.doorsOpenAt),
        saleStartsAt: parseDate(input.publicTicketing.saleStartsAt),
        saleEndsAt: parseDate(input.publicTicketing.saleEndsAt),
      }
    : undefined;

  if (publicTicketing && publicTicketing.doorsOpenAt >= publicTicketing.startsAt) {
    throw new ORPCError("BAD_REQUEST", { message: "開場日時は開演日時より前にしてください" });
  }

  if (publicTicketing && publicTicketing.saleStartsAt >= publicTicketing.saleEndsAt) {
    throw new ORPCError("BAD_REQUEST", { message: "販売開始日時は販売終了日時より前にしてください" });
  }

  const event = await db.event.findFirst({
    where: { id: input.eventId, organizerId: input.eventOrganizerId },
    select: {
      id: true,
      performances: {
        orderBy: { startsAt: "asc" },
        take: 1,
        select: { id: true, venueId: true, inventoryPools: { take: 1, select: { id: true, soldCount: true, capacity: true } } },
      },
      saleWindows: {
        orderBy: { applicationStartsAt: "asc" },
        take: 1,
        select: {
          id: true,
          saleOffers: {
            orderBy: { displayOrder: "asc" },
            take: 1,
            select: { id: true, saleOfferRates: { orderBy: { displayOrder: "asc" }, take: 1, select: { id: true, rateTypeId: true } } },
          },
        },
      },
    },
  });

  if (!event) {
    throw new ORPCError("NOT_FOUND");
  }

  const updatedEvent = await db.$transaction(async (tx) => {
    const updated = await tx.event.update({
      where: { id: input.eventId },
      data: { name: input.name, description: input.description },
    });

    if (!publicTicketing) {
      return updated;
    }

    const performance = event.performances[0];
    const saleWindow = event.saleWindows[0];
    const offer = saleWindow?.saleOffers[0];
    const rate = offer?.saleOfferRates[0];
    const inventoryPool = performance?.inventoryPools[0];

    if (!performance || !saleWindow || !offer || !rate || !inventoryPool) {
      throw new ORPCError("BAD_REQUEST", {
        message: "編集できる販売設定が見つかりません",
      });
    }

    if (publicTicketing.capacity < inventoryPool.soldCount) {
      throw new ORPCError("BAD_REQUEST", {
        message: "販売枚数は販売済み枚数以上にしてください",
      });
    }

    await tx.venue.update({ where: { id: performance.venueId }, data: { name: publicTicketing.venueName } });
    await tx.performance.update({
      where: { id: performance.id },
      data: { name: publicTicketing.performanceName, startsAt: publicTicketing.startsAt, doorsOpenAt: publicTicketing.doorsOpenAt },
    });
    await tx.saleWindow.update({
      where: { id: saleWindow.id },
      data: { name: publicTicketing.saleWindowName, applicationStartsAt: publicTicketing.saleStartsAt, applicationEndsAt: publicTicketing.saleEndsAt, method: publicTicketing.saleMethod },
    });
    await tx.saleOffer.update({
      where: { id: offer.id },
      data: { name: publicTicketing.seatCategoryName, maxQuantityPerOrder: publicTicketing.maxQuantityPerOrder },
    });
    await tx.rateType.update({ where: { id: rate.rateTypeId }, data: { name: publicTicketing.rateTypeName } });
    await tx.saleOfferRate.update({
      where: { id: rate.id },
      data: { price: publicTicketing.price, maxQuantity: publicTicketing.maxQuantityPerOrder },
    });

    await tx.inventoryPool.update({ where: { id: inventoryPool.id }, data: { capacity: publicTicketing.capacity } });

    return updated;
  });

  return { id: updatedEvent.id, updatedAt: updatedEvent.updatedAt.toISOString() };
}

function parseDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ORPCError("BAD_REQUEST", { message: "日時の形式が正しくありません" });
  }

  return date;
}
