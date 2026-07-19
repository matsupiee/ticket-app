import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@ticket-app/ui/components/button";
import { toast } from "sonner";

import { EventSettingsForm } from "../../_components/event-settings-form";
import { SectionHeading } from "../../_components/section-heading";
import { EventStatusBadge } from "../../_components/status-badge";
import {
  type OrganizerEvent,
  formatCurrency,
  formatDate,
  saleMethodLabels,
} from "../../_utils/operations";
import { client } from "@/lib/orpc";

export function EventDetailPage({
  event,
  eventOrganizerId,
}: {
  event: OrganizerEvent;
  eventOrganizerId: string;
}) {
  return (
    <main className="overflow-y-auto bg-background">
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:px-6">
          <Link to="/" className="text-sm underline">
            ダッシュボードへ戻る
          </Link>
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-3">
              <EventStatusBadge status={event.status} />
              <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">イベント設定</h1>
              <p className="text-sm leading-7 text-muted-foreground">{event.name}</p>
            </div>
            <Link to="/sales" className={buttonVariants({ variant: "outline" })}>
              売上を見る
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[1.05fr_0.95fr] md:px-6">
        <div className="space-y-5">
          <SectionHeading title="基本設定" />
          <EventSettingsForm
            event={event}
            onSave={async (settings) => {
              await client.organizer.event.update({
                eventOrganizerId,
                eventId: event.id,
                name: settings.name,
                description: event.description,
                status: settings.status,
              });
              toast.success(`${settings.name} の設定を保存しました`);
            }}
          />
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <SectionHeading title="販売受付" />
            <div className="divide-y border-y">
              {event.saleWindows.map((saleWindow) => (
                <div key={saleWindow.id} className="grid gap-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-medium">{saleWindow.name}</h2>
                      <p className="text-xs text-muted-foreground">
                        {saleMethodLabels[saleWindow.saleMethod]} / {formatDate(saleWindow.opensAt)}{" "}
                        - {formatDate(saleWindow.closesAt)}
                      </p>
                    </div>
                    <span className="border px-2 py-1 text-xs text-muted-foreground">
                      {saleWindow.offers.length}券種
                    </span>
                  </div>
                  <div className="divide-y border-t">
                    {saleWindow.offers.map((offer) => (
                      <div key={offer.id} className="grid gap-2 py-3 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-medium">{offer.name}</span>
                          <span>{formatCurrency(offer.minPrice)}から</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {offer.seatCategoryName} / 販売済み{" "}
                          {offer.soldQuantity.toLocaleString("ja-JP")}枚 / 残り{" "}
                          {offer.availableQuantity.toLocaleString("ja-JP")}枚
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading title="公演" />
            <div className="divide-y border-y">
              {event.performances.map((performance) => (
                <div key={performance.id} className="grid gap-1 py-4 text-sm">
                  <div className="font-medium">{performance.name}</div>
                  <div className="text-muted-foreground">
                    {formatDate(performance.startsAt)} / {performance.venueName}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
