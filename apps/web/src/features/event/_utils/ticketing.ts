export type SaleMethod = "FIRST_COME" | "LOTTERY";

export type AdmissionMethod = "NUMBERED_ENTRY" | "RESERVED_SEAT";

export type FeePayer = "BUYER" | "EVENT_ORGANIZER";

export type RateType = {
  id: string;
  name: string;
};

export type FeeRule = {
  id: string;
  name: string;
  payer: FeePayer;
  rateBasisPoints: number;
  flatAmount: number;
};

export type Performance = {
  id: string;
  name: string;
  venueName: string;
  doorsOpenAt: string;
  startsAt: string;
  admissionMethod: AdmissionMethod;
};

export type SaleOfferRate = {
  rateTypeId: string;
  price: number;
};

export type SaleOffer = {
  id: string;
  name: string;
  seatCategoryName: string;
  description: string;
  maxQuantityPerOrder: number;
  availableQuantity: number;
  performanceIds: string[];
  rates: SaleOfferRate[];
};

export type SaleWindow = {
  id: string;
  name: string;
  saleMethod: SaleMethod;
  opensAt: string;
  closesAt: string;
  offers: SaleOffer[];
  feeRules: FeeRule[];
};

export type TicketEvent = {
  id: string;
  name: string;
  description: string;
  eventOrganizerName: string;
  location: string;
  imageUrl: string;
  tags: string[];
  rateTypes: RateType[];
  performances: Performance[];
  saleWindows: SaleWindow[];
};

export type ApplicationSelection = {
  eventId: string;
  saleWindowId: string;
  performanceId: string;
  offerId: string;
  rateTypeId: string;
  quantity: number;
};

export type FeeLine = {
  id: string;
  name: string;
  payer: FeePayer;
  amount: number;
};

export type TicketQuote = {
  event: TicketEvent;
  saleWindow: SaleWindow;
  performance: Performance;
  offer: SaleOffer;
  rateType: RateType;
  unitPrice: number;
  quantity: number;
  subtotalAmount: number;
  buyerFeeLines: FeeLine[];
  organizerFeeLines: FeeLine[];
  buyerFeeAmount: number;
  organizerFeeAmount: number;
  totalAmount: number;
};

