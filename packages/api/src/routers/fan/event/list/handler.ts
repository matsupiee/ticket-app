import { db } from "@ticket-app/db";

import { toFanEventListItem } from "../../../../shared/event-presenter";

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

export function fanEventInclude(now: Date) {
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
