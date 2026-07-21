import { db } from "@ticket-app/db";

import { organizerEventInclude } from "../../../../shared/event/organizer-event-include";
import {
  summarizeOrganizerEvent,
  type OrganizerEventForSummary,
} from "../../../../shared/event/summarize-organizer-event";
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
    status?: "DRAFT" | "ON_SALE" | "ENDED" | "CANCELED";
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
  const summaries = events.slice(0, limit).map((event) => summarizeOrganizerEvent(event));
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
    summary: summarizeOrganizerPortfolio(allEventsForSummary),
    nextCursor: next?.id,
  };
}

function summarizeOrganizerPortfolio(events: OrganizerEventForSummary[]) {
  const summaries = events.map((event) => summarizeOrganizerEvent(event));

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
