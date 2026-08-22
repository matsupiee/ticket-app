import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@ticket-app/ui/components/button";
import { ChevronLeftIcon } from "lucide-react";

// イベント詳細（ハブ）から開く設定ページの共通枠。
// 席種・料金種別・販売受付はそれぞれ独立したページだが、
// 「詳細へ戻る → 編集する → 保存する」という流れは同じなのでここにまとめる。
export function EventSettingsPageLayout({
  eventId,
  eventName,
  title,
  description,
  isSaving,
  onSave,
  children,
}: {
  eventId: string;
  eventName: string;
  title: string;
  description: string;
  isSaving: boolean;
  onSave: () => void;
  children: ReactNode;
}) {
  return (
    <main className="overflow-y-auto bg-background">
      <section className="border-b">
        <div className="mx-auto max-w-[840px] px-4 py-8 md:px-6">
          <Link
            to="/events/$eventId"
            params={{ eventId }}
            className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeftIcon className="size-3.5" aria-hidden="true" />
            イベント詳細へ戻る
          </Link>

          <p className="text-xs text-muted-foreground">{eventName}</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[840px] gap-8 px-4 py-8 md:px-6 md:py-10">
        {children}

        <div className="flex items-center justify-end border-t pt-6">
          <Button type="button" size="lg" disabled={isSaving} onClick={onSave}>
            {isSaving ? "保存中" : "変更を保存"}
          </Button>
        </div>
      </div>
    </main>
  );
}
