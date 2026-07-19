import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@ticket-app/ui/components/empty";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { cn } from "@ticket-app/ui/lib/utils";
import { Search } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { OrganizerStatusBadge } from "./status-badge";
import {
  type OrganizerStatus,
  type PlatformOrganizer,
  filterPlatformOrganizers,
  formatCurrency,
} from "../_utils/platform";

export function OrganizerListPanel({
  organizers,
  renderOrganizerName,
}: {
  organizers: PlatformOrganizer[];
  renderOrganizerName?: (organizer: PlatformOrganizer) => ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<OrganizerStatus | "ALL">("ALL");
  const filteredOrganizers = useMemo(() => {
    return filterPlatformOrganizers(query, organizers).filter((organizer) =>
      status === "ALL" ? true : organizer.status === status,
    );
  }, [organizers, query, status]);

  return (
    <section className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <label className="flex items-center gap-2 border bg-background px-3 py-2">
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">主催者検索</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="主催者名・地域・審査状態で検索"
            className="h-9 border-0 px-0 text-sm focus-visible:ring-0"
          />
        </label>
        <div className="grid gap-2">
          <Label htmlFor="organizerStatus">ステータス</Label>
          <select
            id="organizerStatus"
            value={status}
            onChange={(event) => setStatus(event.target.value as OrganizerStatus | "ALL")}
            className={cn(
              "h-9 w-full border border-input bg-background px-3 text-sm outline-none transition-colors",
              "focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30",
            )}
          >
            <option value="ALL">すべて</option>
            <option value="ACTIVE">有効</option>
            <option value="UNDER_REVIEW">審査中</option>
            <option value="SUSPENDED">停止中</option>
          </select>
        </div>
      </div>

      {filteredOrganizers.length > 0 ? (
        <div aria-label="主催者一覧" className="divide-y border-y">
          {filteredOrganizers.map((organizer) => (
            <article key={organizer.id} className="grid gap-4 py-5 md:grid-cols-[1fr_auto]">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <OrganizerStatusBadge status={organizer.status} />
                  <span className="border px-2 py-1 text-xs text-muted-foreground">
                    リスク: {organizer.riskLevel}
                  </span>
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-medium">
                    {renderOrganizerName ? renderOrganizerName(organizer) : organizer.name}
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {organizer.location} / {organizer.representativeName} / {organizer.email}
                  </p>
                </div>
              </div>
              <div className="grid gap-2 text-sm md:justify-items-end">
                <span className="font-medium">{formatCurrency(organizer.grossSales)}</span>
                <span className="text-xs text-muted-foreground">
                  {organizer.events.length}イベント
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>該当する主催者がありません</EmptyTitle>
            <EmptyDescription>検索語やステータスを変えて確認してください。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}
