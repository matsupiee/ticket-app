import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import type { EventGetOutput } from "@ticket-app/api/routers/organizer/event/get/route";

import { EventSettingsPageLayout } from "@/features/event/_components/event-settings-page-layout";
import { useEditSalesSetting } from "@/features/event/_hooks/use-edit-sales-setting";

import { InventoryCategoryFields } from "./_components/inventory-category-fields";

export function EventInventoryCategoriesPage({
  event,
  eventOrganizerId,
}: {
  event: EventGetOutput;
  eventOrganizerId: string;
}) {
  const navigate = useNavigate();
  const { draft, dispatch, save } = useEditSalesSetting({ eventOrganizerId, event });
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await save();
      toast.success("席種と在庫を保存しました");
      await navigate({ to: "/events/$eventId", params: { eventId: event.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <EventSettingsPageLayout
      eventId={event.id}
      eventName={event.name}
      title="席種・在庫"
      description="席種を定義し、公演ごとの在庫数を設定します。"
      isSaving={isSaving}
      onSave={handleSave}
    >
      {draft.stages.length > 0 ? (
        <InventoryCategoryFields
          inventoryCategories={draft.inventoryCategories}
          stages={draft.stages}
          inventory={draft.inventory}
          onAdd={() => dispatch({ type: "ADD_INVENTORY_CATEGORY" })}
          onUpdate={(key, patch) => dispatch({ type: "UPDATE_INVENTORY_CATEGORY", key, patch })}
          onRemove={(key) => handleRemoveInventoryCategory(draft, dispatch, key)}
          onInventoryChange={(stageKey, inventoryCategoryKey, capacity) =>
            dispatch({ type: "SET_INVENTORY_CELL", stageKey, inventoryCategoryKey, capacity })
          }
        />
      ) : (
        <p className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
          在庫は公演ごとに持つため、先に公演を1件以上登録してください。
        </p>
      )}
    </EventSettingsPageLayout>
  );
}

// 在庫種別に論理削除の手段が無い（ADR 0009）ため、保存済みの行は画面から消せない。
// 未保存の行だけローカルから取り除く。
function handleRemoveInventoryCategory(
  draft: ReturnType<typeof useEditSalesSetting>["draft"],
  dispatch: ReturnType<typeof useEditSalesSetting>["dispatch"],
  key: string,
) {
  const inventoryCategory = draft.inventoryCategories.find((item) => item.key === key);

  if (!inventoryCategory || inventoryCategory.id) {
    return;
  }

  dispatch({ type: "REMOVE_INVENTORY_CATEGORY", key });
}
