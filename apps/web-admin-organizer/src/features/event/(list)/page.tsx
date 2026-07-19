import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@ticket-app/ui/components/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ticket-app/ui/components/empty";
import { Input } from "@ticket-app/ui/components/input";
import { CalendarClock, Search, Ticket } from "lucide-react";
import { useMemo, useState } from "react";

import { EventStatusBadge } from "../_components/status-badge";
import {
  filterOrganizerEvents,
  formatCurrency,
  formatDate,
  organizerEvents,
  saleMethodLabels,
  summarizeOrganizerPortfolio,
} from "../_utils/operations";

export function OrganizerDashboardPage() {
  const [query, setQuery] = useState("");
  const events = useMemo(() => filterOrganizerEvents(query), [query]);
  const summary = summarizeOrganizerPortfolio(organizerEvents);

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

        {events.length > 0 ? (
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
