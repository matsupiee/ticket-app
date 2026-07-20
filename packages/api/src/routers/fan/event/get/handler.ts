import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

import { fanEventInclude } from "../list/handler";

export async function getEventHandler({ input }: { input: { eventId: string } }) {
  const now = new Date();
  const event = await db.event.findFirst({
    where: {
      id: input.eventId,
      OR: [
        {
          status: null,
        },
        {
          status: {
            in: ["ON_SALE" as const, "ENDED" as const],
          },
        },
      ],
      saleWindows: {
        some: {
          canceledAt: null,
          OR: [
            {
              publishesAt: null,
            },
            {
              publishesAt: {
                lte: now,
              },
            },
          ],
        },
      },
    },
    include: fanEventInclude(now),
  });

  if (!event) {
    throw new ORPCError("NOT_FOUND");
  }

  return toFanEventDetail(event);
}

type AdmissionMethod = "GENERAL_ADMISSION" | "NUMBERED_ENTRY" | "RESERVED_SEAT";
type SaleMethod = "FIRST_COME" | "LOTTERY";

type FeeRuleForResponse = {
  id: string;
  name: string;
  payer: "BUYER" | "EVENT_ORGANIZER";
  currency: string;
  rateBasisPoints: number;
  flatAmount: number;
  displayOrder: number;
};

type EventForDetailResponse = {
  id: string;
  name: string;
  description: string;
  organizer?: {
    name: string;
  } | null;
  performances: {
    id: string;
    name: string;
    doorsOpenAt: Date;
    startsAt: Date;
    venue: {
      name: string;
    };
    inventoryPools: {
      admissionMethod: AdmissionMethod;
    }[];
  }[];
  rateTypes?: {
    id: string;
    name: string;
    displayOrder: number;
  }[];
  saleWindows: {
    id: string;
    name: string;
    applicationStartsAt: Date;
    applicationEndsAt: Date;
    method: SaleMethod;
    isSmsAuthRequired: boolean;
    saleOffers: {
      id: string;
      name: string;
      description: string;
      maxQuantityPerOrder: number;
      feeRules?: FeeRuleForResponse[];
      saleOfferRates: {
        rateTypeId: string;
        price: number;
        currency: string;
        minQuantity: number;
        maxQuantity: number;
        quantityStep: number;
        displayOrder: number;
      }[];
      saleOfferEntitlements: {
        performanceId?: string | null;
        inventoryPool: {
          performanceId: string;
          capacity: number;
          heldCount: number;
          soldCount: number;
          admissionMethod: AdmissionMethod;
          seatCategory: {
            name: string;
          };
        };
      }[];
    }[];
    feeRules?: FeeRuleForResponse[];
  }[];
  feeRules?: FeeRuleForResponse[];
};

function toFanEventDetail(event: EventForDetailResponse) {
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    eventOrganizerName: event.organizer?.name ?? "主催者未設定",
    location: getEventLocation(event.performances),
    imageUrl: getEventImageUrl(event),
    tags: getEventTags(event),
    rateTypes: [...(event.rateTypes ?? [])]
      .sort((first, second) => first.displayOrder - second.displayOrder)
      .map((rateType) => ({
        id: rateType.id,
        name: rateType.name,
        displayOrder: rateType.displayOrder,
      })),
    performances: event.performances.map((performance) => ({
      id: performance.id,
      name: performance.name,
      venueName: performance.venue.name,
      doorsOpenAt: performance.doorsOpenAt.toISOString(),
      startsAt: performance.startsAt.toISOString(),
      admissionMethod: getPerformanceAdmissionMethod(performance.inventoryPools),
    })),
    saleWindows: event.saleWindows.map((saleWindow) =>
      toFanSaleWindow(saleWindow, event.feeRules ?? []),
    ),
  };
}

