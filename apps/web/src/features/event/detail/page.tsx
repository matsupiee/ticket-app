import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@ticket-app/ui/components/button";
import { CalendarClock, MapPin } from "lucide-react";

import { EventTagList } from "../_components/event-tag-list";
import { SectionHeading } from "../_components/section-heading";
import { saleMethodLabels } from "../_utils/labels";
import { type TicketEvent, formatCurrency, formatDateTime } from "../_utils/ticketing";

export function EventDetailPage({ event }: { event: TicketEvent }) {
  const firstSaleWindow = event.saleWindows[0];

  return (
    <main className="overflow-y-auto bg-background">
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 md:grid-cols-[0.95fr_1.05fr] md:px-6 md:py-10">
          <img
            src={event.imageUrl}
            alt=""
            className="aspect-[16/10] w-full rounded-md object-cover"
          />
          <div className="flex flex-col justify-between gap-8">
            <div className="space-y-4">
              <EventTagList tags={event.tags} />
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {event.eventOrganizerName}
                </p>
                <h1 className="text-3xl font-semibold tracking-normal md:text-5xl">{event.name}</h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                  {event.description}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {firstSaleWindow ? (
                <Link
                  to="/events/$eventId/apply"
                  params={{ eventId: event.id }}
                  className={buttonVariants({ size: "lg", className: "text-sm" })}
                >
                  チケットを申し込む
                </Link>
              ) : null}
              <Link
                to="/"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "text-sm",
                })}
              >
                一覧へ戻る
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[0.85fr_1.15fr] md:px-6">
        <div className="space-y-4">
          <SectionHeading title="公演" />
          <div className="divide-y border-y">
            {event.performances.map((performance) => (
              <div key={performance.id} className="grid gap-2 py-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="size-4" aria-hidden="true" />
                  {formatDateTime(performance.startsAt)}
                </div>
                <div className="font-medium">{performance.name}</div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4" aria-hidden="true" />
                  {performance.venueName}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <SectionHeading title="販売受付" />
          <div className="space-y-6">
            {event.saleWindows.map((saleWindow) => (
              <section key={saleWindow.id} className="border-y py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-medium">{saleWindow.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {saleMethodLabels[saleWindow.saleMethod]} /{" "}
                      {formatDateTime(saleWindow.opensAt)} -{formatDateTime(saleWindow.closesAt)}
                    </p>
                  </div>
                  <span className="rounded-sm border px-2 py-1 text-xs text-muted-foreground">
                    {saleWindow.offers.length}券種
                  </span>
                </div>
                <div className="mt-4 divide-y border-t">
                  {saleWindow.offers.map((offer) => (
                    <div key={offer.id} className="grid gap-3 py-4 text-sm md:grid-cols-[1fr_auto]">
                      <div className="space-y-1">
                        <div className="font-medium">{offer.name}</div>
                        <p className="text-xs leading-6 text-muted-foreground">
                          {offer.description}
                        </p>
                      </div>
                      <div className="text-left md:text-right">
                        <div className="font-medium">
                          {formatCurrency(Math.min(...offer.rates.map((rate) => rate.price)))}から
                        </div>
                        <div className="text-xs text-muted-foreground">
                          残り {offer.availableQuantity.toLocaleString("ja-JP")} 枚
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
