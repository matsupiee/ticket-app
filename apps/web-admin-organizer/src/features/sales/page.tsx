import { SectionHeading } from "@/features/event/_components/section-heading";
import { EventStatusBadge } from "@/features/event/_components/status-badge";
import {
  formatCurrency,
  organizerEvents,
  summarizeOrganizerPortfolio,
} from "@/features/event/_utils/operations";

export function SalesDashboardPage() {
  const summary = summarizeOrganizerPortfolio(organizerEvents);
  const onSaleEvents = organizerEvents.filter((event) => event.status === "ON_SALE");
  const onSaleSales = onSaleEvents.reduce((total, event) => total + event.sales.grossSales, 0);

  return (
    <main className="overflow-y-auto bg-background">
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:px-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">sales</p>
            <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
              売上ダッシュボード
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              イベントごとの流通額、購入者手数料、主催者負担手数料をまとめて確認します。
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Kpi label="販売中イベント売上" value={formatCurrency(onSaleSales)} />
            <Kpi label="総売上" value={formatCurrency(summary.grossSales)} />
            <Kpi label="購入者負担手数料" value={formatCurrency(totalBuyerFeeAmount())} />
            <Kpi label="主催者負担手数料" value={formatCurrency(summary.organizerFeeAmount)} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-4 px-4 py-8 md:px-6">
        <SectionHeading title="イベント別売上" />
        <div className="overflow-x-auto border-y">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b text-xs text-muted-foreground">
              <tr>
                <th className="py-3 pr-4 font-medium">イベント</th>
                <th className="px-4 py-3 font-medium">状態</th>
                <th className="px-4 py-3 text-right font-medium">販売枚数</th>
                <th className="px-4 py-3 text-right font-medium">総売上</th>
                <th className="px-4 py-3 text-right font-medium">主催者手数料</th>
                <th className="py-3 pl-4 text-right font-medium">精算予定額</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {organizerEvents.map((event) => (
                <tr key={event.id}>
                  <td className="py-4 pr-4 font-medium">{event.name}</td>
                  <td className="px-4 py-4">
                    <EventStatusBadge status={event.status} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    {event.sales.ticketsSold.toLocaleString("ja-JP")}枚
                  </td>
                  <td className="px-4 py-4 text-right">{formatCurrency(event.sales.grossSales)}</td>
                  <td className="px-4 py-4 text-right">
                    {formatCurrency(event.sales.organizerFeeAmount)}
                  </td>
                  <td className="py-4 pl-4 text-right">
                    {formatCurrency(event.sales.grossSales - event.sales.organizerFeeAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function totalBuyerFeeAmount() {
  return organizerEvents.reduce((total, event) => total + event.sales.buyerFeeAmount, 0);
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <section aria-label={label} className="border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-normal">{value}</div>
    </section>
  );
}
