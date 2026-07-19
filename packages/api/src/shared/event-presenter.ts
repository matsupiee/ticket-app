type AdmissionMethod = "GENERAL_ADMISSION" | "NUMBERED_ENTRY" | "RESERVED_SEAT";
type SaleMethod = "FIRST_COME" | "LOTTERY";
type OrganizerEventStatus = "DRAFT" | "ON_SALE" | "PAUSED" | "ENDED" | "CANCELED";

type EventForPresenter = {
  id: string;
  name: string;
  description: string;
  organizer?: {
    name: string;
  };
  performances: {
    id: string;
    name: string;
    doorsOpenAt?: Date;
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
  saleWindows: SaleWindowForPresenter[];
};

type SaleWindowForPresenter = {
  id: string;
  name: string;
  publishesAt?: Date | null;
  applicationStartsAt: Date;
  applicationEndsAt: Date;
  canceledAt?: Date | null;
  method: SaleMethod;
  isSmsAuthRequired: boolean;
  saleOffers: {
    id: string;
    name: string;
    description: string;
    maxQuantityPerOrder: number;
    displayOrder: number;
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
  feeRules?: {
    id: string;
    name: string;
    payer: "BUYER" | "EVENT_ORGANIZER";
    currency: string;
    rateBasisPoints: number;
    flatAmount: number;
    displayOrder: number;
  }[];
};

export function toFanEventListItem(event: EventForPresenter) {
  const firstPerformance = event.performances[0];
  const saleMethods = unique(event.saleWindows.map((saleWindow) => saleWindow.method));
  const prices = event.saleWindows.flatMap((saleWindow) =>
    saleWindow.saleOffers.flatMap((offer) => offer.saleOfferRates.map((rate) => rate.price)),
  );

  return {
    id: event.id,
    name: event.name,
    description: event.description,
    eventOrganizerName: event.organizer?.name ?? "主催者未設定",
    location: firstPerformance?.venue.name ?? "会場未定",
    imageUrl: getEventImageUrl(event),
    tags: getEventTags(event),
    firstPerformanceStartsAt: firstPerformance?.startsAt.toISOString(),
    saleMethods,
    minPrice: prices.length > 0 ? Math.min(...prices) : undefined,
  };
}

export function toFanEventDetail(event: EventForPresenter) {
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    eventOrganizerName: event.organizer?.name ?? "主催者未設定",
    location: event.performances[0]?.venue.name ?? "会場未定",
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
      doorsOpenAt: (performance.doorsOpenAt ?? performance.startsAt).toISOString(),
      startsAt: performance.startsAt.toISOString(),
      admissionMethod: performance.inventoryPools[0]?.admissionMethod ?? "GENERAL_ADMISSION",
    })),
    saleWindows: event.saleWindows.map((saleWindow) => toFanSaleWindow(saleWindow)),
  };
}

export function toOrganizerEventSummary(event: EventForPresenter) {
  const sales = calculateEventSales(event);
  const settlementAmount = sales.grossSales - sales.organizerFeeAmount;

  return {
    id: event.id,
    name: event.name,
    description: event.description,
    status: getEventStatus(event),
    location: event.performances[0]?.venue.name ?? "会場未定",
    imageUrl: getEventImageUrl(event),
    tags: getEventTags(event),
    performances: event.performances.map((performance) => ({
      id: performance.id,
      name: performance.name,
      venueName: performance.venue.name,
      startsAt: performance.startsAt.toISOString(),
      admissionMethod: performance.inventoryPools[0]?.admissionMethod ?? "GENERAL_ADMISSION",
    })),
    saleWindows: event.saleWindows.map((saleWindow) => ({
      id: saleWindow.id,
      name: saleWindow.name,
      saleMethod: saleWindow.method,
      opensAt: saleWindow.applicationStartsAt.toISOString(),
      closesAt: saleWindow.applicationEndsAt.toISOString(),
      offers: saleWindow.saleOffers.map((offer) => ({
        id: offer.id,
        name: offer.name,
        seatCategoryName:
          offer.saleOfferEntitlements[0]?.inventoryPool.seatCategory.name ?? "席種未設定",
        soldQuantity: calculateOfferSoldQuantity(offer),
        availableQuantity: calculateOfferAvailableQuantity(offer),
        minPrice: Math.min(...offer.saleOfferRates.map((rate) => rate.price)),
      })),
    })),
    sales,
    settlement: {
      status: "SCHEDULED" as const,
      scheduledAt: getSettlementDate(event).toISOString(),
      paidAt: settlementAmount === 0 ? undefined : undefined,
    },
  };
}

