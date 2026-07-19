import {
  formatCurrency,
  formatMonth,
  platformMonthlySales,
  summarizePlatformSales,
} from "@/features/organizer/_utils/platform";

export function PlatformMonthlySalesPage() {
  const summary = summarizePlatformSales(platformMonthlySales);

  return (
    <main className="overflow-y-auto bg-background">
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:px-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">monthly sales</p>
            <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">月別売上一覧</h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              月ごとの総流通額、平台手数料、主催者への精算額を比較します。
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Kpi label="総流通額" value={formatCurrency(summary.grossSales)} />
            <Kpi label="平台手数料" value={formatCurrency(summary.platformFeeAmount)} />
            <Kpi label="精算額" value={formatCurrency(summary.payoutAmount)} />
            <Kpi label="申し込み数" value={`${summary.applications.toLocaleString("ja-JP")}件`} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="overflow-x-auto border-y">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b text-xs text-muted-foreground">
              <tr>
                <th className="py-3 pr-4 font-medium">月</th>
                <th className="px-4 py-3 text-right font-medium">総流通額</th>
                <th className="px-4 py-3 text-right font-medium">平台手数料</th>
                <th className="px-4 py-3 text-right font-medium">精算額</th>
                <th className="py-3 pl-4 text-right font-medium">申し込み数</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {platformMonthlySales.map((sale) => (
                <tr key={sale.id}>
                  <td className="py-4 pr-4 font-medium">{formatMonth(sale.month)}</td>
                  <td className="px-4 py-4 text-right">{formatCurrency(sale.grossSales)}</td>
                  <td className="px-4 py-4 text-right">{formatCurrency(sale.platformFeeAmount)}</td>
                  <td className="px-4 py-4 text-right">{formatCurrency(sale.payoutAmount)}</td>
                  <td className="py-4 pl-4 text-right">
                    {sale.applications.toLocaleString("ja-JP")}件
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

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <section aria-label={label} className="border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-normal">{value}</div>
    </section>
  );
}
