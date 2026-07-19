import { createFileRoute } from "@tanstack/react-router";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ticket-app/ui/components/empty";
import { TicketCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { client } from "@/lib/orpc";
import { formatDateTime } from "@/features/event/_utils/ticketing";

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
});

type FanTicket = Awaited<ReturnType<typeof client.fan.ticket.list>>["items"][number];

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const [tickets, setTickets] = useState<FanTicket[]>([]);
  const [pendingTicketId, setPendingTicketId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await client.fan.ticket.list({});
      setTickets(result.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "チケット一覧の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  async function handleTicketTap(ticket: FanTicket) {
    if (ticket.status !== "ACTIVE") {
      return;
    }

    if (pendingTicketId !== ticket.id) {
      setPendingTicketId(ticket.id);
      return;
    }

    await client.fan.ticket.use({
      ticketId: ticket.id,
    });
    toast.success("入場処理が完了しました");
    setPendingTicketId(null);
    await loadTickets();
  }

  return (
    <main className="overflow-y-auto bg-background">
      <section className="border-b">
        <div className="mx-auto grid max-w-4xl gap-3 px-4 py-8 md:px-6">
          <p className="text-xs font-medium text-muted-foreground">ticket-app</p>
          <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">マイページ</h1>
          <p className="text-sm text-muted-foreground">
            {session.data?.user.name} さんの発券済みチケットを確認できます。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        {isLoading ? (
          <div className="border-y py-8 text-sm text-muted-foreground">読み込み中</div>
        ) : tickets.length > 0 ? (
          <div className="grid gap-4">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                className="grid gap-4 border p-5 text-left transition-colors hover:bg-muted/50"
                onClick={() => {
                  handleTicketTap(ticket).catch((error) => {
                    toast.error(error instanceof Error ? error.message : "入場処理に失敗しました");
                  });
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-lg font-medium">{ticket.eventName}</div>
                    <div className="text-sm text-muted-foreground">
                      {ticket.performanceName} / {formatDateTime(ticket.startsAt)}
                    </div>
                  </div>
                  <span className="border px-2 py-1 text-xs text-muted-foreground">
                    {ticket.status === "USED" ? "入場済み" : "未使用"}
                  </span>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <span>{ticket.venueName}</span>
                  <span>{ticket.seatCategoryName}</span>
                  <span>
                    {ticket.entryNumber ? `整理番号 ${ticket.entryNumber}` : ticket.seatLabel}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <span className="font-mono text-xs text-muted-foreground">
                    {ticket.serialNumber}
                  </span>
                  {ticket.status === "ACTIVE" ? (
                    <span className="inline-flex items-center gap-2 text-sm font-medium">
                      <TicketCheck className="size-4" aria-hidden="true" />
                      {pendingTicketId === ticket.id ? "もう一度タップで入場" : "タップして入場"}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>チケットはまだありません</EmptyTitle>
              <EmptyDescription>
                イベント詳細からチケットを購入すると表示されます。
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </main>
  );
}