export function summarizeOrganizerEvents(events: EventForPresenter[]) {
  const summaries = events.map((event) => toOrganizerEventSummary(event));

  return summaries.reduce(
    (summary, event) => ({
      eventCount: summary.eventCount + 1,
      onSaleEventCount: summary.onSaleEventCount + (event.status === "ON_SALE" ? 1 : 0),
      ticketsSold: summary.ticketsSold + event.sales.ticketsSold,
      grossSales: summary.grossSales + event.sales.grossSales,
      organizerFeeAmount: summary.organizerFeeAmount + event.sales.organizerFeeAmount,
      settlementAmount:
        summary.settlementAmount + event.sales.grossSales - event.sales.organizerFeeAmount,
    }),
    {
      eventCount: 0,
      onSaleEventCount: 0,
      ticketsSold: 0,
      grossSales: 0,
      organizerFeeAmount: 0,
      settlementAmount: 0,
    },
  );
}

function toFanSaleWindow(saleWindow: SaleWindowForPresenter) {
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
      seatCategoryName:
        offer.saleOfferEntitlements[0]?.inventoryPool.seatCategory.name ?? "席種未設定",
      description: offer.description,
      maxQuantityPerOrder: offer.maxQuantityPerOrder,
      availableQuantity: calculateOfferAvailableQuantity(offer),
      performanceIds: offer.saleOfferEntitlements.map(
        (entitlement) => entitlement.performanceId ?? entitlement.inventoryPool.performanceId,
      ),
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
    feeRules: [...(saleWindow.feeRules ?? [])]
      .sort((first, second) => first.displayOrder - second.displayOrder)
      .map((feeRule) => ({
        id: feeRule.id,
        name: feeRule.name,
        payer: feeRule.payer,
        currency: feeRule.currency,
        rateBasisPoints: feeRule.rateBasisPoints,
        flatAmount: feeRule.flatAmount,
        displayOrder: feeRule.displayOrder,
      })),
  };
}

function getEventStatus(event: EventForPresenter): OrganizerEventStatus {
  const now = new Date();
  const activeSaleWindows = event.saleWindows.filter((saleWindow) => !saleWindow.canceledAt);

  if (event.saleWindows.length > 0 && activeSaleWindows.length === 0) {
    return "CANCELED";
  }

  if (
    activeSaleWindows.some(
      (saleWindow) =>
        isPublished(saleWindow, now) &&
        saleWindow.applicationStartsAt <= now &&
        saleWindow.applicationEndsAt >= now,
    )
  ) {
    return "ON_SALE";
  }

  if (
    activeSaleWindows.some(
      (saleWindow) => !isPublished(saleWindow, now) || saleWindow.applicationStartsAt > now,
    )
  ) {
    return "DRAFT";
  }

  if (activeSaleWindows.length > 0) {
    return "ENDED";
  }

  return "DRAFT";
}

function isPublished(saleWindow: SaleWindowForPresenter, now: Date) {
  return !saleWindow.publishesAt || saleWindow.publishesAt <= now;
}

function calculateOfferAvailableQuantity(offer: SaleWindowForPresenter["saleOffers"][number]) {
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

function calculateOfferSoldQuantity(offer: SaleWindowForPresenter["saleOffers"][number]) {
  if (offer.saleOfferEntitlements.length === 0) {
    return 0;
  }

  return Math.min(
    ...offer.saleOfferEntitlements.map((entitlement) => entitlement.inventoryPool.soldCount),
  );
}

function calculateEventSales(event: EventForPresenter) {
  const ticketsSold = event.saleWindows.reduce(
    (total, saleWindow) =>
      total +
      saleWindow.saleOffers.reduce(
        (offerTotal, offer) => offerTotal + calculateOfferSoldQuantity(offer),
        0,
      ),
    0,
  );
  const grossSales = event.saleWindows.reduce(
    (total, saleWindow) =>
      total +
      saleWindow.saleOffers.reduce((offerTotal, offer) => {
        const minPrice =
          offer.saleOfferRates.length > 0
            ? Math.min(...offer.saleOfferRates.map((rate) => rate.price))
            : 0;

        return offerTotal + calculateOfferSoldQuantity(offer) * minPrice;
      }, 0),
    0,
  );

  return {
    grossSales,
    ticketsSold,
    buyerFeeAmount: 0,
    organizerFeeAmount: 0,
  };
}

function getSettlementDate(event: EventForPresenter) {
  const latestPerformance = [...event.performances].sort(
    (first, second) => second.startsAt.getTime() - first.startsAt.getTime(),
  )[0];
  const baseDate = latestPerformance?.startsAt ?? new Date();

  return new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + 1, 28, 1, 0));
}

function getEventImageUrl(event: EventForPresenter) {
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

function getEventTags(event: EventForPresenter) {
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

const admissionMethodLabels = {
  GENERAL_ADMISSION: "自由席",
  NUMBERED_ENTRY: "整理番号",
  RESERVED_SEAT: "指定席",
} as const satisfies Record<AdmissionMethod, string>;

const saleMethodLabels = {
  FIRST_COME: "先着",
  LOTTERY: "抽選",
} as const satisfies Record<SaleMethod, string>;
