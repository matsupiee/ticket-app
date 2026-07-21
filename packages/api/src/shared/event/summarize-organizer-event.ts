type AdmissionMethod = "GENERAL_ADMISSION" | "NUMBERED_ENTRY" | "RESERVED_SEAT";
type SeatAllocationMethod = "NONE" | "LOTTERY_LATER" | "IMMEDIATE";
type SaleMethod = "FIRST_COME" | "LOTTERY";
type LotteryMode = "MANUAL" | "AUTO";
type OrganizerEventStatus = "DRAFT" | "ON_SALE" | "ENDED" | "CANCELED";
type FeePayer = "BUYER" | "EVENT_ORGANIZER";

type OrderItemForSales = {
  quantity: number;
  unitPrice: number;
  orderFeeLines: {
    payer: FeePayer;
    feeAmount: number;
  }[];
};

export type OrganizerEventForSummary = {
  id: string;
  name: string;
  description: string;
  seatCategories: {
    id: string;
    name: string;
    description: string;
    active: boolean;
    displayOrder: number;
  }[];
  rateTypes: {
    id: string;
    name: string;
    displayOrder: number;
  }[];
  performances: {
    id: string;
    name: string;
    startsAt: Date;
    doorsOpenAt: Date;
    venueId: string;
    seatLayoutId: string | null;
    venue: {
      name: string;
    };
    inventoryPools: {
      id: string;
      seatCategoryId: string;
      admissionMethod: AdmissionMethod;
      seatAllocationMethod: SeatAllocationMethod;
      capacity: number;
      heldCount: number;
      soldCount: number;
    }[];
  }[];
  saleWindows: {
    id: string;
    name: string;
    publishesAt: Date | null;
    applicationStartsAt: Date;
    applicationEndsAt: Date;
    canceledAt: Date | null;
    cancelReason: string | null;
    isSmsAuthRequired: boolean;
    method: SaleMethod;
    lotteryMode: LotteryMode;
    notifyLotteryResultAt: Date | null;
    saleOffers: {
      id: string;
      name: string;
      description: string;
      maxQuantityPerOrder: number;
      displayOrder: number;
      saleOfferRates: {
        id: string;
        rateTypeId: string;
        price: number;
        currency: string;
        minQuantity: number;
        maxQuantity: number;
        quantityStep: number;
        displayOrder: number;
        orderItems?: OrderItemForSales[];
      }[];
      saleOfferEntitlements: {
        id: string;
        performanceId: string | null;
        inventoryPool: {
          capacity: number;
          heldCount: number;
          soldCount: number;
          admissionMethod: AdmissionMethod;
          performanceId: string;
          seatCategoryId: string;
          seatCategory: {
            name: string;
          };
        };
      }[];
    }[];
  }[];
};

type EventSales = {
  grossSales: number;
  ticketsSold: number;
  buyerFeeAmount: number;
  organizerFeeAmount: number;
};

// organizer.event.get / organizer.event.list の両方で使う、Eventの集計・編集用データへの変換。
export function summarizeOrganizerEvent(event: OrganizerEventForSummary) {
  const sales = calculateEventSales(event);

  return {
    id: event.id,
    name: event.name,
    description: event.description,
    status: getEventStatus(event),
    location: getEventLocation(event.performances),
    tags: getEventTags(event),
    seatCategories: event.seatCategories.map((seatCategory) => ({
      id: seatCategory.id,
      name: seatCategory.name,
      description: seatCategory.description,
      active: seatCategory.active,
      displayOrder: seatCategory.displayOrder,
    })),
    rateTypes: event.rateTypes.map((rateType) => ({
      id: rateType.id,
      name: rateType.name,
      displayOrder: rateType.displayOrder,
    })),
    inventoryPools: event.performances.flatMap((performance) =>
      performance.inventoryPools.map((pool) => ({
        id: pool.id,
        performanceId: performance.id,
        seatCategoryId: pool.seatCategoryId,
        admissionMethod: pool.admissionMethod,
        seatAllocationMethod: pool.seatAllocationMethod,
        capacity: pool.capacity,
        heldCount: pool.heldCount,
        soldCount: pool.soldCount,
      })),
    ),
    performances: event.performances.map((performance) => ({
      id: performance.id,
      name: performance.name,
      venueName: performance.venue.name,
      venueId: performance.venueId,
      seatLayoutId: performance.seatLayoutId ?? undefined,
      startsAt: performance.startsAt.toISOString(),
      doorsOpenAt: performance.doorsOpenAt.toISOString(),
      admissionMethod: getPerformanceAdmissionMethod(performance.inventoryPools),
    })),
    saleWindows: event.saleWindows.map((saleWindow) => ({
      id: saleWindow.id,
      name: saleWindow.name,
      saleMethod: saleWindow.method,
      opensAt: saleWindow.applicationStartsAt.toISOString(),
      closesAt: saleWindow.applicationEndsAt.toISOString(),
      publishesAt: saleWindow.publishesAt ? saleWindow.publishesAt.toISOString() : undefined,
      isSmsAuthRequired: saleWindow.isSmsAuthRequired,
      lotteryMode: saleWindow.lotteryMode,
      notifyLotteryResultAt: saleWindow.notifyLotteryResultAt
        ? saleWindow.notifyLotteryResultAt.toISOString()
        : undefined,
      canceledAt: saleWindow.canceledAt ? saleWindow.canceledAt.toISOString() : undefined,
      cancelReason: saleWindow.cancelReason ?? undefined,
      offers: saleWindow.saleOffers.map((offer) => {
        const offerSales = calculateOfferSales(offer);

        return {
          id: offer.id,
          name: offer.name,
          description: offer.description,
          displayOrder: offer.displayOrder,
          seatCategoryName: getOfferSeatCategoryName(offer),
          soldQuantity: offerSales.ticketsSold,
          availableQuantity: calculateOfferAvailableQuantity(offer),
          minPrice: calculateOfferMinPrice(offer),
          maxQuantityPerOrder: offer.maxQuantityPerOrder,
          rates: offer.saleOfferRates.map((rate) => ({
            id: rate.id,
            rateTypeId: rate.rateTypeId,
            price: rate.price,
            currency: rate.currency,
            minQuantity: rate.minQuantity,
            maxQuantity: rate.maxQuantity,
            quantityStep: rate.quantityStep,
            displayOrder: rate.displayOrder,
          })),
          entitlements: offer.saleOfferEntitlements.map((entitlement) => ({
            id: entitlement.id,
            performanceId: entitlement.performanceId ?? entitlement.inventoryPool.performanceId,
            seatCategoryId: entitlement.inventoryPool.seatCategoryId,
          })),
        };
      }),
    })),
    sales,
    settlement: {
      status: "SCHEDULED" as const,
      scheduledAt: getSettlementDate(event).toISOString(),
    },
  };
}

