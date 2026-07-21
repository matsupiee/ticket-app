import type { GetEventOutput } from "@ticket-app/api/routers/organizer/event/get/route";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    to,
    ...props
  }: {
    children: ReactNode;
    params?: Record<string, string>;
    to: string;
  }) => (
    <a href={to.replace("$eventId", params?.eventId ?? "")} {...props}>
      {children}
    </a>
  ),
}));

const { EventDetailPage } = await import("./page");

describe("EventDetailPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("イベント概要、公演、販売受付の販売率を表示する", () => {
    render(<EventDetailPage event={buildEvent()} />);

    expect(screen.getByRole("heading", { name: "TOKYO ORBIT 2026" })).toBeInTheDocument();
    expect(screen.getByText("販売中")).toBeInTheDocument();
    expect(screen.getByText("先着 ・ 電子チケット")).toBeInTheDocument();
    expect(screen.getByText("有明アリーナ")).toBeInTheDocument();
    expect(screen.getByText("2026年9月12日(土) 18:00 ・ 有明アリーナ")).toBeInTheDocument();
    expect(screen.getByText("総売上 ￥8,942,400 ・ 販売 736 / 1,110 枚")).toBeInTheDocument();

    expect(screen.getByRole("progressbar", { name: "S席の販売率" })).toHaveAttribute(
      "aria-valuenow",
      "77",
    );
    expect(screen.getByRole("progressbar", { name: "A席の販売率" })).toHaveAttribute(
      "aria-valuenow",
      "56",
    );
    expect(screen.getByRole("link", { name: /編集する/ })).toHaveAttribute(
      "href",
      "/events/tokyo-orbit-2026/edit",
    );
  });

  it("イベント全体の販売分母は在庫プール単位で集計する", () => {
    const event = buildEvent();
    const offer = {
      ...event.saleWindows[0]!.offers[0]!,
      soldQuantity: 5,
      availableQuantity: 95,
    };
    event.inventoryPools = [
      {
        id: "shared-pool",
        performanceId: "day-1",
        seatCategoryId: "s-seat",
        admissionMethod: "RESERVED_SEAT",
        seatAllocationMethod: "IMMEDIATE",
        capacity: 100,
        heldCount: 0,
        soldCount: 10,
      },
    ];
    event.saleWindows = [
      {
        ...event.saleWindows[0]!,
        id: "advance",
        name: "先行販売",
        offers: [{ ...offer, id: "advance-offer" }],
      },
      {
        ...event.saleWindows[0]!,
        id: "general",
        name: "一般販売",
        offers: [{ ...offer, id: "general-offer" }],
      },
    ];
    event.sales = {
      grossSales: 100_000,
      ticketsSold: 10,
      buyerFeeAmount: 0,
      organizerFeeAmount: 0,
    };

    render(<EventDetailPage event={event} />);

    expect(screen.getByText("総売上 ￥100,000 ・ 販売 10 / 100 枚")).toBeInTheDocument();
    expect(screen.getAllByText("受付別売上は未集計")).toHaveLength(2);
  });

  it("販売受付ごとの販売分母は同じ在庫プールを重複計上しない", () => {
    const event = buildEvent();
    const baseOffer = event.saleWindows[0]!.offers[0]!;
    event.inventoryPools = [
      {
        id: "shared-pool",
        performanceId: "day-1",
        seatCategoryId: "s-seat",
        admissionMethod: "RESERVED_SEAT",
        seatAllocationMethod: "IMMEDIATE",
        capacity: 100,
        heldCount: 0,
        soldCount: 10,
      },
    ];
    event.saleWindows = [
      {
        ...event.saleWindows[0]!,
        offers: [
          {
            ...baseOffer,
            id: "adult-offer",
            name: "指定席 一般",
            soldQuantity: 8,
            availableQuantity: 92,
            entitlements: [
              { id: "adult-entitlement", performanceId: "day-1", seatCategoryId: "s-seat" },
            ],
          },
          {
            ...baseOffer,
            id: "student-offer",
            name: "指定席 学生",
            soldQuantity: 2,
            availableQuantity: 98,
            entitlements: [
              { id: "student-entitlement", performanceId: "day-1", seatCategoryId: "s-seat" },
            ],
          },
        ],
      },
    ];
    event.sales = {
      grossSales: 100_000,
      ticketsSold: 10,
      buyerFeeAmount: 0,
      organizerFeeAmount: 0,
    };

    render(<EventDetailPage event={event} />);

    expect(screen.getByText("販売 10 / 100 枚")).toBeInTheDocument();
    expect(screen.queryByText("販売 10 / 200 枚")).not.toBeInTheDocument();
  });

  it("購入者向けに公開されていないイベントでは販売ページリンクを表示しない", () => {
    const event = buildEvent();
    event.saleWindows = [];

    render(<EventDetailPage event={event} />);

    expect(screen.queryByRole("link", { name: /販売ページを見る/ })).not.toBeInTheDocument();
  });
});

