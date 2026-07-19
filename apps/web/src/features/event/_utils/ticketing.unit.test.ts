import { describe, expect, it } from "vitest";

import { calculateTicketQuote, filterEvents, ticketEvents } from "./ticketing";

describe("ticketing", () => {
  it("購入者負担手数料を含む支払予定額を計算する", () => {
    const quote = calculateTicketQuote({
      eventId: "tokyo-orbit-2026",
      saleWindowId: "tokyo-orbit-general",
      performanceId: "tokyo-orbit-day-1",
      offerId: "tokyo-orbit-s-seat",
      rateTypeId: "adult",
      quantity: 2,
    });

    expect(quote.subtotalAmount).toBe(24_000);
    expect(quote.buyerFeeAmount).toBe(660);
    expect(quote.organizerFeeAmount).toBe(1_200);
    expect(quote.totalAmount).toBe(24_660);
  });

  it("券種ごとの購入上限を超える申し込みを拒否する", () => {
    expect(() =>
      calculateTicketQuote({
        eventId: "bay-side-fes-2026",
        saleWindowId: "bay-side-lottery",
        performanceId: "bay-side-saturday",
        offerId: "bay-side-one-day",
        rateTypeId: "adult",
        quantity: 3,
      }),
    ).toThrow("枚数は1枚から2枚まで選択できます");
  });

  it("イベント名、地域、タグで検索できる", () => {
    expect(filterEvents("京都").map((event) => event.id)).toEqual(["kyoto-classic-night"]);
    expect(filterEvents("抽選").map((event) => event.id)).toEqual(["bay-side-fes-2026"]);
    expect(filterEvents("").map((event) => event.id)).toEqual(
      ticketEvents.map((event) => event.id),
    );
  });
});