function getEventStatus(event: OrganizerEventForSummary): OrganizerEventStatus {
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

function isPublished(
  saleWindow: Pick<
    OrganizerEventForSummary["saleWindows"][number],
    "publishesAt" | "applicationStartsAt"
  >,
  now: Date,
) {
  return !saleWindow.publishesAt || saleWindow.publishesAt <= now;
}

function calculateEventSales(event: OrganizerEventForSummary): EventSales {
  return event.saleWindows.reduce(
    (eventSales, saleWindow) =>
      addSales(
        eventSales,
        saleWindow.saleOffers.reduce(
          (saleWindowSales, offer) => addSales(saleWindowSales, calculateOfferSales(offer)),
          emptySales(),
        ),
      ),
    emptySales(),
  );
}

function calculateOfferSales(
  offer: OrganizerEventForSummary["saleWindows"][number]["saleOffers"][number],
): EventSales {
  return offer.saleOfferRates.reduce((sales, rate) => {
    const rateSales = (rate.orderItems ?? []).reduce(
      (orderItemSales, orderItem) =>
        addSales(orderItemSales, {
          ticketsSold: orderItem.quantity,
          grossSales: orderItem.quantity * orderItem.unitPrice,
          buyerFeeAmount: sumFeeLines(orderItem.orderFeeLines, "BUYER"),
          organizerFeeAmount: sumFeeLines(orderItem.orderFeeLines, "EVENT_ORGANIZER"),
        }),
      emptySales(),
    );

    return addSales(sales, rateSales);
  }, emptySales());
}

function sumFeeLines(
  feeLines: OrderItemForSales["orderFeeLines"],
  payer: OrderItemForSales["orderFeeLines"][number]["payer"],
) {
  return feeLines
    .filter((feeLine) => feeLine.payer === payer)
    .reduce((total, feeLine) => total + feeLine.feeAmount, 0);
}

function addSales(first: EventSales, second: EventSales): EventSales {
  return {
    grossSales: first.grossSales + second.grossSales,
    ticketsSold: first.ticketsSold + second.ticketsSold,
    buyerFeeAmount: first.buyerFeeAmount + second.buyerFeeAmount,
    organizerFeeAmount: first.organizerFeeAmount + second.organizerFeeAmount,
  };
}

function emptySales(): EventSales {
  return {
    grossSales: 0,
    ticketsSold: 0,
    buyerFeeAmount: 0,
    organizerFeeAmount: 0,
  };
}

function calculateOfferAvailableQuantity(
  offer: OrganizerEventForSummary["saleWindows"][number]["saleOffers"][number],
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

function calculateOfferMinPrice(
  offer: OrganizerEventForSummary["saleWindows"][number]["saleOffers"][number],
) {
  if (offer.saleOfferRates.length === 0) {
    return 0;
  }

  return Math.min(...offer.saleOfferRates.map((rate) => rate.price));
}

function getSettlementDate(event: OrganizerEventForSummary) {
  const latestPerformance = [...event.performances].sort(
    (first, second) => second.startsAt.getTime() - first.startsAt.getTime(),
  )[0];
  const baseDate = latestPerformance?.startsAt ?? new Date();

  return new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + 1, 28, 1, 0));
}

function getEventLocation(performances: OrganizerEventForSummary["performances"]) {
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
  offer: OrganizerEventForSummary["saleWindows"][number]["saleOffers"][number],
) {
  const seatCategoryNames = unique(
    offer.saleOfferEntitlements.map((entitlement) => entitlement.inventoryPool.seatCategory.name),
  ).sort();

  return seatCategoryNames.length > 0 ? seatCategoryNames.join(" / ") : "席種未設定";
}

function getEventTags(event: Pick<OrganizerEventForSummary, "performances" | "saleWindows">) {
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
