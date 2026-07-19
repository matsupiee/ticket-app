import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@ticket-app/ui/components/button";

import { OrganizerStatusBadge } from "./_components/status-badge";
import {
  type PlatformOrganizer,
  formatCurrency,
  formatDate,
  organizerStatusLabels,
} from "./_utils/platform";

export function PlatformOrganizerDetailPage({ organizer }: { organizer: PlatformOrganizer }) {
  return (
    <main className="overflow-y-auto bg-background">
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:px-6">
          <Link to="/" className="text-sm underline">
            主催者一覧へ戻る
          </Link>
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-3">
              <OrganizerStatusBadge status={organizer.status} />
              <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">主催者詳細</h1>
              <p className="text-sm leading-7 text-muted-foreground">{organizer.name}</p>
            </div>
            <Link to="/sales" className={buttonVariants({ variant: "outline" })}>
              月別売上
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[0.85fr_1.15fr] md:px-6">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">審査情報</h2>
          <dl className="space-y-3 border-y py-4 text-sm">
            <SummaryRow label="代表者" value={organizer.representativeName} />
            <SummaryRow label="メール" value={organizer.email} />
            <SummaryRow label="所在地" value={organizer.location} />
            <SummaryRow label="ステータス" value={organizerStatusLabels[organizer.status]} />
            <SummaryRow label="リスク" value={`リスク: ${organizer.riskLevel}`} />
            <SummaryRow label="登録日" value={formatDate(organizer.joinedAt)} />
          </dl>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">イベントと精算</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <Kpi label="総流通額" value={formatCurrency(organizer.grossSales)} />
            <Kpi label="平台手数料" value={formatCurrency(organizer.platformFeeAmount)} />
            <Kpi label="精算額" value={formatCurrency(organizer.payoutAmount)} />
          </div>
          <div className="divide-y border-y">
            {organizer.events.map((event) => (
              <article key={event.id} className="grid gap-2 py-4 text-sm md:grid-cols-[1fr_auto]">
                <div>
                  <h3 className="font-medium">{event.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {event.status} / {event.ticketsSold.toLocaleString("ja-JP")}件
                  </p>
                </div>
                <div className="font-medium md:text-right">{formatCurrency(event.grossSales)}</div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <section aria-label={label} className="border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-normal">{value}</div>
    </section>
  );
}
