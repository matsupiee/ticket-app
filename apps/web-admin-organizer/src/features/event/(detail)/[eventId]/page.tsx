import type { GetEventOutput } from "@ticket-app/api/routers/organizer/event/get/route";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@ticket-app/ui/components/button";
import { ChevronLeftIcon, ExternalLinkIcon, PencilIcon } from "lucide-react";
import type { ReactNode } from "react";

import { eventStatusLabels, formatCurrency, saleMethodLabels } from "../../_utils/operations";

type EventDetail = GetEventOutput;
type SaleWindow = EventDetail["saleWindows"][number];
type SaleOffer = SaleWindow["offers"][number];

export function EventDetailPage({ event }: { event: EventDetail }) {
  const visibleSaleWindows = event.saleWindows.filter((saleWindow) => !saleWindow.canceledAt);
  const saleWindowsForSummary =
    visibleSaleWindows.length > 0 ? visibleSaleWindows : event.saleWindows;
  const saleMethods = unique(
    saleWindowsForSummary.map((saleWindow) => saleMethodLabels[saleWindow.saleMethod]),
  );
  const admissionMethods = unique(
    event.performances.map((performance) => admissionMethodLabels[performance.admissionMethod]),
  );
  const totalEventCapacity = getEventCapacity(event);
  const publicEventUrl = canOpenPublicEventPage(event) ? getPublicEventUrl(event.id) : undefined;

  return (
    <main className="overflow-y-auto bg-background">
      <section className="border-b">
        <div className="mx-auto max-w-[840px] px-4 py-6 md:px-6">
          <Link
            to="/"
            className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeftIcon className="size-3.5" aria-hidden="true" />
            イベント一覧へ戻る
          </Link>

          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-primary px-2.5 text-xs font-semibold text-primary-foreground">
                  <span className="size-1.5 rounded-full bg-primary-foreground" />
                  {eventStatusLabels[event.status]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatInlineLabels(saleMethods)} ・ 電子チケット
                </span>
              </div>
              <h1 className="text-3xl font-semibold tracking-normal">{event.name}</h1>
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end">
              {publicEventUrl ? (
                <a
                  href={publicEventUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  販売ページを見る
                  <ExternalLinkIcon data-icon="inline-end" />
                </a>
              ) : null}
              <Link
                to="/events/$eventId/edit"
                params={{ eventId: event.id }}
                className={buttonVariants({ size: "lg" })}
              >
                <PencilIcon data-icon="inline-start" />
                編集する
              </Link>
            </div>
          </div>

          <div className="mt-7 flex gap-2 border-b" aria-label="イベント詳細タブ">
            <span className="-mb-px border-b-2 border-foreground px-1 py-3 text-sm font-semibold">
              概要
            </span>
            <span className="px-3 py-3 text-sm font-medium text-muted-foreground">申込状況</span>
            <span className="px-3 py-3 text-sm font-medium text-muted-foreground">来場者</span>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[840px] gap-11 px-4 py-8 md:px-6 md:py-10">
        <section className="space-y-3.5">
          <h2 className="text-sm font-semibold">基本情報</h2>
          <dl className="border-t">
            <DescriptionRow label="説明">
              {event.description || "説明は未設定です。"}
            </DescriptionRow>
            <DescriptionRow label="会場">{event.location}</DescriptionRow>
            <DescriptionRow label="販売方式">{formatInlineLabels(saleMethods)}</DescriptionRow>
            <DescriptionRow label="入場方式">{formatInlineLabels(admissionMethods)}</DescriptionRow>
            <DescriptionRow label="タグ">
              <span className="flex flex-wrap gap-2">
                {event.tags.length > 0
                  ? event.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex h-6 items-center rounded-md border px-2.5 text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))
                  : "タグは未設定です。"}
              </span>
            </DescriptionRow>
          </dl>
        </section>

        <section className="space-y-3.5">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-semibold">公演</h2>
            <span className="text-xs text-muted-foreground">{event.performances.length}公演</span>
          </div>

          {event.performances.length > 0 ? (
            <div className="divide-y border-y">
              {event.performances.map((performance) => (
                <article
                  key={performance.id}
                  className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-start"
                >
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{performance.name}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {formatDateTime(performance.startsAt)} ・ {performance.venueName}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {admissionMethodLabels[performance.admissionMethod]}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="border-y py-5 text-sm text-muted-foreground">公演は未設定です。</p>
          )}
        </section>

        <section className="space-y-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">販売受付</h2>
            <span className="text-xs text-muted-foreground">
              総売上 {formatCurrency(event.sales.grossSales)} ・ 販売{" "}
              {formatTicketCount(event.sales.ticketsSold, totalEventCapacity)}
            </span>
          </div>

          {event.saleWindows.length > 0 ? (
            <div className="space-y-4">
              {event.saleWindows.map((saleWindow) => (
                <SaleWindowPanel
                  key={saleWindow.id}
                  saleWindow={saleWindow}
                  inventoryPools={event.inventoryPools}
                  grossSalesLabel={
                    event.saleWindows.length === 1
                      ? formatCurrency(event.sales.grossSales)
                      : "受付別売上は未集計"
                  }
                />
              ))}
            </div>
          ) : (
            <p className="border-y py-5 text-sm text-muted-foreground">販売受付は未設定です。</p>
          )}
        </section>
      </div>
    </main>
  );
}

function DescriptionRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-b py-3.5 text-sm sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="m-0 min-w-0 leading-7 text-foreground">{children}</dd>
    </div>
  );
}

