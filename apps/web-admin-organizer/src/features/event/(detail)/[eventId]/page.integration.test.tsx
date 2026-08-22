import type { EventGetOutput } from "@ticket-app/api/routers/organizer/event/get/route";
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
    expect(screen.getByText("公開中")).toBeInTheDocument();
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
        stageId: "day-1",
        inventoryCategoryId: "s-seat",
        capacity: 100,
        availableQuantity: 90,
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
    event.sales = { grossSales: 100_000, ticketsSold: 10 };

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
        stageId: "day-1",
        inventoryCategoryId: "s-seat",
        capacity: 100,
        availableQuantity: 90,
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
              {
                id: "adult-entitlement",
                inventoryPoolId: "shared-pool",
                stageId: "day-1",
                inventoryCategoryId: "s-seat",
              },
            ],
          },
          {
            ...baseOffer,
            id: "student-offer",
            name: "指定席 学生",
            soldQuantity: 2,
            availableQuantity: 98,
            entitlements: [
              {
                id: "student-entitlement",
                inventoryPoolId: "shared-pool",
                stageId: "day-1",
                inventoryCategoryId: "s-seat",
              },
            ],
          },
        ],
      },
    ];
    event.sales = { grossSales: 100_000, ticketsSold: 10 };

    render(<EventDetailPage event={event} />);

    expect(screen.getByText("販売 10 / 100 枚")).toBeInTheDocument();
    expect(screen.queryByText("販売 10 / 200 枚")).not.toBeInTheDocument();
  });

  it("設定がすべて揃っているイベントでは、販売開始までのチェックリストを出さない", () => {
    render(<EventDetailPage event={buildEvent()} />);

    expect(screen.queryByText("販売開始までに必要な設定")).not.toBeInTheDocument();
  });

  it("席種・料金種別・販売受付が未設定なら、残り件数と各設定ページへの導線を表示する", () => {
    const event = buildEvent();

    render(
      <EventDetailPage
        event={{
          ...event,
          publishesAt: null,
          inventoryCategories: [],
          rateTypes: [],
          inventoryPools: [],
          saleWindows: [],
        }}
      />,
    );

    expect(screen.getByText("販売開始までに必要な設定")).toBeInTheDocument();
    expect(screen.getByText("残り3件")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "席種と在庫数を設定する" })).toHaveAttribute(
      "href",
      "/events/tokyo-orbit-2026/inventory-categories",
    );
    expect(screen.getByRole("link", { name: "料金種別を設定する" })).toHaveAttribute(
      "href",
      "/events/tokyo-orbit-2026/rate-types",
    );
    expect(screen.getByRole("link", { name: "販売受付と券を登録する" })).toHaveAttribute(
      "href",
      "/events/tokyo-orbit-2026/sale-windows",
    );
    // 基本情報と公演は作成フォームで入力済みなので、チェックリスト上は完了扱いになる
    expect(screen.getByText("公演を登録する（設定済み）")).toBeInTheDocument();
  });

  it("公開日時が未設定のイベントでは販売ページリンクを表示しない", () => {
    const event = buildEvent();

    render(<EventDetailPage event={{ ...event, publishesAt: null }} />);

    expect(screen.queryByRole("link", { name: /販売ページを見る/ })).not.toBeInTheDocument();
  });
});

function buildEvent(): EventGetOutput {
  return {
    id: "tokyo-orbit-2026",
    name: "TOKYO ORBIT 2026",
    description:
      "東京湾岸の大型ホールで開催する、指定席中心のライブイベント。一般販売は先着順で運用します。",
    // 過去日を入れて「公開中」の状態にする
    publishesAt: "2020-07-25T01:00:00.000Z",
    closesAt: null,
    inventoryCategories: [
      {
        id: "s-seat",
        kind: "RESERVED_SEAT",
        name: "S席",
        description: "",
        displayOrder: 0,
        entryNumberPrefix: null,
      },
      {
        id: "a-seat",
        kind: "RESERVED_SEAT",
        name: "A席",
        description: "",
        displayOrder: 1,
        entryNumberPrefix: null,
      },
    ],
    rateTypes: [{ id: "adult", name: "一般", displayOrder: 0 }],
    inventoryPools: [
      {
        id: "s-pool",
        stageId: "day-1",
        inventoryCategoryId: "s-seat",
        capacity: 548,
        availableQuantity: 128,
      },
      {
        id: "a-pool",
        stageId: "day-1",
        inventoryCategoryId: "a-seat",
        capacity: 562,
        availableQuantity: 246,
      },
    ],
    stages: [
      {
        id: "day-1",
        name: "DAY 1",
        venueName: "有明アリーナ",
        venueId: "venue-1",
        startsAt: "2026-09-12T09:00:00.000Z",
        doorsOpenAt: "2026-09-12T08:00:00.000Z",
      },
    ],
    saleWindows: [
      {
        id: "general",
        name: "一般販売",
        saleMethod: "FIRST_COME",
        publishesAt: "2026-07-25T01:00:00.000Z",
        applicationStartsAt: "2026-07-25T01:00:00.000Z",
        applicationEndsAt: "2026-09-10T14:59:00.000Z",
        isSmsAuthRequired: false,
        autoLotteryStartsAt: null,
        notifiesLotteryResultAt: null,
        maxLotteryItemCount: null,
        canceledAt: null,
        cancelReason: null,
        offers: [
          {
            id: "s-offer",
            name: "S席",
            description: "",
            displayOrder: 0,
            quantityStep: 1,
            soldQuantity: 420,
            availableQuantity: 128,
            minPrice: 12_000,
            maxQuantityPerOrder: 4,
            rates: [{ id: "s-rate", rateTypeId: "adult", price: 12_000 }],
            entitlements: [
              {
                id: "s-entitlement",
                inventoryPoolId: "s-pool",
                stageId: "day-1",
                inventoryCategoryId: "s-seat",
              },
            ],
          },
          {
            id: "a-offer",
            name: "A席",
            description: "",
            displayOrder: 1,
            quantityStep: 1,
            soldQuantity: 316,
            availableQuantity: 246,
            minPrice: 8_800,
            maxQuantityPerOrder: 4,
            rates: [{ id: "a-rate", rateTypeId: "adult", price: 8_800 }],
            entitlements: [
              {
                id: "a-entitlement",
                inventoryPoolId: "a-pool",
                stageId: "day-1",
                inventoryCategoryId: "a-seat",
              },
            ],
          },
        ],
      },
    ],
    sales: {
      grossSales: 8_942_400,
      ticketsSold: 736,
    },
  };
}
