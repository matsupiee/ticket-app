export type EventStatus = "DRAFT" | "ON_SALE" | "ENDED" | "CANCELED";

export type SaleMethod = "FIRST_COME" | "LOTTERY";

export type SettlementStatus = "SCHEDULED" | "PROCESSING" | "PAID";

export type OrganizerPerformance = {
  id: string;
  name: string;
  venueName: string;
  startsAt: string;
  doorsOpenAt: string;
  admissionMethod: "GENERAL_ADMISSION" | "RESERVED_SEAT" | "NUMBERED_ENTRY";
};

export type OrganizerSaleWindow = {
  id: string;
  name: string;
  saleMethod: SaleMethod;
  opensAt: string;
  closesAt: string;
  offers: {
    id: string;
    name: string;
    seatCategoryName: string;
    soldQuantity: number;
    availableQuantity: number;
    minPrice: number;
    maxQuantityPerOrder: number;
  }[];
};

export type OrganizerEvent = {
  id: string;
  name: string;
  description: string;
  status: EventStatus;
  location: string;
  tags: string[];
  performances: OrganizerPerformance[];
  saleWindows: OrganizerSaleWindow[];
  sales: {
    grossSales: number;
    ticketsSold: number;
    buyerFeeAmount: number;
    organizerFeeAmount: number;
  };
  settlement: {
    status: SettlementStatus;
    scheduledAt: string;
    paidAt?: string;
  };
};

export type OrganizerPortfolioSummary = {
  eventCount: number;
  onSaleEventCount: number;
  ticketsSold: number;
  grossSales: number;
  organizerFeeAmount: number;
  settlementAmount: number;
};

export type EventSettlement = {
  grossSales: number;
  organizerFeeAmount: number;
  settlementAmount: number;
};

export const eventStatusLabels = {
  DRAFT: "下書き",
  ON_SALE: "販売中",
  ENDED: "終了",
  CANCELED: "キャンセル",
} as const satisfies Record<EventStatus, string>;

export const saleMethodLabels = {
  FIRST_COME: "先着",
  LOTTERY: "抽選",
} as const satisfies Record<SaleMethod, string>;

export const settlementStatusLabels = {
  SCHEDULED: "予定",
  PROCESSING: "処理中",
  PAID: "支払済み",
} as const satisfies Record<SettlementStatus, string>;

