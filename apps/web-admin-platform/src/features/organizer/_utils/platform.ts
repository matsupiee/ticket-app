export type OrganizerStatus = "ACTIVE" | "UNDER_REVIEW" | "SUSPENDED";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

type PlatformOrganizerEvent = {
  id: string;
  name: string;
  status: "DRAFT" | "ON_SALE" | "ENDED";
  grossSales: number;
  ticketsSold: number;
};

export type PlatformOrganizer = {
  id: string;
  name: string;
  representativeName: string;
  email: string;
  location: string;
  status: OrganizerStatus;
  riskLevel: RiskLevel;
  joinedAt: string;
  events: PlatformOrganizerEvent[];
  grossSales: number;
  platformFeeAmount: number;
  payoutAmount: number;
};

export type PlatformMonthlySale = {
  id: string;
  month: string;
  grossSales: number;
  platformFeeAmount: number;
  payoutAmount: number;
  applications: number;
};

export type PlatformSalesSummary = {
  grossSales: number;
  platformFeeAmount: number;
  payoutAmount: number;
  applications: number;
};

export const organizerStatusLabels = {
  ACTIVE: "有効",
  UNDER_REVIEW: "審査中",
  SUSPENDED: "停止中",
} as const satisfies Record<OrganizerStatus, string>;

export const platformOrganizers: PlatformOrganizer[] = [
  {
    id: "orbit-works",
    name: "Orbit Works",
    representativeName: "山田 花子",
    email: "admin@orbit.example.com",
    location: "東京",
    status: "ACTIVE",
    riskLevel: "LOW",
    joinedAt: "2026-02-15T10:00:00+09:00",
    grossSales: 8_942_400,
    platformFeeAmount: 447_120,
    payoutAmount: 8_495_280,
    events: [
      {
        id: "tokyo-orbit-2026",
        name: "TOKYO ORBIT 2026",
        status: "ON_SALE",
        grossSales: 8_942_400,
        ticketsSold: 736,
      },
      {
        id: "orbit-club-preview",
        name: "Orbit Club Preview",
        status: "DRAFT",
        grossSales: 0,
        ticketsSold: 0,
      },
    ],
  },
  {
    id: "bay-side-committee",
    name: "Bay Side Committee",
    representativeName: "佐藤 健",
    email: "ops@bayside.example.com",
    location: "神奈川",
    status: "UNDER_REVIEW",
    riskLevel: "MEDIUM",
    joinedAt: "2026-06-01T11:00:00+09:00",
    grossSales: 1_927_200,
    platformFeeAmount: 77_088,
    payoutAmount: 1_850_112,
    events: [
      {
        id: "bay-side-fes-2026",
        name: "BAY SIDE FES 2026",
        status: "DRAFT",
        grossSales: 1_927_200,
        ticketsSold: 184,
      },
    ],
  },
  {
    id: "kyoto-arts",
    name: "Kyoto Arts",
    representativeName: "田中 葵",
    email: "finance@kyotoarts.example.com",
    location: "京都",
    status: "ACTIVE",
    riskLevel: "LOW",
    joinedAt: "2025-11-20T09:30:00+09:00",
    grossSales: 3_102_000,
    platformFeeAmount: 155_100,
    payoutAmount: 2_946_900,
    events: [
      {
        id: "kyoto-classic-night",
        name: "KYOTO CLASSIC NIGHT",
        status: "ENDED",
        grossSales: 3_102_000,
        ticketsSold: 310,
      },
    ],
  },
];

export const platformMonthlySales: PlatformMonthlySale[] = [
  {
    id: "2026-09",
    month: "2026-09",
    grossSales: 8_942_400,
    platformFeeAmount: 447_120,
    payoutAmount: 8_495_280,
    applications: 736,
  },
  {
    id: "2026-10",
    month: "2026-10",
    grossSales: 5_029_200,
    platformFeeAmount: 232_188,
    payoutAmount: 4_797_012,
    applications: 494,
  },
];

export function summarizePlatformSales(monthlySales: PlatformMonthlySale[]): PlatformSalesSummary {
  return monthlySales.reduce<PlatformSalesSummary>(
    (summary, sale) => ({
      grossSales: summary.grossSales + sale.grossSales,
      platformFeeAmount: summary.platformFeeAmount + sale.platformFeeAmount,
      payoutAmount: summary.payoutAmount + sale.payoutAmount,
      applications: summary.applications + sale.applications,
    }),
    {
      grossSales: 0,
      platformFeeAmount: 0,
      payoutAmount: 0,
      applications: 0,
    },
  );
}

export function filterPlatformOrganizers(
  query: string,
  organizers: PlatformOrganizer[] = platformOrganizers,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ja-JP");

  if (!normalizedQuery) {
    return organizers;
  }

  return organizers.filter((organizer) => {
    const searchable = [
      organizer.name,
      organizer.representativeName,
      organizer.email,
      organizer.location,
      organizerStatusLabels[organizer.status],
      organizer.riskLevel,
    ]
      .join(" ")
      .toLocaleLowerCase("ja-JP");

    return searchable.includes(normalizedQuery);
  });
}

export function getPlatformOrganizerById(organizerId: string) {
  return platformOrganizers.find((organizer) => organizer.id === organizerId);
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatMonth(month: string) {
  const [year, monthIndex] = month.split("-");

  return `${year}年${Number(monthIndex)}月`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
