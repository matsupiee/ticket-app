import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@ticket-app/ui/components/button";
import { CalendarClock, MapPin, Ticket } from "lucide-react";

import { EventTagList } from "../../_components/event-tag-list";
import { saleMethodLabels } from "../../_utils/labels";
import { type TicketEvent, formatCurrency, formatDateTime } from "../../_utils/ticketing";

export function EventListItem({ event }: { event: TicketEvent }) {
  const firstPerformance = event.performances[0];
  const firstSaleWindow = event.saleWindows[0];
  const minimumPrice = Math.min(
    ...event.saleWindows.flatMap((saleWindow) =>
      saleWindow.offers.flatMap((offer) => offer.rates.map((rate) => rate.price)),
    ),
  );

  return (
    <article className="grid gap-4 py-5 md:grid-cols-[160px_1fr_auto] md:items-center">
      <img
        src={event.imageUrl}
        alt=""
        className="aspect-[16/10] w-full rounded-md object-cover md:w-40"
      />
      <div className="min-w-0 space-y-3">
        <EventTagList tags={event.tags} />
        <div className="space-y-1">
          <h2 className="text-xl font-medium">{event.name}</h2>
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {event.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            {firstPerformance ? formatDateTime(firstPerformance.startsAt) : "日程未定"}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5" aria-hidden="true" />
            {firstPerformance?.venueName ?? event.location}
          </span>
          <span className="flex items-center gap-1.5">
            <Ticket className="size-3.5" aria-hidden="true" />
            {firstSaleWindow ? saleMethodLabels[firstSaleWindow.saleMethod] : "販売未定"}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-3 md:items-end">
        <div className="text-sm font-medium">{formatCurrency(minimumPrice)}から</div>
        <Link
          to="/events/$eventId"
          params={{ eventId: event.id }}
          className={buttonVariants({ variant: "outline", className: "text-sm" })}
        >
          詳細を見る
        </Link>
      </div>
    </article>
  );
}
