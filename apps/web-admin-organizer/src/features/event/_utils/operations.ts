export type SaleMethod = "FIRST_COME" | "LOTTERY";

// イベントの状態はDBに持たず、公開期間(publishesAt / closesAt)と現在時刻から導出する（ADR 0012）。
export type EventPublishState = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "CLOSED";

export type EventPublishPeriod = {
  publishesAt: string | null;
  closesAt: string | null;
};

export function getEventPublishState(
  period: EventPublishPeriod,
  now: Date = new Date(),
): EventPublishState {
  if (!period.publishesAt) {
    return "DRAFT";
  }

  if (new Date(period.publishesAt) > now) {
    return "SCHEDULED";
  }

  if (period.closesAt && new Date(period.closesAt) <= now) {
    return "CLOSED";
  }

  return "PUBLISHED";
}

export const eventPublishStateLabels = {
  DRAFT: "下書き",
  SCHEDULED: "公開予定",
  PUBLISHED: "公開中",
  CLOSED: "公開終了",
} as const satisfies Record<EventPublishState, string>;

export const saleMethodLabels = {
  FIRST_COME: "先着",
  LOTTERY: "抽選",
} as const satisfies Record<SaleMethod, string>;

// 入場方式は在庫種別の kind が持つ（ADR 0009）
export const inventoryCategoryKindLabels = {
  ENTRY_NUMBER: "整理番号",
  RESERVED_SEAT: "指定席",
} as const satisfies Record<"ENTRY_NUMBER" | "RESERVED_SEAT", string>;

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
