import { db } from "@ticket-app/db";

import { requireOrganizerEditor } from "../../../../shared/organizer-access";
import { summarizeEventSales } from "../../../../shared/event/summarize-event-sales";
import type { EventListInput, EventListOutput } from "./route";

// 主催者のイベント一覧とダッシュボードの集計を返す（ADR 0012）。
export async function handler({
  input,
  context,
}: {
  input: EventListInput;
  context: { session: { user: { id: string } } };
}): Promise<EventListOutput> {
  await requireOrganizerEditor({
    organizerId: input.eventOrganizerId,
    userId: context.session.user.id,
  });

  const events = await db.event.findMany({
    where: {
      organizerId: input.eventOrganizerId,
      ...(input.query
        ? {
            OR: [
              { name: { contains: input.query, mode: "insensitive" as const } },
              { description: { contains: input.query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      stages: { orderBy: { startsAt: "asc" }, take: 1, include: { venue: true } },
      _count: { select: { stages: true } },
      saleWindows: {
        where: { canceledAt: null },
        orderBy: { applicationStartsAt: "asc" },
        select: { saleMethod: true },
      },
    },
  });

  const salesByEventId = await summarizeEventSales(events.map((event) => event.id));
  const now = new Date();

  const items = events.map((event) => {
    const firstStage = event.stages[0];
    const sales = salesByEventId.get(event.id) ?? { grossSales: 0, ticketsSold: 0 };

    return {
      id: event.id,
      name: event.name,
      description: event.description,
      publishesAt: event.publishesAt?.toISOString() ?? null,
      closesAt: event.closesAt?.toISOString() ?? null,
      firstStage: firstStage
        ? { startsAt: firstStage.startsAt.toISOString(), venueName: firstStage.venue.name }
        : null,
      stageCount: event._count.stages,
      saleMethods: unique(event.saleWindows.map((saleWindow) => saleWindow.saleMethod)),
      grossSales: sales.grossSales,
      ticketsSold: sales.ticketsSold,
    };
  });

  return {
    items,
    summary: {
      eventCount: items.length,
      publishedEventCount: items.filter((item) => isPublished(item, now)).length,
      grossSales: items.reduce((total, item) => total + item.grossSales, 0),
      ticketsSold: items.reduce((total, item) => total + item.ticketsSold, 0),
    },
  };
}

// 公開中の判定はAPI側とフロント側で同じ規則にする（ADR 0012）。
// publishesAt が未設定なら下書き。closesAt が未設定なら公開終了日を決めていないものとして公開中扱いにする。
function isPublished(item: { publishesAt: string | null; closesAt: string | null }, now: Date) {
  if (!item.publishesAt || new Date(item.publishesAt) > now) {
    return false;
  }

  return !item.closesAt || new Date(item.closesAt) > now;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}
