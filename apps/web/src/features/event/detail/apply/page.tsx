import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

import {
  type ApplicationSelection,
  type TicketEvent,
  getDefaultApplicationSelection,
} from "../../_utils/ticketing";
import { TicketApplicationPanel } from "./_components/ticket-application-panel";

type CompletionHandler = (selection: ApplicationSelection) => void | Promise<void>;

export function TicketApplicationPage({
  event,
  onComplete,
}: {
  event: TicketEvent;
  onComplete: CompletionHandler;
}) {
  const initialSelection = useMemo(() => getDefaultApplicationSelection(event), [event]);

  return (
    <main className="overflow-y-auto bg-background">
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[0.9fr_1.1fr] md:px-6">
        <div className="space-y-6">
          <Link to="/events/$eventId" params={{ eventId: event.id }} className="text-sm underline">
            イベント詳細へ戻る
          </Link>
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">{event.eventOrganizerName}</p>
            <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">チケット申し込み</h1>
            <p className="text-sm leading-7 text-muted-foreground">{event.name}</p>
          </div>
          <img
            src={event.imageUrl}
            alt=""
            className="aspect-[4/3] w-full rounded-md object-cover"
          />
        </div>
        <TicketApplicationPanel
          event={event}
          initialSelection={initialSelection}
          onComplete={onComplete}
        />
      </section>
    </main>
  );
}
