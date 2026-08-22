import { db } from "@ticket-app/db";

export type EventSales = {
  grossSales: number;
  ticketsSold: number;
};

// イベントごとの売上と販売枚数。
// 集計用のテーブルを持たないため、注文と発券済みチケットを都度数える。
// 売上は手数料を除いた価格部分（Order.subtotalAmount）の合計とし、完了した注文だけを対象にする。
// 件数が増えたら集計テーブルの追加を検討する（ADR 0012）。
export async function summarizeEventSales(eventIds: string[]) {
  const salesByEventId = new Map<string, EventSales>(
    eventIds.map((eventId) => [eventId, { grossSales: 0, ticketsSold: 0 }]),
  );

  if (eventIds.length === 0) {
    return salesByEventId;
  }

  const orders = await db.order.findMany({
    where: {
      status: "COMPLETED",
      application: { saleWindow: { eventId: { in: eventIds } } },
    },
    select: {
      subtotalAmount: true,
      application: { select: { saleWindow: { select: { eventId: true } } } },
    },
  });

  for (const order of orders) {
    const eventId = order.application.saleWindow.eventId;
    const sales = salesByEventId.get(eventId);

    if (sales) {
      sales.grossSales += order.subtotalAmount;
    }
  }

  const tickets = await db.ticket.findMany({
    where: {
      applicationItem: { application: { saleWindow: { eventId: { in: eventIds } } } },
    },
    select: {
      applicationItem: {
        select: { application: { select: { saleWindow: { select: { eventId: true } } } } },
      },
    },
  });

  for (const ticket of tickets) {
    const eventId = ticket.applicationItem.application.saleWindow.eventId;
    const sales = salesByEventId.get(eventId);

    if (sales) {
      sales.ticketsSold += 1;
    }
  }

  return salesByEventId;
}