function buildEvent() {
  return {
    id: "tokyo-orbit-2026",
    name: "TOKYO ORBIT 2026",
    description:
      "東京湾岸の大型ホールで開催する、指定席中心のライブイベント。一般販売は先着順で運用します。",
    status: "ON_SALE",
    location: "有明アリーナ",
    tags: ["指定席", "先着", "電子チケット"],
    seatCategories: [
      {
        id: "s-seat",
        name: "S席",
        description: "",
        active: true,
        displayOrder: 0,
      },
      {
        id: "a-seat",
        name: "A席",
        description: "",
        active: true,
        displayOrder: 1,
      },
    ],
    rateTypes: [{ id: "adult", name: "一般", displayOrder: 0 }],
    inventoryPools: [
      {
        id: "s-pool",
        performanceId: "day-1",
        seatCategoryId: "s-seat",
        admissionMethod: "RESERVED_SEAT",
        seatAllocationMethod: "IMMEDIATE",
        capacity: 548,
        heldCount: 0,
        soldCount: 420,
      },
      {
        id: "a-pool",
        performanceId: "day-1",
        seatCategoryId: "a-seat",
        admissionMethod: "RESERVED_SEAT",
        seatAllocationMethod: "IMMEDIATE",
        capacity: 562,
        heldCount: 0,
        soldCount: 316,
      },
    ],
    performances: [
      {
        id: "day-1",
        name: "DAY 1",
        venueName: "有明アリーナ",
        venueId: "venue-1",
        startsAt: "2026-09-12T18:00:00+09:00",
        doorsOpenAt: "2026-09-12T17:00:00+09:00",
        admissionMethod: "RESERVED_SEAT",
      },
    ],
    saleWindows: [
      {
        id: "general",
        name: "一般販売",
        saleMethod: "FIRST_COME",
        opensAt: "2026-07-25T10:00:00+09:00",
        closesAt: "2026-09-10T23:59:00+09:00",
        isSmsAuthRequired: false,
        lotteryMode: "AUTO",
        offers: [
          {
            id: "s-offer",
            name: "S席",
            description: "",
            displayOrder: 0,
            seatCategoryName: "S席",
            soldQuantity: 420,
            availableQuantity: 128,
            minPrice: 12_000,
            maxQuantityPerOrder: 4,
            rates: [
              {
                id: "s-rate",
                rateTypeId: "adult",
                price: 12_000,
                currency: "JPY",
                minQuantity: 1,
                maxQuantity: 4,
                quantityStep: 1,
                displayOrder: 0,
              },
            ],
            entitlements: [
              { id: "s-entitlement", performanceId: "day-1", seatCategoryId: "s-seat" },
            ],
          },
          {
            id: "a-offer",
            name: "A席",
            description: "",
            displayOrder: 1,
            seatCategoryName: "A席",
            soldQuantity: 316,
            availableQuantity: 246,
            minPrice: 8_800,
            maxQuantityPerOrder: 4,
            rates: [
              {
                id: "a-rate",
                rateTypeId: "adult",
                price: 8_800,
                currency: "JPY",
                minQuantity: 1,
                maxQuantity: 4,
                quantityStep: 1,
                displayOrder: 0,
              },
            ],
            entitlements: [
              { id: "a-entitlement", performanceId: "day-1", seatCategoryId: "a-seat" },
            ],
          },
        ],
      },
    ],
    sales: {
      grossSales: 8_942_400,
      ticketsSold: 736,
      buyerFeeAmount: 242_880,
      organizerFeeAmount: 447_120,
    },
    settlement: {
      status: "SCHEDULED",
      scheduledAt: "2026-09-30T10:00:00+09:00",
    },
  } satisfies GetEventOutput;
}
