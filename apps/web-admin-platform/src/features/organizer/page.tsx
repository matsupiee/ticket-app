import { Link } from "@tanstack/react-router";

import { OrganizerListPanel } from "./_components/organizer-list-panel";
import {
  formatCurrency,
  platformMonthlySales,
  platformOrganizers,
  summarizePlatformSales,
} from "./_utils/platform";

export function PlatformDashboardPage() {
  const summary = summarizePlatformSales(platformMonthlySales);
  const underReviewCount = platformOrganizers.filter(
    (organizer) => organizer.status === "UNDER_REVIEW",
  ).length;

  return (
    <main className="overflow-y-auto bg-background">
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:px-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">ticket-app platform</p>
            <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
              プラットフォーム管理
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              主催者の状態と月別売上を確認し、審査や精算の優先度を判断します。
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Kpi label="総流通額" value={formatCurrency(summary.grossSales)} />
            <Kpi label="平台手数料" value={formatCurrency(summary.platformFeeAmount)} />
            <Kpi label="精算予定額" value={formatCurrency(summary.payoutAmount)} />
            <Kpi label="審査中主催者" value={`${underReviewCount}件`} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-5 px-4 py-8 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground">主催者一覧</h2>
          </div>
          <Link
            to="/sales"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            月別売上へ
          </Link>
        </div>
        <OrganizerListPanel
          organizers={platformOrganizers}
          renderOrganizerName={(organizer) => (
            <Link
              to="/organizers/$organizerId"
              params={{ organizerId: organizer.id }}
              className="transition-colors hover:text-primary"
            >
              {organizer.name}
            </Link>
          )}
        />
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
