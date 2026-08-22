import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@ticket-app/ui/components/button";
import { ChevronLeftIcon } from "lucide-react";
import { toast } from "sonner";

import type { EventGetOutput } from "@ticket-app/api/routers/organizer/event/get/route";

import { useCreateEvent } from "./_hooks/use-create-event";

import { BasicInfoFields } from "./_components/basic-info-fields";
import { StageFields } from "./_components/stage-fields";

// イベント作成はここで一区切りにする。
// 席種・料金種別・販売受付は、保存後にイベント詳細（ハブ）から個別に設定する。
// 主催者は1回で全部を決めきらず日をまたぐことが多いため、
// 基本情報と公演だけ先に確定させて、下書きイベントとして保存できるようにしている。
// 販売受付が1件も無いイベントは購入者に公開されない（APIの getEventStatus が DRAFT を返す）。
type EventFormPageProps =
  | { mode: "create"; eventOrganizerId: string }
  | { mode: "edit"; eventOrganizerId: string; event: EventGetOutput };

export function EventFormPage(props: EventFormPageProps) {
  const { mode, eventOrganizerId } = props;
  const initialEvent = props.mode === "edit" ? props.event : undefined;
  const navigate = useNavigate();
  const { draft, dispatch, save } = useCreateEvent({ mode, eventOrganizerId, initialEvent });
  const [isSaving, setIsSaving] = useState(false);
  const canSave = draft.name.trim().length > 0 && !isSaving;

  async function handleSave() {
    if (!canSave) {
      toast.error("イベント名を入力してください");
      return;
    }

    setIsSaving(true);
    try {
      const eventId = await save();
      toast.success(mode === "create" ? "イベントを作成しました" : "変更を保存しました");
      await navigate({ to: "/events/$eventId", params: { eventId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="overflow-y-auto bg-background">
      <section className="border-b">
        <div className="mx-auto max-w-[840px] px-4 py-8 md:px-6">
          {mode === "edit" && draft.eventId ? (
            <Link
              to="/events/$eventId"
              params={{ eventId: draft.eventId }}
              className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeftIcon className="size-3.5" aria-hidden="true" />
              イベント詳細へ戻る
            </Link>
          ) : (
            <Link
              to="/"
              className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeftIcon className="size-3.5" aria-hidden="true" />
              イベント一覧へ戻る
            </Link>
          )}

          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {mode === "create" ? "イベントを作成" : "基本情報・公演を編集"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "create"
              ? "まず基本情報と公演を登録します。席種・料金種別・販売受付は、作成後にイベント詳細から設定します。"
              : "イベント名・説明と、公演ごとの会場・日程を変更します。"}
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[840px] gap-11 px-4 py-8 md:px-6 md:py-10">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">基本情報</h2>
          <BasicInfoFields
            draft={draft}
            onChange={(patch) =>
              dispatch({
                type: "SET_BASIC_INFO",
                name: patch.name ?? draft.name,
                description: patch.description ?? draft.description,
                publishesAt: patch.publishesAt ?? draft.publishesAt,
                closesAt: patch.closesAt ?? draft.closesAt,
              })
            }
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-semibold">公演</h2>
            <span className="text-xs text-muted-foreground">
              ツアーの場合は公演を複数追加します
            </span>
          </div>
          <StageFields
            stages={draft.stages}
            onAdd={() => dispatch({ type: "ADD_STAGE" })}
            onUpdate={(key, patch) => dispatch({ type: "UPDATE_STAGE", key, patch })}
            onRemove={(key) => dispatch({ type: "REMOVE_STAGE", key })}
          />
        </section>

        <div className="flex items-center justify-end border-t pt-6">
          <Button type="button" size="lg" disabled={isSaving} onClick={handleSave}>
            {isSaving ? "保存中" : mode === "create" ? "作成" : "変更を保存"}
          </Button>
        </div>
      </div>
    </main>
  );
}
