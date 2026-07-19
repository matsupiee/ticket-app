import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@ticket-app/ui/components/button";
import { CheckCircle2 } from "lucide-react";

import { SectionHeading } from "../../_components/section-heading";
import {
  type ApplicationSelection,
  type TicketEvent,
  calculateTicketQuoteForEvent,
  formatCurrency,
  formatDateTime,
} from "../../_utils/ticketing";

export function ApplicationCompletePage({
  event,
  selection,
}: {
  event: TicketEvent;
  selection: ApplicationSelection;
}) {
  const quote = calculateTicketQuoteForEvent(event, selection);

  return (
    <main className="overflow-y-auto bg-background">
      <section className="mx-auto grid max-w-3xl gap-8 px-4 py-12 md:px-6">
        <div className="space-y-4">
          <CheckCircle2 className="size-10 text-primary" aria-hidden="true" />
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-normal">申し込みが完了しました</h1>
            <p className="text-sm leading-7 text-muted-foreground">
              {quote.saleWindow.saleMethod === "LOTTERY"
                ? "抽選結果はマイページの申し込み一覧で確認できます。"
                : "モック決済が完了し、電子チケットを発券しました。マイページから入場操作に進めます。"}
            </p>
          </div>
        </div>

        <section className="space-y-4 border-y py-5">
          <SectionHeading title="申し込み内容" />
          <dl className="space-y-4">
            <SummaryRow label="イベント" value={event.name} />
            <SummaryRow
              label="公演"
              value={`${quote.performance.name} / ${formatDateTime(quote.performance.startsAt)}`}
            />
            <SummaryRow label="券種" value={`${quote.offer.name} ${quote.rateType.name}`} />
            <SummaryRow label="枚数" value={`${quote.quantity}枚`} />
            <SummaryRow label="支払予定額" value={formatCurrency(quote.totalAmount)} />
          </dl>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/" className={buttonVariants({ size: "lg", className: "text-sm" })}>
            他のイベントを見る
          </Link>
          <Link
            to="/dashboard"
            className={buttonVariants({ variant: "outline", size: "lg", className: "text-sm" })}
          >
            発券されたチケットを見る
          </Link>
        </div>
      </section>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[9rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
