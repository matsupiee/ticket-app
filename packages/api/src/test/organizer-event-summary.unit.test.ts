import { describe, expect, it, vi } from "vitest";

vi.mock("@ticket-app/db", () => ({
  db: {},
}));

import { toOrganizerEventSummary } from "../routers/organizer/event/list/handler";

describe("toOrganizerEventSummary", () => {
  it("手動で設定されたイベント状態を販売受付の期間計算より優先する", () => {
    const event = buildOrganizerEvent({
      status: "PAUSED",
      saleWindows: [
        {
          id: "sale-window-1",
          name: "一般販売",
          publishesAt: null,
          applicationStartsAt: new Date("2000-01-01T00:00:00.000Z"),
          applicationEndsAt: new Date("2999-01-01T00:00:00.000Z"),
          canceledAt: null,
          method: "FIRST_COME",
          saleOffers: [],
        },
      ],
    });

    expect(toOrganizerEventSummary(event).status).toBe("PAUSED");
  });

  it("販売数と売上は在庫プールではなく支払い済み注文明細から集計する", () => {
    const event = buildOrganizerEvent({
      saleWindows: [
        {
          id: "sale-window-1",
          name: "一般販売",
          publishesAt: new Date("2026-08-01T10:00:00.000Z"),
          applicationStartsAt: new Date("2026-08-01T10:00:00.000Z"),
          applicationEndsAt: new Date("2026-08-31T10:00:00.000Z"),
          canceledAt: null,
          method: "FIRST_COME",
          saleOffers: [
            {
              id: "offer-paid",
              name: "購入済みオファー",
              saleOfferRates: [
                {
                  price: 5_000,
                  displayOrder: 0,
                  orderItems: [
                    {
                      quantity: 2,
                      unitPrice: 4_500,
                      orderFeeLines: [
                        {
                          payer: "BUYER",
                          feeAmount: 600,
                        },
                        {
                          payer: "EVENT_ORGANIZER",
                          feeAmount: 300,
                        },
                      ],
                    },
                  ],
                },
              ],
              saleOfferEntitlements: [
                {
                  inventoryPool: {
                    capacity: 10,
                    heldCount: 1,
                    soldCount: 8,
                    admissionMethod: "RESERVED_SEAT",
                    seatCategory: {
                      name: "S席",
                    },
                  },
                },
              ],
            },
            {
              id: "offer-empty",
              name: "未購入オファー",
              saleOfferRates: [],
              saleOfferEntitlements: [
                {
                  inventoryPool: {
                    capacity: 10,
                    heldCount: 1,
                    soldCount: 8,
                    admissionMethod: "RESERVED_SEAT",
                    seatCategory: {
                      name: "S席",
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const summary = toOrganizerEventSummary(event);

    expect(summary.sales).toEqual({
      grossSales: 9_000,
      ticketsSold: 2,
      buyerFeeAmount: 600,
      organizerFeeAmount: 300,
    });
    expect(summary.saleWindows[0]?.offers).toEqual([
      {
        id: "offer-paid",
        name: "購入済みオファー",
        seatCategoryName: "S席",
        soldQuantity: 2,
        availableQuantity: 1,
        minPrice: 5_000,
      },
      {
        id: "offer-empty",
        name: "未購入オファー",
        seatCategoryName: "S席",
        soldQuantity: 0,
        availableQuantity: 1,
        minPrice: 0,
      },
    ]);
  });
});

function buildOrganizerEvent(
  overrides: Partial<Parameters<typeof toOrganizerEventSummary>[0]> = {},
): Parameters<typeof toOrganizerEventSummary>[0] {
  return {
    id: "event-1",
    name: "テストイベント",
    description: "",
    status: null,
    performances: [
      {
        id: "performance-1",
        name: "初日",
        startsAt: new Date("2026-09-01T10:00:00.000Z"),
        venue: {
          name: "テスト会場",
        },
        inventoryPools: [
          {
            admissionMethod: "RESERVED_SEAT",
          },
        ],
      },
    ],
    saleWindows: [],
    ...overrides,
  };
}