export const organizerEvents: OrganizerEvent[] = [
  {
    id: "tokyo-orbit-2026",
    name: "TOKYO ORBIT 2026",
    description:
      "東京湾岸の大型ホールで開催する、指定席中心のライブイベント。一般販売は先着順で運用します。",
    status: "ON_SALE",
    location: "東京",
    tags: ["指定席", "先着", "電子チケット"],
    performances: [
      {
        id: "tokyo-orbit-day-1",
        name: "DAY 1",
        venueName: "有明アリーナ",
        startsAt: "2026-09-12T18:00:00+09:00",
        doorsOpenAt: "2026-09-12T17:00:00+09:00",
        admissionMethod: "RESERVED_SEAT",
      },
      {
        id: "tokyo-orbit-day-2",
        name: "DAY 2",
        venueName: "有明アリーナ",
        startsAt: "2026-09-13T17:00:00+09:00",
        doorsOpenAt: "2026-09-13T16:00:00+09:00",
        admissionMethod: "RESERVED_SEAT",
      },
    ],
    saleWindows: [
      {
        id: "tokyo-orbit-general",
        name: "一般販売",
        saleMethod: "FIRST_COME",
        opensAt: "2026-07-25T10:00:00+09:00",
        closesAt: "2026-09-10T23:59:00+09:00",
        offers: [
          {
            id: "tokyo-orbit-s-seat",
            name: "S席",
            seatCategoryName: "S席",
            soldQuantity: 420,
            availableQuantity: 128,
            minPrice: 12_000,
            maxQuantityPerOrder: 4,
          },
          {
            id: "tokyo-orbit-a-seat",
            name: "A席",
            seatCategoryName: "A席",
            soldQuantity: 316,
            availableQuantity: 246,
            minPrice: 8_800,
            maxQuantityPerOrder: 4,
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
  },
  {
    id: "bay-side-fes-2026",
    name: "BAY SIDE FES 2026",
    description:
      "複数ステージを回遊するフェス形式のイベント。抽選受付では当落確定後に整理番号を発行します。",
    status: "DRAFT",
    location: "神奈川",
    tags: ["整理番号", "抽選", "通し券"],
    performances: [
      {
        id: "bay-side-saturday",
        name: "SATURDAY",
        venueName: "横浜ベイホール",
        startsAt: "2026-10-03T11:00:00+09:00",
        doorsOpenAt: "2026-10-03T10:00:00+09:00",
        admissionMethod: "NUMBERED_ENTRY",
      },
      {
        id: "bay-side-sunday",
        name: "SUNDAY",
        venueName: "横浜ベイホール",
        startsAt: "2026-10-04T11:00:00+09:00",
        doorsOpenAt: "2026-10-04T10:00:00+09:00",
        admissionMethod: "NUMBERED_ENTRY",
      },
    ],
    saleWindows: [
      {
        id: "bay-side-lottery",
        name: "オフィシャル先行抽選",
        saleMethod: "LOTTERY",
        opensAt: "2026-08-01T12:00:00+09:00",
        closesAt: "2026-08-12T23:59:00+09:00",
        offers: [
          {
            id: "bay-side-one-day",
            name: "1日券",
            seatCategoryName: "スタンディング",
            soldQuantity: 136,
            availableQuantity: 400,
            minPrice: 9_900,
            maxQuantityPerOrder: 4,
          },
          {
            id: "bay-side-two-day-pass",
            name: "2日通し券",
            seatCategoryName: "スタンディング",
            soldQuantity: 48,
            availableQuantity: 120,
            minPrice: 16_500,
            maxQuantityPerOrder: 2,
          },
        ],
      },
    ],
    sales: {
      grossSales: 1_927_200,
      ticketsSold: 184,
      buyerFeeAmount: 101_200,
      organizerFeeAmount: 77_088,
    },
    settlement: {
      status: "SCHEDULED",
      scheduledAt: "2026-10-31T10:00:00+09:00",
    },
  },
  {
    id: "kyoto-classic-night",
    name: "KYOTO CLASSIC NIGHT",
    description:
      "歴史あるホールで行うクラシック公演。先着販売を終了し、精算確定を待っている状態です。",
    status: "ENDED",
    location: "京都",
    tags: ["指定席", "先着", "紙チケット併用"],
    performances: [
      {
        id: "kyoto-classic-main",
        name: "本公演",
        venueName: "京都コンサートホール",
        startsAt: "2026-06-18T19:00:00+09:00",
        doorsOpenAt: "2026-06-18T18:00:00+09:00",
        admissionMethod: "RESERVED_SEAT",
      },
    ],
    saleWindows: [
      {
        id: "kyoto-classic-general",
        name: "一般販売",
        saleMethod: "FIRST_COME",
        opensAt: "2026-04-01T10:00:00+09:00",
        closesAt: "2026-06-17T23:59:00+09:00",
        offers: [
          {
            id: "kyoto-classic-reserved",
            name: "指定席",
            seatCategoryName: "指定席",
            soldQuantity: 310,
            availableQuantity: 0,
            minPrice: 9_800,
            maxQuantityPerOrder: 4,
          },
        ],
      },
    ],
    sales: {
      grossSales: 3_102_000,
      ticketsSold: 310,
      buyerFeeAmount: 102_300,
      organizerFeeAmount: 155_100,
    },
    settlement: {
      status: "PAID",
      scheduledAt: "2026-07-31T10:00:00+09:00",
      paidAt: "2026-07-31T11:30:00+09:00",
    },
  },
];

export function summarizeOrganizerPortfolio(events: OrganizerEvent[]): OrganizerPortfolioSummary {
  return events.reduce<OrganizerPortfolioSummary>(
    (summary, event) => {
      const settlement = calculateEventSettlement(event);

      return {
        eventCount: summary.eventCount + 1,
        onSaleEventCount: summary.onSaleEventCount + (event.status === "ON_SALE" ? 1 : 0),
        ticketsSold: summary.ticketsSold + event.sales.ticketsSold,
        grossSales: summary.grossSales + settlement.grossSales,
        organizerFeeAmount: summary.organizerFeeAmount + settlement.organizerFeeAmount,
        settlementAmount: summary.settlementAmount + settlement.settlementAmount,
      };
    },
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

export function calculateEventSettlement(event: OrganizerEvent): EventSettlement {
  return {
    grossSales: event.sales.grossSales,
    organizerFeeAmount: event.sales.organizerFeeAmount,
    settlementAmount: event.sales.grossSales - event.sales.organizerFeeAmount,
  };
}

export function getOrganizerEventById(eventId: string) {
  return organizerEvents.find((event) => event.id === eventId);
}

export function filterOrganizerEvents(query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ja-JP");

  if (!normalizedQuery) {
    return organizerEvents;
  }

  return organizerEvents.filter((event) => {
    const saleMethods = event.saleWindows.map(
      (saleWindow) => saleMethodLabels[saleWindow.saleMethod],
    );
    const searchable = [
      event.name,
      event.description,
      event.location,
      eventStatusLabels[event.status],
      ...event.tags,
      ...saleMethods,
    ]
      .join(" ")
      .toLocaleLowerCase("ja-JP");

    return searchable.includes(normalizedQuery);
  });
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
