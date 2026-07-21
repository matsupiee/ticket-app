import { describe, expect, it } from "vitest";

import {
  summarizeOrganizerEvent,
  type OrganizerEventForSummary,
} from "./summarize-organizer-event";

describe("summarizeOrganizerEvent", () => {
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
          cancelReason: null,
          isSmsAuthRequired: false,
          method: "FIRST_COME",
          lotteryMode: "AUTO",
          notifyLotteryResultAt: null,
          saleOffers: [
            {
              id: "offer-paid",
              name: "購入済みオファー",
              description: "",
              displayOrder: 0,
              maxQuantityPerOrder: 4,
              saleOfferRates: [
                {
                  id: "rate-paid",
                  rateTypeId: "rate-type-adult",
                  price: 5_000,
                  currency: "JPY",
                  minQuantity: 1,
                  maxQuantity: 4,
                  quantityStep: 1,
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
                  id: "entitlement-paid",
                  performanceId: "performance-1",
                  inventoryPool: {
                    capacity: 10,
                    heldCount: 1,
                    soldCount: 8,
                    admissionMethod: "RESERVED_SEAT",
                    performanceId: "performance-1",
                    seatCategoryId: "seat-category-1",
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
              description: "",
              displayOrder: 1,
              maxQuantityPerOrder: 4,
              saleOfferRates: [],
              saleOfferEntitlements: [
                {
                  id: "entitlement-empty",
                  performanceId: "performance-1",
                  inventoryPool: {
                    capacity: 10,
                    heldCount: 1,
                    soldCount: 8,
                    admissionMethod: "RESERVED_SEAT",
                    performanceId: "performance-1",
                    seatCategoryId: "seat-category-1",
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

    const summary = summarizeOrganizerEvent(event);

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
        description: "",
        displayOrder: 0,
        seatCategoryName: "S席",
        soldQuantity: 2,
        availableQuantity: 1,
        minPrice: 5_000,
        maxQuantityPerOrder: 4,
        rates: [
          {
            id: "rate-paid",
            rateTypeId: "rate-type-adult",
            price: 5_000,
            currency: "JPY",
            minQuantity: 1,
            maxQuantity: 4,
            quantityStep: 1,
            displayOrder: 0,
          },
        ],
        entitlements: [
          {
            id: "entitlement-paid",
            performanceId: "performance-1",
            seatCategoryId: "seat-category-1",
          },
        ],
      },
      {
        id: "offer-empty",
        name: "未購入オファー",
        description: "",
        displayOrder: 1,
        seatCategoryName: "S席",
        soldQuantity: 0,
        availableQuantity: 1,
        minPrice: 0,
        maxQuantityPerOrder: 4,
        rates: [],
        entitlements: [
          {
            id: "entitlement-empty",
            performanceId: "performance-1",
            seatCategoryId: "seat-category-1",
          },
        ],
      },
    ]);
  });

  it("編集用の生データ(seatCategories/rateTypes/inventoryPools/公演の会場ID)をそのまま返す", () => {
    const event = buildOrganizerEvent({
      seatCategories: [
        { id: "seat-category-1", name: "S席", description: "", active: true, displayOrder: 0 },
        { id: "seat-category-2", name: "A席", description: "", active: false, displayOrder: 1 },
      ],
      rateTypes: [{ id: "rate-type-adult", name: "大人", displayOrder: 0 }],
      performances: [
        {
          id: "performance-1",
          name: "初日",
          startsAt: new Date("2026-09-01T10:00:00.000Z"),
          doorsOpenAt: new Date("2026-09-01T09:00:00.000Z"),
          venueId: "venue-1",
          seatLayoutId: "seat-layout-1",
          venue: { name: "テスト会場" },
          inventoryPools: [
            {
              id: "pool-1",
              seatCategoryId: "seat-category-1",
              admissionMethod: "RESERVED_SEAT",
              seatAllocationMethod: "IMMEDIATE",
              capacity: 10,
              heldCount: 1,
              soldCount: 2,
            },
          ],
        },
      ],
    });

    const summary = summarizeOrganizerEvent(event);

    expect(summary.seatCategories).toEqual([
      { id: "seat-category-1", name: "S席", description: "", active: true, displayOrder: 0 },
      { id: "seat-category-2", name: "A席", description: "", active: false, displayOrder: 1 },
    ]);
    expect(summary.rateTypes).toEqual([{ id: "rate-type-adult", name: "大人", displayOrder: 0 }]);
    expect(summary.inventoryPools).toEqual([
      {
        id: "pool-1",
        performanceId: "performance-1",
        seatCategoryId: "seat-category-1",
        admissionMethod: "RESERVED_SEAT",
        seatAllocationMethod: "IMMEDIATE",
        capacity: 10,
        heldCount: 1,
        soldCount: 2,
      },
    ]);
    expect(summary.performances[0]).toMatchObject({
      id: "performance-1",
      venueId: "venue-1",
      seatLayoutId: "seat-layout-1",
    });
  });

  it("通し券(複数entitlement)の在庫可能数は、entitlementごとの残数のうち最小値になる", () => {
    const event = buildOrganizerEvent({
      saleWindows: [
        buildSaleWindow({
          saleOffers: [
            buildOffer({
              saleOfferEntitlements: [
                buildEntitlement({ capacity: 10, heldCount: 0, soldCount: 8 }), // 残り2
                buildEntitlement({ capacity: 10, heldCount: 0, soldCount: 3 }), // 残り7
              ],
            }),
          ],
        }),
      ],
    });

    const summary = summarizeOrganizerEvent(event);

    expect(summary.saleWindows[0]?.offers[0]?.availableQuantity).toBe(2);
  });

  it("複数の料金種別を持つofferの最低価格は、ratesのうち最小値になる", () => {
    const event = buildOrganizerEvent({
      saleWindows: [
        buildSaleWindow({
          saleOffers: [
            buildOffer({
              saleOfferRates: [
                { ...buildRate(), rateTypeId: "rate-type-adult", price: 12_000 },
                { ...buildRate(), rateTypeId: "rate-type-child", price: 8_000, id: "rate-2" },
              ],
            }),
          ],
        }),
      ],
    });

    const summary = summarizeOrganizerEvent(event);

    expect(summary.saleWindows[0]?.offers[0]?.minPrice).toBe(8_000);
  });

  it.each([
    {
      label: "キャンセル済みのみの場合はCANCELED",
      saleWindows: [buildSaleWindow({ canceledAt: new Date() })],
      expectedStatus: "CANCELED",
    },
    {
      label: "公開済みかつ申込期間内の場合はON_SALE",
      saleWindows: [
        buildSaleWindow({
          publishesAt: hoursFromNow(-48),
          applicationStartsAt: hoursFromNow(-24),
          applicationEndsAt: hoursFromNow(24),
        }),
      ],
      expectedStatus: "ON_SALE",
    },
    {
      label: "申込開始前の場合はDRAFT",
      saleWindows: [
        buildSaleWindow({
          publishesAt: hoursFromNow(-1),
          applicationStartsAt: hoursFromNow(24),
          applicationEndsAt: hoursFromNow(48),
        }),
      ],
      expectedStatus: "DRAFT",
    },
    {
      label: "未公開(publishesAtが未来)の場合はDRAFT",
      saleWindows: [
        buildSaleWindow({
          publishesAt: hoursFromNow(24),
          applicationStartsAt: hoursFromNow(-1),
          applicationEndsAt: hoursFromNow(48),
        }),
      ],
      expectedStatus: "DRAFT",
    },
    {
      label: "申込終了後の場合はENDED",
      saleWindows: [
        buildSaleWindow({
          publishesAt: hoursFromNow(-48),
          applicationStartsAt: hoursFromNow(-24),
          applicationEndsAt: hoursFromNow(-1),
        }),
      ],
      expectedStatus: "ENDED",
    },
    {
      label: "販売受付が1件もない場合はDRAFT",
      saleWindows: [],
      expectedStatus: "DRAFT",
    },
  ])("$label", ({ saleWindows, expectedStatus }) => {
    const event = buildOrganizerEvent({ saleWindows });

    const summary = summarizeOrganizerEvent(event);

    expect(summary.status).toBe(expectedStatus);
  });
});

function buildOrganizerEvent(
  overrides: Partial<OrganizerEventForSummary> = {},
): OrganizerEventForSummary {
  return {
    id: "event-1",
    name: "テストイベント",
    description: "",
    seatCategories: [],
    rateTypes: [],
    performances: [
      {
        id: "performance-1",
        name: "初日",
        startsAt: new Date("2026-09-01T10:00:00.000Z"),
        doorsOpenAt: new Date("2026-09-01T09:00:00.000Z"),
        venueId: "venue-1",
        seatLayoutId: null,
        venue: {
          name: "テスト会場",
        },
        inventoryPools: [
          {
            id: "pool-1",
            seatCategoryId: "seat-category-1",
            admissionMethod: "RESERVED_SEAT",
            seatAllocationMethod: "IMMEDIATE",
            capacity: 10,
            heldCount: 1,
            soldCount: 8,
          },
        ],
      },
    ],
    saleWindows: [],
    ...overrides,
  };
}

type SaleWindowForSummary = OrganizerEventForSummary["saleWindows"][number];
type OfferForSummary = SaleWindowForSummary["saleOffers"][number];
type EntitlementForSummary = OfferForSummary["saleOfferEntitlements"][number];
type RateForSummary = OfferForSummary["saleOfferRates"][number];

function buildSaleWindow(overrides: Partial<SaleWindowForSummary> = {}): SaleWindowForSummary {
  return {
    id: "sale-window-1",
    name: "一般販売",
    publishesAt: null,
    applicationStartsAt: new Date("2026-08-01T10:00:00.000Z"),
    applicationEndsAt: new Date("2026-08-31T10:00:00.000Z"),
    canceledAt: null,
    cancelReason: null,
    isSmsAuthRequired: false,
    method: "FIRST_COME",
    lotteryMode: "AUTO",
    notifyLotteryResultAt: null,
    saleOffers: [],
    ...overrides,
  };
}

function buildOffer(overrides: Partial<OfferForSummary> = {}): OfferForSummary {
  return {
    id: "offer-1",
    name: "S席",
    description: "",
    displayOrder: 0,
    maxQuantityPerOrder: 4,
    saleOfferRates: [buildRate()],
    saleOfferEntitlements: [buildEntitlement()],
    ...overrides,
  };
}

function buildEntitlement(
  overrides: Partial<{ capacity: number; heldCount: number; soldCount: number }> = {},
): EntitlementForSummary {
  return {
    id: "entitlement-1",
    performanceId: "performance-1",
    inventoryPool: {
      capacity: overrides.capacity ?? 10,
      heldCount: overrides.heldCount ?? 0,
      soldCount: overrides.soldCount ?? 0,
      admissionMethod: "RESERVED_SEAT",
      performanceId: "performance-1",
      seatCategoryId: "seat-category-1",
      seatCategory: { name: "S席" },
    },
  };
}

function buildRate(overrides: Partial<RateForSummary> = {}): RateForSummary {
  return {
    id: "rate-1",
    rateTypeId: "rate-type-adult",
    price: 5_000,
    currency: "JPY",
    minQuantity: 1,
    maxQuantity: 4,
    quantityStep: 1,
    displayOrder: 0,
    ...overrides,
  };
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
