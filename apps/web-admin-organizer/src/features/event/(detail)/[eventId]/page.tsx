import type { EventGetOutput } from "@ticket-app/api/routers/organizer/event/get/route";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@ticket-app/ui/components/button";
import { CheckIcon, ChevronLeftIcon, ExternalLinkIcon, PencilIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  formatCurrency,
  getEventPublishState,
  inventoryCategoryKindLabels,
  saleMethodLabels,
} from "../../_utils/operations";
import { EventStatusBadge } from "../../_components/status-badge";

type EventDetail = EventGetOutput;
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
    event.inventoryCategories.map(
      (inventoryCategory) => inventoryCategoryKindLabels[inventoryCategory.kind],
    ),
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
                <EventStatusBadge event={event} />
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
        <SetupChecklist event={event} />

        <section className="space-y-3.5">
          <SectionHeading
            title="基本情報"
            editTo="/events/$eventId/edit"
            eventId={event.id}
            editLabel="基本情報・公演を編集"
          />
          <dl className="border-t">
            <DescriptionRow label="説明">
              {event.description || "説明は未設定です。"}
            </DescriptionRow>
            <DescriptionRow label="会場">
              {formatInlineLabels(unique(event.stages.map((stage) => stage.venueName)))}
            </DescriptionRow>
            <DescriptionRow label="公開期間">
              {event.publishesAt
                ? `${formatShortDateTime(event.publishesAt)} - ${
                    event.closesAt ? formatShortDateTime(event.closesAt) : "終了日未設定"
                  }`
                : "未公開（下書き）"}
            </DescriptionRow>
            <DescriptionRow label="販売方式">{formatInlineLabels(saleMethods)}</DescriptionRow>
            <DescriptionRow label="入場方式">{formatInlineLabels(admissionMethods)}</DescriptionRow>
          </dl>
        </section>

        <section className="space-y-3.5">
          <SectionHeading
            title="公演"
            note={`${event.stages.length}公演`}
            editTo="/events/$eventId/edit"
            eventId={event.id}
            editLabel="公演を編集"
          />

          {event.stages.length > 0 ? (
            <div className="divide-y border-y">
              {event.stages.map((stage) => (
                <article
                  key={stage.id}
                  className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-start"
                >
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{stage.name}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {formatDateTime(stage.startsAt)} ・ {stage.venueName}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatShortDateTime(stage.doorsOpenAt)} 開場
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="border-y py-5 text-sm text-muted-foreground">公演は未設定です。</p>
          )}
        </section>

        <section className="space-y-3.5">
          <SectionHeading
            title="席種・在庫"
            note={`${event.inventoryCategories.length}席種`}
            editTo="/events/$eventId/inventory-categories"
            eventId={event.id}
            editLabel="席種・在庫を編集"
          />
          <InventoryCategoryList event={event} />
        </section>

        <section className="space-y-3.5">
          <SectionHeading
            title="料金種別"
            note={`${event.rateTypes.length}種別`}
            editTo="/events/$eventId/rate-types"
            eventId={event.id}
            editLabel="料金種別を編集"
          />
          {event.rateTypes.length > 0 ? (
            <ul className="flex flex-wrap gap-2 border-y py-4">
              {event.rateTypes.map((rateType) => (
                <li
                  key={rateType.id}
                  className="inline-flex h-6 items-center rounded-md border px-2.5 text-xs text-muted-foreground"
                >
                  {rateType.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-y py-5 text-sm text-muted-foreground">料金種別は未設定です。</p>
          )}
        </section>

        <section className="space-y-3.5">
          <SectionHeading
            title="販売受付"
            note={`総売上 ${formatCurrency(event.sales.grossSales)} ・ 販売 ${formatTicketCount(
              event.sales.ticketsSold,
              totalEventCapacity,
            )}`}
            editTo="/events/$eventId/sale-windows"
            eventId={event.id}
            editLabel="販売受付を編集"
          />

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

// 販売開始までに必要な設定の進み具合。
// 作成フォームでは基本情報と公演しか入力しないため、残りをここから埋めてもらう。
// 販売受付が1件も無いイベントは購入者に公開されない（APIの getEventStatus が DRAFT を返す）。
function SetupChecklist({ event }: { event: EventDetail }) {
  const items = [
    { label: "基本情報", done: true, to: "/events/$eventId/edit" as const },
    {
      label: "公演を登録する",
      done: event.stages.length > 0,
      to: "/events/$eventId/edit" as const,
    },
    {
      label: "席種と在庫数を設定する",
      done: event.inventoryPools.some((pool) => pool.capacity > 0),
      to: "/events/$eventId/inventory-categories" as const,
    },
    {
      label: "料金種別を設定する",
      done: event.rateTypes.length > 0,
      to: "/events/$eventId/rate-types" as const,
    },
    {
      label: "販売受付と券を登録する",
      done: event.saleWindows.some(
        (saleWindow) => !saleWindow.canceledAt && saleWindow.offers.length > 0,
      ),
      to: "/events/$eventId/sale-windows" as const,
    },
  ];
  const remainingCount = items.filter((item) => !item.done).length;

  if (remainingCount === 0) {
    return null;
  }

  return (
    <section className="space-y-3.5 rounded-lg border bg-muted/40 p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">販売開始までに必要な設定</h2>
        <span className="text-xs text-muted-foreground">残り{remainingCount}件</span>
      </div>

      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2.5 py-1 text-sm">
            <span
              aria-hidden="true"
              className={
                item.done
                  ? "inline-flex size-4.5 shrink-0 items-center justify-center rounded-full bg-foreground text-background"
                  : "inline-flex size-4.5 shrink-0 rounded-full border border-dashed"
              }
            >
              {item.done ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
            </span>
            {item.done ? (
              <span className="text-muted-foreground">{item.label}（設定済み）</span>
            ) : (
              <Link
                to={item.to}
                params={{ eventId: event.id }}
                className="font-medium underline-offset-4 hover:underline"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionHeading({
  title,
  note,
  editTo,
  editLabel,
  eventId,
}: {
  title: string;
  note?: string;
  editTo:
    | "/events/$eventId/edit"
    | "/events/$eventId/inventory-categories"
    | "/events/$eventId/rate-types"
    | "/events/$eventId/sale-windows";
  editLabel: string;
  eventId: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {note ? <span className="text-xs text-muted-foreground">{note}</span> : null}
      </div>
      <Link
        to={editTo}
        params={{ eventId }}
        aria-label={editLabel}
        className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        編集
      </Link>
    </div>
  );
}

function InventoryCategoryList({ event }: { event: EventDetail }) {
  if (event.inventoryCategories.length === 0) {
    return <p className="border-y py-5 text-sm text-muted-foreground">席種は未設定です。</p>;
  }

  return (
    <div className="divide-y border-y">
      {event.inventoryCategories.map((inventoryCategory) => {
        const capacity = event.inventoryPools
          .filter((pool) => pool.inventoryCategoryId === inventoryCategory.id)
          .reduce((total, pool) => total + pool.capacity, 0);

        return (
          <div
            key={inventoryCategory.id}
            className="flex flex-wrap items-baseline justify-between gap-2 py-3.5"
          >
            <span className="text-sm font-semibold">{inventoryCategory.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              全公演あわせて {capacity.toLocaleString("ja-JP")}枚
            </span>
          </div>
        );
      })}
    </div>
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
            {formatDateRange(saleWindow.applicationStartsAt, saleWindow.applicationEndsAt)}
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
  const entitlementPoolIds = new Set(
    saleWindow.offers.flatMap((offer) =>
      offer.entitlements.map((entitlement) => entitlement.inventoryPoolId),
    ),
  );
  const matchingPools = inventoryPools.filter((pool) => entitlementPoolIds.has(pool.id));

  if (matchingPools.length > 0) {
    return matchingPools.reduce((total, pool) => total + pool.capacity, 0);
  }

  return saleWindow.offers.reduce((total, offer) => total + getOfferCapacity(offer), 0);
}

function getOfferCapacity(offer: SaleOffer) {
  return offer.soldQuantity + offer.availableQuantity;
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
  return getEventPublishState(event) === "PUBLISHED";
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}
