import { db } from "@ticket-app/db";

export async function listTicketsHandler({
  input,
  context,
}: {
  input: {
    cursor?: string;
    limit?: number;
  };
  context: {
    session: {
      user: {
        id: string;
      };
    };
  };
}) {
  const limit = input.limit ?? 20;
  const tickets = await db.ticket.findMany({
    where: {
      ownerUserId: context.session.user.id,
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
    include: {
      orderItem: {
        include: {
          saleOfferRate: {
            include: {
              saleOffer: {
                include: {
                  saleWindow: {
                    include: {
                      event: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      ticketEntitlements: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          performance: {
            include: {
              venue: true,
            },
          },
          inventoryUnit: {
            include: {
              seat: true,
            },
          },
          saleOfferEntitlement: {
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
  });
  const items = tickets.slice(0, limit).flatMap((ticket) => {
    const entitlement = ticket.ticketEntitlements[0];

    if (!entitlement) {
      return [];
    }

    const seat = entitlement.inventoryUnit.seat;

    return [
      {
        id: ticket.id,
        eventId: ticket.orderItem.saleOfferRate.saleOffer.saleWindow.event.id,
        eventName: ticket.orderItem.saleOfferRate.saleOffer.saleWindow.event.name,
        performanceId: entitlement.performanceId,
        performanceName: entitlement.performance.name,
        startsAt: entitlement.performance.startsAt.toISOString(),
        venueName: entitlement.performance.venue.name,
        seatCategoryName: entitlement.saleOfferEntitlement.inventoryPool.seatCategory.name,
        seatLabel: seat ? [seat.rowLabel, seat.seatLabel].filter(Boolean).join(" ") : undefined,
        entryNumber: entitlement.inventoryUnit.entryNumber ?? undefined,
        status: ticket.status,
        serialNumber: ticket.serialNumber,
      },
    ];
  });
  const next = tickets[limit];

  return {
    items,
    nextCursor: next?.id,
  };
}
