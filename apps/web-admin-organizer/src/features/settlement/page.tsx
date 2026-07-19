import { SectionHeading } from "@/features/event/_components/section-heading";
import { SettlementStatusBadge } from "@/features/event/_components/status-badge";
import {
  calculateEventSettlement,
  formatCurrency,
  formatDate,
  organizerEvents,
} from "@/features/event/_utils/operations";

export function SettlementListPage() {
  const nextSettlement = organizerEvents.find((event) => event.settlement.status === "SCHEDULED");

  return (
    <main className="overflow-y-auto bg-background">
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:px-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">settlements</p>
            <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">精算一覧</h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              主催者負担手数料を差し引いた入金予定と支払済み履歴を確認します。
            </p>
          </div>

          {nextSettlement ? (
            <section aria-label="次回精算予定" className="border p-4">
              <div className="text-xs text-muted-foreground">次回精算予定</div>
              <div className="mt-2 text-2xl font-semibold tracking-normal">
                {formatCurrency(calculateEventSettlement(nextSettlement).settlementAmount)}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {nextSettlement.name} / {formatDate(nextSettlement.settlement.scheduledAt)}
              </p>
            </section>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-4 px-4 py-8 md:px-6">
        <SectionHeading title="精算履歴" />
        <div className="divide-y border-y">
          {organizerEvents.map((event) => {
            const settlement = calculateEventSettlement(event);

            return (
              <article key={event.id} className="grid gap-4 py-5 md:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <SettlementStatusBadge status={event.settlement.status} />
                    <h2 className="text-base font-medium">{event.name}</h2>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    予定日 {formatDate(event.settlement.scheduledAt)}
                    {event.settlement.paidAt
                      ? ` / 支払日 ${formatDate(event.settlement.paidAt)}`
                      : ""}
                  </p>
                </div>
                <dl className="grid gap-1 text-sm md:min-w-64">
                  <SummaryRow label="総売上" value={formatCurrency(settlement.grossSales)} />
                  <SummaryRow
                    label="主催者手数料"
                    value={formatCurrency(settlement.organizerFeeAmount)}
                  />
                  <SummaryRow label="精算額" value={formatCurrency(settlement.settlementAmount)} />
                </dl>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
