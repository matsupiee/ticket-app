import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

import { requireOrganizerEditor } from "../../../../shared/organizer-access";

export async function createEventHandler({
  input,
  context,
}: {
  input: {
    eventOrganizerId: string;
    name: string;
    description: string;
    publicTicketing?: {
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
    throw new ORPCError("BAD_REQUEST", {
      message: "開場日時は開演日時より前にしてください",
    });
  }

  if (publicTicketing && publicTicketing.saleStartsAt >= publicTicketing.saleEndsAt) {
    throw new ORPCError("BAD_REQUEST", {
      message: "販売開始日時は販売終了日時より前にしてください",
    });
  }

  const event = await db.$transaction(async (tx) => {
    const createdEvent = await tx.event.create({
      data: {
        organizerId: input.eventOrganizerId,
        name: input.name,
        description: input.description,
      },
    });

    if (!publicTicketing) {
      return createdEvent;
    }

    const venue = await tx.venue.create({
      data: {
        name: publicTicketing.venueName,
      },
    });
    const performance = await tx.performance.create({
      data: {
        eventId: createdEvent.id,
        venueId: venue.id,
        name: publicTicketing.performanceName,
        doorsOpenAt: publicTicketing.doorsOpenAt,
        startsAt: publicTicketing.startsAt,
      },
    });
    const seatCategory = await tx.seatCategory.create({
      data: {
        eventId: createdEvent.id,
        name: publicTicketing.seatCategoryName,
        description: `${publicTicketing.seatCategoryName}の整理番号席`,
        active: true,
        displayOrder: 0,
      },
    });
    const rateType = await tx.rateType.create({
      data: {
        eventId: createdEvent.id,
        name: publicTicketing.rateTypeName,
        displayOrder: 0,
      },
    });
    const inventoryPool = await tx.inventoryPool.create({
      data: {
        performanceId: performance.id,
        seatCategoryId: seatCategory.id,
        admissionMethod: "NUMBERED_ENTRY",
        seatAllocationMethod: "IMMEDIATE",
        capacity: publicTicketing.capacity,
      },
    });

    await tx.inventoryUnit.createMany({
      data: Array.from({ length: publicTicketing.capacity }, (_, index) => ({
        inventoryPoolId: inventoryPool.id,
        performanceId: performance.id,
        entryNumber: index + 1,
      })),
    });

    const saleWindow = await tx.saleWindow.create({
      data: {
        eventId: createdEvent.id,
        name: publicTicketing.saleWindowName,
        publishesAt: new Date(),
        applicationStartsAt: publicTicketing.saleStartsAt,
        applicationEndsAt: publicTicketing.saleEndsAt,
        isSmsAuthRequired: false,
        method: publicTicketing.saleMethod,
        lotteryMode: "AUTO",
      },
    });
    const saleOffer = await tx.saleOffer.create({
      data: {
        saleWindowId: saleWindow.id,
        name: publicTicketing.seatCategoryName,
        description: "整理番号順に入場する先着販売チケットです。",
        maxQuantityPerOrder: publicTicketing.maxQuantityPerOrder,
        displayOrder: 0,
      },
    });

    await tx.saleOfferRate.create({
      data: {
        saleOfferId: saleOffer.id,
        rateTypeId: rateType.id,
        price: publicTicketing.price,
        currency: "JPY",
        minQuantity: 1,
        maxQuantity: publicTicketing.maxQuantityPerOrder,
        quantityStep: 1,
        displayOrder: 0,
      },
    });
    await tx.saleOfferEntitlement.create({
      data: {
        saleOfferId: saleOffer.id,
        inventoryPoolId: inventoryPool.id,
        performanceId: performance.id,
      },
    });

    return createdEvent;
  });

  return {
    id: event.id,
    updatedAt: event.updatedAt.toISOString(),
  };
}

function parseDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ORPCError("BAD_REQUEST", {
      message: "日時の形式が正しくありません",
    });
  }

  return date;
}
