import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import type { EventGetOutput } from "@ticket-app/api/routers/organizer/event/get/route";

import { EventSettingsPageLayout } from "@/features/event/_components/event-settings-page-layout";
import { useEditSalesSetting } from "@/features/event/_hooks/use-edit-sales-setting";

import { SaleWindowFields } from "./_components/sale-window-fields";

export function EventSaleWindowsPage({
  event,
  eventOrganizerId,
}: {
  event: EventGetOutput;
  eventOrganizerId: string;
}) {
  const navigate = useNavigate();
  const { draft, dispatch, save } = useEditSalesSetting({ eventOrganizerId, event });
  const [isSaving, setIsSaving] = useState(false);
  // 券は在庫プール（公演 × 席種）への利用権を持つため、公演と席種が先に必要になる（ADR 0004）
  const canAddOffers = draft.stages.length > 0 && draft.inventoryCategories.length > 0;

  async function handleSave() {
    setIsSaving(true);
    try {
      await save();
      toast.success("販売受付を保存しました");
      await navigate({ to: "/events/$eventId", params: { eventId: event.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }

  function handleRemoveSaleWindow(key: string) {
    const saleWindow = draft.saleWindows.find((item) => item.key === key);
    if (!saleWindow) {
      return;
    }

    // 未保存の受付はローカルにしか無いのでそのまま消す。
    // 保存済みの受付は削除できないため、理由つきのキャンセルとして保存する（ADR 0004）
    if (!saleWindow.id) {
      dispatch({ type: "REMOVE_SALE_WINDOW", key });
      return;
    }

    const cancelReason = window.prompt("キャンセル理由を入力してください");
    if (!cancelReason) {
      return;
    }

    dispatch({
      type: "UPDATE_SALE_WINDOW",
      key,
      patch: { canceledAt: new Date().toISOString(), cancelReason },
    });
    toast.info("保存するとこの販売受付をキャンセルします");
  }

  return (
    <EventSettingsPageLayout
      eventId={event.id}
      eventName={event.name}
      title="販売受付"
      description="受付期間と販売方式を決め、受付ごとに販売する券を登録します。"
      isSaving={isSaving}
      onSave={handleSave}
    >
      {canAddOffers ? null : (
        <p className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
          券は「公演 × 席種」の在庫に紐づきます。先に公演と席種を登録してください。
        </p>
      )}
      <SaleWindowFields
        saleWindows={draft.saleWindows}
        stages={draft.stages}
        inventoryCategories={draft.inventoryCategories}
        rateTypes={draft.rateTypes}
        onAdd={() => dispatch({ type: "ADD_SALE_WINDOW" })}
        onUpdate={(key, patch) => dispatch({ type: "UPDATE_SALE_WINDOW", key, patch })}
        onRemove={handleRemoveSaleWindow}
        onAddOffer={(saleWindowKey, offer) => dispatch({ type: "ADD_OFFER", saleWindowKey, offer })}
        onUpdateOffer={(saleWindowKey, offer) =>
          dispatch({ type: "UPDATE_OFFER", saleWindowKey, key: offer.key, patch: offer })
        }
        onRemoveOffer={(saleWindowKey, offerKey) =>
          dispatch({ type: "REMOVE_OFFER", saleWindowKey, key: offerKey })
        }
      />
    </EventSettingsPageLayout>
  );
}