function SaleWindowPanel({
  saleWindow,
  inventoryPools,
  grossSalesLabel,
}: {
  saleWindow: SaleWindow;
  inventoryPools: EventDetail["inventoryPools"];
  grossSalesLabel: string;
}) {
  const soldQuantity = getSaleWindowSoldQuantity(saleWindow);
  const capacity = getSaleWindowCapacity(saleWindow, inventoryPools);

  return (
    <article className="overflow-hidden rounded-lg border">
      <div className="grid gap-3 border-b px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-start md:px-5">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{saleWindow.name}</h3>
            <span className="inline-flex h-5 items-center rounded-md border px-2 text-[11px] font-semibold text-muted-foreground">
              {saleMethodLabels[saleWindow.saleMethod]}
            </span>
            {saleWindow.canceledAt ? (
              <span className="inline-flex h-5 items-center rounded-md border px-2 text-[11px] font-semibold text-muted-foreground">
                キャンセル済み
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDateRange(saleWindow.opensAt, saleWindow.closesAt)}
          </p>
        </div>
        <div className="text-sm sm:text-right">
          <div className="font-semibold tabular-nums">{grossSalesLabel}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            販売 {formatTicketCount(soldQuantity, capacity)}
          </div>
        </div>
      </div>

      <div className="divide-y px-4 py-2 md:px-5">
        {saleWindow.offers.length > 0 ? (
          saleWindow.offers.map((offer) => <OfferProgress key={offer.id} offer={offer} />)
        ) : (
          <p className="py-4 text-sm text-muted-foreground">券は未設定です。</p>
        )}
      </div>
    </article>
  );
}

function OfferProgress({ offer }: { offer: SaleOffer }) {
  const capacity = getOfferCapacity(offer);
  const sellThroughRate = getSellThroughRate(offer.soldQuantity, capacity);

  return (
    <div className="py-3.5">
      <div className="mb-2.5 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-baseline">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-sm font-semibold">{offer.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatCurrency(offer.minPrice)}から
          </span>
        </div>
        <div className="text-xs tabular-nums sm:text-right">
          <span className="font-semibold">{offer.soldQuantity.toLocaleString("ja-JP")}</span>
          <span className="text-muted-foreground">
            {" "}
            / {capacity.toLocaleString("ja-JP")} 枚 ・ {sellThroughRate}%
          </span>
        </div>
      </div>
      <div
        aria-label={`${offer.name}の販売率`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={sellThroughRate}
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div
          className={`h-full rounded-full ${getProgressBarClassName(sellThroughRate)}`}
          style={{ width: `${sellThroughRate}%` }}
        />
      </div>
    </div>
  );
}

function formatInlineLabels(labels: string[]) {
  return labels.length > 0 ? labels.join(" ・ ") : "未設定";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}

function formatShortDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}

function formatDateRange(startsAt: string, endsAt: string) {
  return `${formatShortDateTime(startsAt)} - ${formatShortDateTime(endsAt)}`;
}

function formatTicketCount(soldQuantity: number, capacity: number) {
  if (capacity <= 0) {
    return `${soldQuantity.toLocaleString("ja-JP")}枚`;
  }

  return `${soldQuantity.toLocaleString("ja-JP")} / ${capacity.toLocaleString("ja-JP")} 枚`;
}

function getEventCapacity(event: EventDetail) {
  const inventoryCapacity = event.inventoryPools.reduce((total, pool) => total + pool.capacity, 0);

  if (inventoryCapacity > 0) {
    return inventoryCapacity;
  }

  return event.saleWindows.reduce(
    (total, saleWindow) => total + getSaleWindowCapacity(saleWindow, event.inventoryPools),
    0,
  );
}

function getSaleWindowSoldQuantity(saleWindow: SaleWindow) {
  return saleWindow.offers.reduce((total, offer) => total + offer.soldQuantity, 0);
}

function getSaleWindowCapacity(
  saleWindow: SaleWindow,
  inventoryPools: EventDetail["inventoryPools"],
) {
  const entitlementKeys = new Set(
    saleWindow.offers.flatMap((offer) =>
      offer.entitlements.map((entitlement) =>
        inventoryPoolKey(entitlement.performanceId, entitlement.seatCategoryId),
      ),
    ),
  );
  const matchingPools = inventoryPools.filter((pool) =>
    entitlementKeys.has(inventoryPoolKey(pool.performanceId, pool.seatCategoryId)),
  );

  if (matchingPools.length > 0) {
    return matchingPools.reduce((total, pool) => total + pool.capacity, 0);
  }

  return saleWindow.offers.reduce((total, offer) => total + getOfferCapacity(offer), 0);
}

function getOfferCapacity(offer: SaleOffer) {
  return offer.soldQuantity + offer.availableQuantity;
}

function inventoryPoolKey(performanceId: string, seatCategoryId: string) {
  return `${performanceId}:${seatCategoryId}`;
}

function getSellThroughRate(soldQuantity: number, capacity: number) {
  if (capacity <= 0) {
    return 0;
  }

  return Math.round((soldQuantity / capacity) * 100);
}

function getProgressBarClassName(sellThroughRate: number) {
  if (sellThroughRate >= 90) {
    return "bg-primary";
  }

  if (sellThroughRate >= 60) {
    return "bg-muted-foreground";
  }

  return "bg-muted-foreground/60";
}

function getPublicEventUrl(eventId: string) {
  const configuredUrl = import.meta.env.VITE_WEB_URL;
  const baseUrl =
    typeof configuredUrl === "string" && configuredUrl.length > 0
      ? configuredUrl
      : import.meta.env.DEV
        ? "http://localhost:3001"
        : undefined;

  if (!baseUrl) {
    return undefined;
  }

  return `${baseUrl.replace(/\/$/, "")}/events/${encodeURIComponent(eventId)}`;
}

function canOpenPublicEventPage(event: EventDetail) {
  const now = new Date();

  return event.saleWindows.some(
    (saleWindow) =>
      !saleWindow.canceledAt &&
      (!saleWindow.publishesAt || new Date(saleWindow.publishesAt) <= now),
  );
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

const admissionMethodLabels = {
  GENERAL_ADMISSION: "自由席",
  NUMBERED_ENTRY: "整理番号",
  RESERVED_SEAT: "指定席",
} as const satisfies Record<EventDetail["performances"][number]["admissionMethod"], string>;