export const ticketEvents: TicketEvent[] = [
  {
    id: "tokyo-orbit-2026",
    name: "TOKYO ORBIT 2026",
    description:
      "東京湾岸の大型ホールで開催する、指定席中心のライブイベント。一般販売は先着順で、座席は購入後すぐに確定します。",
    eventOrganizerName: "Orbit Works",
    location: "東京",
    imageUrl: "/events/tokyo-orbit.svg",
    tags: ["指定席", "先着", "電子チケット"],
    rateTypes: [
      { id: "adult", name: "一般" },
      { id: "under-22", name: "U-22" },
    ],
    performances: [
      {
        id: "tokyo-orbit-day-1",
        name: "DAY 1",
        venueName: "有明アリーナ",
        doorsOpenAt: "2026-09-12T16:30:00+09:00",
        startsAt: "2026-09-12T18:00:00+09:00",
        admissionMethod: "RESERVED_SEAT",
      },
      {
        id: "tokyo-orbit-day-2",
        name: "DAY 2",
        venueName: "有明アリーナ",
        doorsOpenAt: "2026-09-13T15:30:00+09:00",
        startsAt: "2026-09-13T17:00:00+09:00",
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
        feeRules: [
          {
            id: "tokyo-orbit-system-fee",
            name: "システム利用料",
            payer: "BUYER",
            rateBasisPoints: 0,
            flatAmount: 330,
          },
          {
            id: "tokyo-orbit-organizer-fee",
            name: "販売手数料",
            payer: "EVENT_ORGANIZER",
            rateBasisPoints: 500,
            flatAmount: 0,
          },
        ],
        offers: [
          {
            id: "tokyo-orbit-s-seat",
            name: "S席",
            seatCategoryName: "S席",
            description: "アリーナまたは1階スタンド前方。購入完了後に座席番号を表示します。",
            maxQuantityPerOrder: 4,
            availableQuantity: 128,
            performanceIds: ["tokyo-orbit-day-1", "tokyo-orbit-day-2"],
            rates: [
              { rateTypeId: "adult", price: 12_000 },
              { rateTypeId: "under-22", price: 9_000 },
            ],
          },
          {
            id: "tokyo-orbit-a-seat",
            name: "A席",
            seatCategoryName: "A席",
            description: "2階スタンド中心。ステージ全体を見渡しやすい席です。",
            maxQuantityPerOrder: 4,
            availableQuantity: 246,
            performanceIds: ["tokyo-orbit-day-1", "tokyo-orbit-day-2"],
            rates: [
              { rateTypeId: "adult", price: 8_800 },
              { rateTypeId: "under-22", price: 6_500 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "bay-side-fes-2026",
    name: "BAY SIDE FES 2026",
    description:
      "複数ステージを回遊するフェス形式のイベント。抽選受付では第1希望のチケットを申し込み、当落後に整理番号が発行されます。",
    eventOrganizerName: "Bay Side Committee",
    location: "神奈川",
    imageUrl: "/events/bay-side-fes.svg",
    tags: ["整理番号", "抽選", "通し券"],
    rateTypes: [
      { id: "adult", name: "一般" },
      { id: "student", name: "学生" },
    ],
    performances: [
      {
        id: "bay-side-saturday",
        name: "SATURDAY",
        venueName: "横浜ベイホール",
        doorsOpenAt: "2026-10-03T10:00:00+09:00",
        startsAt: "2026-10-03T11:00:00+09:00",
        admissionMethod: "NUMBERED_ENTRY",
      },
      {
        id: "bay-side-sunday",
        name: "SUNDAY",
        venueName: "横浜ベイホール",
        doorsOpenAt: "2026-10-04T10:00:00+09:00",
        startsAt: "2026-10-04T11:00:00+09:00",
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
        feeRules: [
          {
            id: "bay-side-advance-fee",
            name: "先行サービス料",
            payer: "BUYER",
            rateBasisPoints: 0,
            flatAmount: 550,
          },
          {
            id: "bay-side-platform-fee",
            name: "プラットフォーム手数料",
            payer: "EVENT_ORGANIZER",
            rateBasisPoints: 400,
            flatAmount: 0,
          },
        ],
        offers: [
          {
            id: "bay-side-one-day",
            name: "1日券",
            seatCategoryName: "スタンディング",
            description: "選択した1公演に入場できます。整理番号は当選後に発行されます。",
            maxQuantityPerOrder: 2,
            availableQuantity: 400,
            performanceIds: ["bay-side-saturday", "bay-side-sunday"],
            rates: [
              { rateTypeId: "adult", price: 9_900 },
              { rateTypeId: "student", price: 7_700 },
            ],
          },
          {
            id: "bay-side-two-day-pass",
            name: "2日通し券",
            seatCategoryName: "スタンディング",
            description: "両日入場できる通し券です。申し込み時は初日の公演を選択します。",
            maxQuantityPerOrder: 2,
            availableQuantity: 120,
            performanceIds: ["bay-side-saturday", "bay-side-sunday"],
            rates: [
              { rateTypeId: "adult", price: 17_800 },
              { rateTypeId: "student", price: 14_000 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "kyoto-classic-night",
    name: "京都クラシックナイト",
    description:
      "歴史あるホールで開催する小編成コンサート。席種ごとに販売数を絞り、落ち着いて選べる販売導線を想定しています。",
    eventOrganizerName: "Kamo Arts",
    location: "京都",
    imageUrl: "/events/kyoto-classic-night.svg",
    tags: ["指定席", "先着", "少数販売"],
    rateTypes: [
      { id: "adult", name: "一般" },
      { id: "child", name: "小中学生" },
    ],
    performances: [
      {
        id: "kyoto-classic-evening",
        name: "EVENING",
        venueName: "京都コンサートホール",
        doorsOpenAt: "2026-11-20T18:00:00+09:00",
        startsAt: "2026-11-20T19:00:00+09:00",
        admissionMethod: "RESERVED_SEAT",
      },
    ],
    saleWindows: [
      {
        id: "kyoto-classic-general",
        name: "一般販売",
        saleMethod: "FIRST_COME",
        opensAt: "2026-08-30T10:00:00+09:00",
        closesAt: "2026-11-19T18:00:00+09:00",
        feeRules: [
          {
            id: "kyoto-classic-system-fee",
            name: "システム利用料",
            payer: "BUYER",
            rateBasisPoints: 0,
            flatAmount: 220,
          },
        ],
        offers: [
          {
            id: "kyoto-classic-front",
            name: "前方指定席",
            seatCategoryName: "前方指定席",
            description: "1階前方ブロック。購入完了後に座席番号を表示します。",
            maxQuantityPerOrder: 4,
            availableQuantity: 42,
            performanceIds: ["kyoto-classic-evening"],
            rates: [
              { rateTypeId: "adult", price: 7_500 },
              { rateTypeId: "child", price: 3_500 },
            ],
          },
        ],
      },
    ],
  },
];

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}

export function getEventById(eventId: string) {
  return ticketEvents.find((event) => event.id === eventId);
}

export function getUpcomingEvents() {
  return [...ticketEvents].sort(
    (first, second) =>
      new Date(first.performances[0]?.startsAt ?? "").getTime() -
      new Date(second.performances[0]?.startsAt ?? "").getTime(),
  );
}

export function filterEvents(query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return getUpcomingEvents();
  }

  return getUpcomingEvents().filter((event) => {
    const haystack = [
      event.name,
      event.description,
      event.eventOrganizerName,
      event.location,
      ...event.tags,
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function getDefaultApplicationSelection(event: TicketEvent): ApplicationSelection {
  const saleWindow = event.saleWindows[0];
  const offer = saleWindow?.offers[0];
  const performanceId = offer?.performanceIds[0] ?? event.performances[0]?.id;
  const rateTypeId = offer?.rates[0]?.rateTypeId ?? event.rateTypes[0]?.id;

  if (!saleWindow || !offer || !performanceId || !rateTypeId) {
    throw new Error("申し込み可能なチケットがありません");
  }

  return {
    eventId: event.id,
    saleWindowId: saleWindow.id,
    performanceId,
    offerId: offer.id,
    rateTypeId,
    quantity: 1,
  };
}

export function calculateTicketQuote(selection: ApplicationSelection): TicketQuote {
  const event = getEventById(selection.eventId);
  if (!event) {
    throw new Error("イベントが見つかりません");
  }

  const saleWindow = event.saleWindows.find((window) => window.id === selection.saleWindowId);
  if (!saleWindow) {
    throw new Error("販売受付が見つかりません");
  }

  const offer = saleWindow.offers.find((saleOffer) => saleOffer.id === selection.offerId);
  if (!offer) {
    throw new Error("券種が見つかりません");
  }

  if (!offer.performanceIds.includes(selection.performanceId)) {
    throw new Error("選択した公演ではこの券種を申し込めません");
  }

  if (selection.quantity < 1 || selection.quantity > offer.maxQuantityPerOrder) {
    throw new Error(`枚数は1枚から${offer.maxQuantityPerOrder}枚まで選択できます`);
  }

  const performance = event.performances.find(
    (eventPerformance) => eventPerformance.id === selection.performanceId,
  );
  if (!performance) {
    throw new Error("公演が見つかりません");
  }

  const rateType = event.rateTypes.find((rate) => rate.id === selection.rateTypeId);
  const offerRate = offer.rates.find((rate) => rate.rateTypeId === selection.rateTypeId);
  if (!rateType || !offerRate) {
    throw new Error("料金種別が見つかりません");
  }

  const subtotalAmount = offerRate.price * selection.quantity;
  const feeLines = saleWindow.feeRules.map((feeRule) => ({
    id: feeRule.id,
    name: feeRule.name,
    payer: feeRule.payer,
    amount:
      (Math.floor((offerRate.price * feeRule.rateBasisPoints) / 10_000) + feeRule.flatAmount) *
      selection.quantity,
  }));
  const buyerFeeLines = feeLines.filter((feeLine) => feeLine.payer === "BUYER");
  const organizerFeeLines = feeLines.filter((feeLine) => feeLine.payer === "EVENT_ORGANIZER");
  const buyerFeeAmount = sumAmounts(buyerFeeLines);
  const organizerFeeAmount = sumAmounts(organizerFeeLines);

  return {
    event,
    saleWindow,
    performance,
    offer,
    rateType,
    unitPrice: offerRate.price,
    quantity: selection.quantity,
    subtotalAmount,
    buyerFeeLines,
    organizerFeeLines,
    buyerFeeAmount,
    organizerFeeAmount,
    totalAmount: subtotalAmount + buyerFeeAmount,
  };
}

function sumAmounts(lines: FeeLine[]) {
  return lines.reduce((total, line) => total + line.amount, 0);
}
