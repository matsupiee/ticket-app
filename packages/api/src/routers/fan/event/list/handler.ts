import { db } from "@ticket-app/db";

export async function listEventsHandler({
  input,
}: {
  input: {
    cursor?: string;
    limit?: number;
    query?: string;
  };
}) {
  const now = new Date();
  const limit = input.limit ?? 20;
  const events = await db.event.findMany({
    where: {
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
      ...(input.query
        ? {
            OR: [
              {
                name: {
                  contains: input.query,
                  mode: "insensitive" as const,
                },
              },
              {
                description: {
                  contains: input.query,
                  mode: "insensitive" as const,
                },
              },
              {
                organizer: {
                  name: {
                    contains: input.query,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "asc",
      },
    ],
    cursor: input.cursor
      ? {
          id: input.cursor,
        }
      : undefined,
    skip: input.cursor ? 1 : 0,
    take: limit + 1,
    include: fanEventInclude(now),
  });
  const items = events.slice(0, limit).map((event) => toFanEventListItem(event));
  const next = events[limit];

  return {
    items,
    nextCursor: next?.id,
  };
}

type AdmissionMethod = "GENERAL_ADMISSION" | "NUMBERED_ENTRY" | "RESERVED_SEAT";
type SaleMethod = "FIRST_COME" | "LOTTERY";

type EventForListResponse = {
  id: string;
  name: string;
  description: string;
  organizer?: {
    name: string;
  } | null;
  performances: {
    startsAt: Date;
    venue: {
      name: string;
    };
    inventoryPools: {
      admissionMethod: AdmissionMethod;
    }[];
  }[];
  saleWindows: {
    method: SaleMethod;
    saleOffers: {
      saleOfferRates: {
        price: number;
      }[];
    }[];
  }[];
};

function toFanEventListItem(event: EventForListResponse) {
  const firstPerformance = getEarliestPerformance(event.performances);
  const saleMethods = unique(event.saleWindows.map((saleWindow) => saleWindow.method));
  const prices = event.saleWindows.flatMap((saleWindow) =>
    saleWindow.saleOffers.flatMap((offer) => offer.saleOfferRates.map((rate) => rate.price)),
  );

  return {
    id: event.id,
    name: event.name,
    description: event.description,
    eventOrganizerName: event.organizer?.name ?? "主催者未設定",
    location: getEventLocation(event.performances),
    imageUrl: getEventImageUrl(event),
    tags: getEventTags(event),
    firstPerformanceStartsAt: firstPerformance?.startsAt.toISOString(),
    saleMethods,
    minPrice: prices.length > 0 ? Math.min(...prices) : undefined,
  };
}

function getEarliestPerformance<T extends { startsAt: Date }>(performances: T[]) {
  return [...performances].sort(
    (first, second) => first.startsAt.getTime() - second.startsAt.getTime(),
  )[0];
}

function getEventLocation(performances: EventForListResponse["performances"]) {
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

function getEventImageUrl(event: Pick<EventForListResponse, "performances">) {
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

function getEventTags(event: Pick<EventForListResponse, "performances" | "saleWindows">) {
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

export function fanEventInclude(now: Date) {
  return {
    organizer: true,
    feeRules: {
      where: {
        disabledAt: {
          gt: now,
        },
        saleWindowId: null,
        saleOfferId: null,
      },
      orderBy: {
        displayOrder: "asc" as const,
      },
    },
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
      where: {
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
      orderBy: {
        applicationStartsAt: "asc" as const,
      },
      include: {
        feeRules: {
          where: {
            disabledAt: {
              gt: now,
            },
            saleOfferId: null,
          },
          orderBy: {
            displayOrder: "asc" as const,
          },
        },
        saleOffers: {
          orderBy: {
            displayOrder: "asc" as const,
          },
          include: {
            feeRules: {
              where: {
                disabledAt: {
                  gt: now,
                },
              },
              orderBy: {
                displayOrder: "asc" as const,
              },
            },
            saleOfferRates: {
              orderBy: {
                displayOrder: "asc" as const,
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
