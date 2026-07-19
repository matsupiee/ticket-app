import { db } from "@ticket-app/db";

import {
  summarizeOrganizerEvents,
  toOrganizerEventSummary,
} from "../../../../shared/event-presenter";
import { requireOrganizerEditor } from "../../../../shared/organizer-access";

export async function listOrganizerEventsHandler({
  input,
  context,
}: {
  input: {
    eventOrganizerId: string;
    cursor?: string;
    limit?: number;
    query?: string;
    status?: "DRAFT" | "ON_SALE" | "PAUSED" | "ENDED" | "CANCELED";
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

  const limit = input.limit ?? 20;
  const events = await db.event.findMany({
    where: {
      organizerId: input.eventOrganizerId,
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
    include: organizerEventInclude(),
  });
  const summaries = events.slice(0, limit).map((event) => toOrganizerEventSummary(event));
  const items = input.status
    ? summaries.filter((event) => event.status === input.status)
    : summaries;
  const allEventsForSummary = await db.event.findMany({
    where: {
      organizerId: input.eventOrganizerId,
    },
    include: organizerEventInclude(),
  });
  const next = events[limit];

  return {
    items,
    summary: summarizeOrganizerEvents(allEventsForSummary),
    nextCursor: next?.id,
  };
}

export function organizerEventInclude() {
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
