import { describe, expect, it } from "vitest";

import {
  calculateEventSettlement,
  filterOrganizerEvents,
  getOrganizerEventById,
  organizerEvents,
  summarizeOrganizerPortfolio,
} from "./operations";

describe("organizer operations", () => {
  it("主催者の販売中イベントを含む売上と精算予定額を集計する", () => {
    const summary = summarizeOrganizerPortfolio(organizerEvents);

    expect(summary.eventCount).toBe(3);
    expect(summary.ticketsSold).toBe(1_230);
    expect(summary.grossSales).toBe(13_971_600);
    expect(summary.organizerFeeAmount).toBe(679_308);
    expect(summary.settlementAmount).toBe(13_292_292);
  });

  it("イベント単位の主催者負担手数料を精算額から差し引く", () => {
    const event = getOrganizerEventById("tokyo-orbit-2026");

    if (!event) {
      throw new Error("fixture event is missing");
    }

    expect(calculateEventSettlement(event)).toEqual({
      grossSales: 8_942_400,
      organizerFeeAmount: 447_120,
      settlementAmount: 8_495_280,
    });
  });

  it("イベント名、地域、販売方式で絞り込める", () => {
    expect(filterOrganizerEvents("抽選").map((event) => event.id)).toEqual(["bay-side-fes-2026"]);
    expect(filterOrganizerEvents("京都").map((event) => event.id)).toEqual(["kyoto-classic-night"]);
    expect(filterOrganizerEvents("").map((event) => event.id)).toEqual(
      organizerEvents.map((event) => event.id),
    );
  });
});
