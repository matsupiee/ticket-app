import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import type { EventGetOutput } from "@ticket-app/api/routers/organizer/event/get/route";

import { EventSettingsPageLayout } from "@/features/event/_components/event-settings-page-layout";
import { useEditSalesSetting } from "@/features/event/_hooks/use-edit-sales-setting";

import { RateTypeFields } from "./_components/rate-type-fields";

export function EventRateTypesPage({
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
      toast.success("料金種別を保存しました");
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
      title="料金種別"
      description="大人・U-22 などの料金種別を定義します。実際の価格は販売受付ごとの券に設定します。"
      isSaving={isSaving}
      onSave={handleSave}
    >
      <RateTypeFields
        rateTypes={draft.rateTypes}
        onAdd={() => dispatch({ type: "ADD_RATE_TYPE" })}
        onUpdate={(key, patch) => dispatch({ type: "UPDATE_RATE_TYPE", key, patch })}
        onRemove={(key) => dispatch({ type: "REMOVE_RATE_TYPE", key })}
      />
    </EventSettingsPageLayout>
  );
}
