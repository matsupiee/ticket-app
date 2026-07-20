import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { EventSettingsForm } from "../_components/event-settings-form";
import { SectionHeading } from "../_components/section-heading";
import { client } from "@/lib/orpc";

export function EventNewPage({ eventOrganizerId }: { eventOrganizerId: string }) {
  const navigate = useNavigate();

  return (
    <main className="overflow-y-auto bg-background">
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:px-6">
          <Link to="/" className="text-sm underline">
            ダッシュボードへ戻る
          </Link>
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">ticket-app organizer</p>
            <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">イベント新規作成</h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              整理番号・先着販売のイベントを作成し、すぐ販売ページに公開します。
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-5 px-4 py-8 md:px-6">
        <SectionHeading title="基本設定" />
        <EventSettingsForm
          submitLabel="作成して公開"
          pendingLabel="作成中"
          onSave={async (settings) => {
            try {
              const createdEvent = await client.organizer.event.create({
                eventOrganizerId,
                name: settings.name,
                description: settings.description,
                publicTicketing: {
                  venueName: settings.venueName,
                  performanceName: "本公演",
                  doorsOpenAt: settings.doorsOpenAt,
                  startsAt: settings.startsAt,
                  seatCategoryName: settings.seatCategoryName,
                  rateTypeName: settings.rateTypeName,
                  price: Number(settings.price),
                  capacity: Number(settings.capacity),
                  maxQuantityPerOrder: Number(settings.maxQuantityPerOrder),
                  saleWindowName: "一般販売",
                  saleStartsAt: settings.saleStartsAt,
                  saleEndsAt: settings.saleEndsAt,
                  saleMethod: settings.saleMethod,
                },
              });
              toast.success("イベントを作成して公開しました");
              await navigate({ to: "/events/$eventId", params: { eventId: createdEvent.id } });
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "イベント作成に失敗しました");
            }
          }}
        />
      </section>
    </main>
  );
}
