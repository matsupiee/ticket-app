import { Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "@ticket-app/ui/components/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ticket-app/ui/components/empty";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { CalendarClock, Search, Ticket } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EventStatusBadge } from "../_components/status-badge";
import {
  type OrganizerEvent,
  type OrganizerPortfolioSummary,
  formatCurrency,
  formatDate,
  saleMethodLabels,
} from "../_utils/operations";
import { client } from "@/lib/orpc";

export function OrganizerDashboardPage({ eventOrganizerId }: { eventOrganizerId: string }) {
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [summary, setSummary] = useState<OrganizerPortfolioSummary>(emptySummary);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState(() => buildDefaultEventDraft());
  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await client.organizer.event.list({
        eventOrganizerId,
        query: query.trim() || undefined,
      });
      setEvents(result.items);
      setSummary(result.summary);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "イベント一覧の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [eventOrganizerId, query]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  async function createPublicNumberedEntryEvent() {
    setIsCreating(true);
    try {
      await client.organizer.event.create({
        eventOrganizerId,
        name: draft.name,
        description: draft.description,
        publicTicketing: {
          venueName: draft.venueName,
          performanceName: "本公演",
          doorsOpenAt: draft.doorsOpenAt,
          startsAt: draft.startsAt,
          seatCategoryName: draft.seatCategoryName,
          rateTypeName: draft.rateTypeName,
          price: Number(draft.price),
          capacity: Number(draft.capacity),
          maxQuantityPerOrder: Number(draft.maxQuantityPerOrder),
          saleWindowName: "一般販売",
          saleStartsAt: draft.saleStartsAt,
          saleEndsAt: draft.saleEndsAt,
        },
      });
      toast.success("イベントを作成して公開しました");
      setDraft(buildDefaultEventDraft());
      await loadEvents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "イベント作成に失敗しました");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="overflow-y-auto bg-background">
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:px-6">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">ticket-app organizer</p>
              <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
                主催者ダッシュボード
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                イベントの販売状態、売上、精算予定を確認しながら、設定変更に進めます。
              </p>
            </div>
            <Link to="/settings" className={buttonVariants({ variant: "outline" })}>
              アカウント設定
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Kpi label="総売上" value={formatCurrency(summary.grossSales)} />
            <Kpi label="販売枚数" value={`${summary.ticketsSold.toLocaleString("ja-JP")}枚`} />
            <Kpi label="販売中イベント" value={`${summary.onSaleEventCount}件`} />
            <Kpi label="精算予定額" value={formatCurrency(summary.settlementAmount)} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-5 px-4 py-8 md:px-6">
        <form
          aria-label="公開イベント作成"
          className="grid gap-4 border-y py-5"
          onSubmit={(event) => {
            event.preventDefault();
            createPublicNumberedEntryEvent();
          }}
        >
          <div className="grid gap-2">
            <h2 className="text-lg font-medium">整理番号・先着イベントを作成</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              1公演・1席種・1料金種別の整理番号方式イベントを作成し、すぐ販売ページに公開します。
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <TextField
              id="newEventName"
              label="イベント名"
              value={draft.name}
              onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
            />
            <TextField
              id="newVenueName"
              label="会場"
              value={draft.venueName}
              onChange={(value) => setDraft((current) => ({ ...current, venueName: value }))}
            />
            <TextField
              id="newSeatCategoryName"
              label="席種"
              value={draft.seatCategoryName}
              onChange={(value) => setDraft((current) => ({ ...current, seatCategoryName: value }))}
            />
            <TextField
              id="newRateTypeName"
              label="料金種別"
              value={draft.rateTypeName}
              onChange={(value) => setDraft((current) => ({ ...current, rateTypeName: value }))}
            />
            <TextField
              id="newPrice"
              label="価格"
              type="number"
              value={draft.price}
              onChange={(value) => setDraft((current) => ({ ...current, price: value }))}
            />
            <TextField
              id="newCapacity"
              label="販売枚数"
              type="number"
              value={draft.capacity}
              onChange={(value) => setDraft((current) => ({ ...current, capacity: value }))}
            />
            <TextField
              id="newStartsAt"
              label="開演日時"
              type="datetime-local"
              value={draft.startsAt}
              onChange={(value) => setDraft((current) => ({ ...current, startsAt: value }))}
            />
            <TextField
              id="newDoorsOpenAt"
              label="開場日時"
              type="datetime-local"
              value={draft.doorsOpenAt}
              onChange={(value) => setDraft((current) => ({ ...current, doorsOpenAt: value }))}
            />
            <TextField
              id="newSaleEndsAt"
              label="販売終了日時"
              type="datetime-local"
              value={draft.saleEndsAt}
              onChange={(value) => setDraft((current) => ({ ...current, saleEndsAt: value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="newDescription">説明</Label>
            <Input
              id="newDescription"
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
            />
          </div>
          <Button type="submit" className="w-fit text-sm" disabled={isCreating}>
            {isCreating ? "作成中" : "作成して公開"}
          </Button>
        </form>

        <label className="flex max-w-xl items-center gap-2 border bg-background px-3 py-2">
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">イベント検索</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="イベント名・地域・販売方式で検索"
            className="h-9 border-0 px-0 text-sm focus-visible:ring-0"
          />
        </label>

        {isLoading ? (
          <div className="border-y py-8 text-sm text-muted-foreground">読み込み中</div>
        ) : events.length > 0 ? (
          <div className="divide-y border-y">
            {events.map((event) => {
              const firstPerformance = event.performances[0];
              const firstSaleWindow = event.saleWindows[0];

              return (
                <article key={event.id} className="grid gap-4 py-5 md:grid-cols-[1fr_auto]">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <EventStatusBadge status={event.status} />
                      {event.tags.map((tag) => (
                        <span key={tag} className="border px-2 py-1 text-xs text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <Link
                        to="/events/$eventId"
                        params={{ eventId: event.id }}
                        className="text-xl font-medium transition-colors hover:text-primary"
                      >
                        {event.name}
                      </Link>
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {event.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="size-3.5" aria-hidden="true" />
                        {firstPerformance ? formatDate(firstPerformance.startsAt) : "日程未定"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Ticket className="size-3.5" aria-hidden="true" />
                        {firstSaleWindow
                          ? saleMethodLabels[firstSaleWindow.saleMethod]
                          : "販売未定"}
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm md:justify-items-end">
                    <span className="font-medium">{formatCurrency(event.sales.grossSales)}</span>
                    <span className="text-xs text-muted-foreground">
                      {event.sales.ticketsSold.toLocaleString("ja-JP")}枚販売
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>該当するイベントがありません</EmptyTitle>
              <EmptyDescription>
                検索語を短くするか、別の販売方式で探してください。
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <section aria-label={label} className="border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-normal">{value}</div>
    </section>
  );
}

function TextField({
  id,
  label,
  value,
  type = "text",
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function buildDefaultEventDraft() {
  const now = new Date();
  const startsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  startsAt.setHours(18, 0, 0, 0);
  const doorsOpenAt = new Date(startsAt.getTime() - 60 * 60 * 1000);
  const saleEndsAt = new Date(startsAt.getTime() - 60 * 60 * 1000);
  const saleStartsAt = new Date(now.getTime() - 60 * 1000);

  return {
    name: "整理番号ライブ",
    description: "整理番号順に入場する先着販売イベントです。",
    venueName: "新宿ライブホール",
    seatCategoryName: "スタンディング",
    rateTypeName: "一般",
    price: "5000",
    capacity: "30",
    maxQuantityPerOrder: "4",
    startsAt: toDateTimeLocalValue(startsAt),
    doorsOpenAt: toDateTimeLocalValue(doorsOpenAt),
    saleStartsAt: toDateTimeLocalValue(saleStartsAt),
    saleEndsAt: toDateTimeLocalValue(saleEndsAt),
  };
}

function toDateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const emptySummary: OrganizerPortfolioSummary = {
  eventCount: 0,
  onSaleEventCount: 0,
  ticketsSold: 0,
  grossSales: 0,
  organizerFeeAmount: 0,
  settlementAmount: 0,
};
