import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

import { requireOrganizerEditor } from "../../../../shared/organizer-access";

export async function getOrganizerEventHandler({
  input,
  context,
}: {
  input: {
    eventOrganizerId: string;
    eventId: string;
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

  const event = await db.event.findFirst({
    where: {
      id: input.eventId,
      organizerId: input.eventOrganizerId,
    },
    include: organizerEventInclude(),
  });

  if (!event) {
    throw new ORPCError("NOT_FOUND");
  }

  return toOrganizerEventSummary(event);
}

function organizerEventInclude() {
  return {
    organizer: true,
    performances: {
      orderBy: {
        startsAt: "asc" as const,
      },
      include: {
        venue: true,
        inventoryPools: true,
      },
    },
    rateTypes: {
      orderBy: {
        displayOrder: "asc" as const,
      },
    },
    saleWindows: {
      orderBy: {
        applicationStartsAt: "asc" as const,
      },
      include: {
        feeRules: {
          orderBy: {
            displayOrder: "asc" as const,
          },
        },
        saleOffers: {
          orderBy: {
            displayOrder: "asc" as const,
          },
          include: {
            saleOfferRates: {
              orderBy: {
                displayOrder: "asc" as const,
              },
              include: {
                orderItems: {
                  where: {
                    order: {
                      status: "PAID" as const,
                    },
                  },
                  include: {
                    orderFeeLines: true,
                  },
                },
              },
            },
            saleOfferEntitlements: {
              include: {
                inventoryPool: {
                  include: {
                    seatCategory: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

type AdmissionMethod = "GENERAL_ADMISSION" | "NUMBERED_ENTRY" | "RESERVED_SEAT";
type SaleMethod = "FIRST_COME" | "LOTTERY";
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

type OrganizerEventForResponse = {
  id: string;
  name: string;
  description: string;
  performances: {
    id: string;
    name: string;
    startsAt: Date;
    venue: {
      name: string;
    };
    inventoryPools: {
      admissionMethod: AdmissionMethod;
    }[];
  }[];
  saleWindows: {
    id: string;
    name: string;
    publishesAt?: Date | null;
    applicationStartsAt: Date;
    applicationEndsAt: Date;
    canceledAt?: Date | null;
    method: SaleMethod;
    saleOffers: {
      id: string;
      name: string;
      saleOfferRates: {
        price: number;
        displayOrder: number;
        orderItems?: OrderItemForSales[];
      }[];
      saleOfferEntitlements: {
        inventoryPool: {
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
  }[];
};

type EventSales = {
  grossSales: number;
  ticketsSold: number;
  buyerFeeAmount: number;
  organizerFeeAmount: number;
};

function toOrganizerEventSummary(event: OrganizerEventForResponse) {
  const sales = calculateEventSales(event);

  return {
    id: event.id,
    name: event.name,
    description: event.description,
    status: getEventStatus(event),
    location: getEventLocation(event.performances),
    tags: getEventTags(event),
    performances: event.performances.map((performance) => ({
      id: performance.id,
      name: performance.name,
      venueName: performance.venue.name,
      startsAt: performance.startsAt.toISOString(),
      admissionMethod: getPerformanceAdmissionMethod(performance.inventoryPools),
    })),
    saleWindows: event.saleWindows.map((saleWindow) => ({
      id: saleWindow.id,
      name: saleWindow.name,
      saleMethod: saleWindow.method,
      opensAt: saleWindow.applicationStartsAt.toISOString(),
      closesAt: saleWindow.applicationEndsAt.toISOString(),
      offers: saleWindow.saleOffers.map((offer) => {
        const offerSales = calculateOfferSales(offer);

        return {
          id: offer.id,
          name: offer.name,
          seatCategoryName: getOfferSeatCategoryName(offer),
          soldQuantity: offerSales.ticketsSold,
          availableQuantity: calculateOfferAvailableQuantity(offer),
          minPrice: calculateOfferMinPrice(offer),
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

function getEventStatus(event: OrganizerEventForResponse): OrganizerEventStatus {
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
    OrganizerEventForResponse["saleWindows"][number],
    "publishesAt" | "applicationStartsAt"
  >,
  now: Date,
) {
  return !saleWindow.publishesAt || saleWindow.publishesAt <= now;
}

function calculateEventSales(event: OrganizerEventForResponse): EventSales {
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
  offer: OrganizerEventForResponse["saleWindows"][number]["saleOffers"][number],
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
  offer: OrganizerEventForResponse["saleWindows"][number]["saleOffers"][number],
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
  offer: OrganizerEventForResponse["saleWindows"][number]["saleOffers"][number],
) {
  if (offer.saleOfferRates.length === 0) {
    return 0;
  }

  return Math.min(...offer.saleOfferRates.map((rate) => rate.price));
}

function getSettlementDate(event: OrganizerEventForResponse) {
  const latestPerformance = [...event.performances].sort(
    (first, second) => second.startsAt.getTime() - first.startsAt.getTime(),
  )[0];
  const baseDate = latestPerformance?.startsAt ?? new Date();

  return new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + 1, 28, 1, 0));
}

function getEventLocation(performances: OrganizerEventForResponse["performances"]) {
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
  offer: OrganizerEventForResponse["saleWindows"][number]["saleOffers"][number],
) {
  const seatCategoryNames = unique(
    offer.saleOfferEntitlements.map((entitlement) => entitlement.inventoryPool.seatCategory.name),
  ).sort();

  return seatCategoryNames.length > 0 ? seatCategoryNames.join(" / ") : "席種未設定";
}

function getEventTags(event: Pick<OrganizerEventForResponse, "performances" | "saleWindows">) {
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
