import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ticket-app/ui/components/empty";
import { Input } from "@ticket-app/ui/components/input";
import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { client } from "@/lib/orpc";

import { type TicketEventListItem } from "../_utils/ticketing";
import { EventListItem } from "./_components/event-list-item";

export function EventListPage() {
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<TicketEventListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await client.fan.event.list({
        query: query.trim() || undefined,
      });
      setEvents(result.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "イベント一覧の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const featuredEvent = events[0];

  return (
    <main className="overflow-y-auto bg-background">
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[1.1fr_0.9fr] md:px-6 lg:py-12">
          <div className="flex flex-col justify-center gap-6">
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">ticket-app</p>
              <h1 className="text-3xl font-semibold tracking-normal md:text-5xl">イベントを探す</h1>
              <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                販売方式、席種、料金種別を見ながら申し込みまで進めるユーザー向け導線です。
              </p>
            </div>
            <label className="flex max-w-xl items-center gap-2 rounded-md border bg-background px-3 py-2">
              <Search className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">イベント検索</span>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="イベント名・地域・販売方式で検索"
                className="h-9 border-0 px-0 text-sm focus-visible:ring-0"
              />
            </label>
          </div>
          {featuredEvent ? (
            <img
              src={featuredEvent.imageUrl}
              alt=""
              className="aspect-[4/3] w-full rounded-md object-cover md:aspect-[5/4]"
            />
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        {isLoading ? (
          <div className="border-y py-8 text-sm text-muted-foreground">読み込み中</div>
        ) : events.length > 0 ? (
          <div className="divide-y border-y">
            {events.map((event) => (
              <EventListItem key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>該当するイベントがありません</EmptyTitle>
              <EmptyDescription>
                検索語を短くするか、別の地域・販売方式で探してください。
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </main>
  );
}