function toFanSaleWindow(
  saleWindow: EventForDetailResponse["saleWindows"][number],
  eventFeeRules: FeeRuleForResponse[],
) {
  return {
    id: saleWindow.id,
    name: saleWindow.name,
    saleMethod: saleWindow.method,
    opensAt: saleWindow.applicationStartsAt.toISOString(),
    closesAt: saleWindow.applicationEndsAt.toISOString(),
    isSmsAuthRequired: saleWindow.isSmsAuthRequired,
    offers: saleWindow.saleOffers.map((offer) => ({
      id: offer.id,
      name: offer.name,
      seatCategoryName: getOfferSeatCategoryName(offer),
      description: offer.description,
      maxQuantityPerOrder: offer.maxQuantityPerOrder,
      availableQuantity: calculateOfferAvailableQuantity(offer),
      feeRules: toFeeRulesForResponse([
        ...eventFeeRules,
        ...(saleWindow.feeRules ?? []),
        ...(offer.feeRules ?? []),
      ]),
      performanceIds: unique(
        offer.saleOfferEntitlements.map(
          (entitlement) => entitlement.performanceId ?? entitlement.inventoryPool.performanceId,
        ),
      ).sort(),
      rates: [...offer.saleOfferRates]
        .sort((first, second) => first.displayOrder - second.displayOrder)
        .map((rate) => ({
          rateTypeId: rate.rateTypeId,
          price: rate.price,
          currency: rate.currency,
          minQuantity: rate.minQuantity,
          maxQuantity: rate.maxQuantity,
          quantityStep: rate.quantityStep,
        })),
    })),
    feeRules: toFeeRulesForResponse(saleWindow.feeRules ?? []),
  };
}

function toFeeRulesForResponse(feeRules: FeeRuleForResponse[]) {
  return [...feeRules]
    .sort((first, second) => first.displayOrder - second.displayOrder)
    .map((feeRule) => ({
      id: feeRule.id,
      name: feeRule.name,
      payer: feeRule.payer,
      currency: feeRule.currency,
      rateBasisPoints: feeRule.rateBasisPoints,
      flatAmount: feeRule.flatAmount,
      displayOrder: feeRule.displayOrder,
    }));
}

function getEventLocation(performances: EventForDetailResponse["performances"]) {
  const venueNames = unique(
    [...performances]
      .sort((first, second) => first.startsAt.getTime() - second.startsAt.getTime())
      .map((performance) => performance.venue.name),
  );

  const primaryVenueName = venueNames[0];

  if (!primaryVenueName) {
    return "会場未定";
  }

  return venueNames.length === 1 ? primaryVenueName : `${primaryVenueName} ほか`;
}

function getPerformanceAdmissionMethod(inventoryPools: { admissionMethod: AdmissionMethod }[]) {
  const methods = unique(inventoryPools.map((pool) => pool.admissionMethod));

  return admissionMethodPriority.find((method) => methods.includes(method)) ?? "GENERAL_ADMISSION";
}

function getOfferSeatCategoryName(
  offer: EventForDetailResponse["saleWindows"][number]["saleOffers"][number],
) {
  const seatCategoryNames = unique(
    offer.saleOfferEntitlements.map((entitlement) => entitlement.inventoryPool.seatCategory.name),
  ).sort();

  return seatCategoryNames.length > 0 ? seatCategoryNames.join(" / ") : "席種未設定";
}

function calculateOfferAvailableQuantity(
  offer: EventForDetailResponse["saleWindows"][number]["saleOffers"][number],
) {
  if (offer.saleOfferEntitlements.length === 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      ...offer.saleOfferEntitlements.map(
        (entitlement) =>
          entitlement.inventoryPool.capacity -
          entitlement.inventoryPool.heldCount -
          entitlement.inventoryPool.soldCount,
      ),
    ),
  );
}

function getEventImageUrl(event: Pick<EventForDetailResponse, "performances">) {
  const admissionMethods = event.performances.flatMap((performance) =>
    performance.inventoryPools.map((pool) => pool.admissionMethod),
  );

  if (admissionMethods.includes("NUMBERED_ENTRY")) {
    return "/events/bay-side-fes.svg";
  }

  if (admissionMethods.includes("RESERVED_SEAT")) {
    return "/events/tokyo-orbit.svg";
  }

  return "/events/kyoto-classic-night.svg";
}

function getEventTags(event: Pick<EventForDetailResponse, "performances" | "saleWindows">) {
  const admissionLabels = unique(
    event.performances.flatMap((performance) =>
      performance.inventoryPools.map((pool) => admissionMethodLabels[pool.admissionMethod]),
    ),
  );
  const saleMethodLabelsForEvent = unique(
    event.saleWindows.map((saleWindow) => saleMethodLabels[saleWindow.method]),
  );

  return [...admissionLabels, ...saleMethodLabelsForEvent, "電子チケット"];
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

const admissionMethodPriority = [
  "RESERVED_SEAT",
  "NUMBERED_ENTRY",
  "GENERAL_ADMISSION",
] as const satisfies AdmissionMethod[];

const admissionMethodLabels = {
  GENERAL_ADMISSION: "自由席",
  NUMBERED_ENTRY: "整理番号",
  RESERVED_SEAT: "指定席",
} as const satisfies Record<AdmissionMethod, string>;

const saleMethodLabels = {
  FIRST_COME: "先着",
  LOTTERY: "抽選",
} as const satisfies Record<SaleMethod, string>;
