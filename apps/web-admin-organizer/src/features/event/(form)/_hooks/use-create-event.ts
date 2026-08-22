import { useReducer } from "react";

import type { EventGetOutput } from "@ticket-app/api/routers/organizer/event/get/route";

import { client } from "@/lib/orpc";
import {
  buildDraftFromEvent,
  buildEmptyDraft,
  eventDraftReducer,
} from "@/features/event/_utils/event-draft-reducer";

// イベント作成フォーム（基本情報と公演）専用のフック。
// 作成時は event.create、既存イベントの編集時は event.editBasicInfo を呼ぶ。
// 販売設定（在庫種別・在庫・料金種別・販売受付）は editSalesSetting の担当なのでここでは扱わない。
export function useCreateEvent(input: {
  mode: "create" | "edit";
  eventOrganizerId: string;
  initialEvent?: EventGetOutput;
}) {
  const [draft, dispatch] = useReducer(eventDraftReducer, undefined, () =>
    input.initialEvent ? buildDraftFromEvent(input.initialEvent) : buildEmptyDraft(),
  );

  // 会場も日程も未入力の公演行は送らない。「公演を追加」を押しただけの空行を保存させないため。
  const filledStages = () =>
    draft.stages.filter((stage) => stage.name && stage.venueName && stage.startsAt);

  async function save() {
    if (draft.eventId) {
      const updated = await client.organizer.event.editBasicInfo({
        eventOrganizerId: input.eventOrganizerId,
        eventId: draft.eventId,
        name: draft.name,
        description: draft.description,
        publishesAt: draft.publishesAt || null,
        closesAt: draft.closesAt || null,
        stages: filledStages().map((stage) => ({
          stageId: stage.id,
          name: stage.name,
          venueName: stage.venueName,
          doorsOpenAt: stage.doorsOpenAt,
          startsAt: stage.startsAt,
        })),
      });

      return updated.id;
    }

    const created = await client.organizer.event.create({
      eventOrganizerId: input.eventOrganizerId,
      name: draft.name,
      description: draft.description,
      publishesAt: draft.publishesAt || null,
      closesAt: draft.closesAt || null,
      stages: filledStages().map((stage) => ({
        name: stage.name,
        venueName: stage.venueName,
        doorsOpenAt: stage.doorsOpenAt,
        startsAt: stage.startsAt,
      })),
    });
    dispatch({ type: "SET_EVENT_ID", eventId: created.id });

    return created.id;
  }

  return { draft, dispatch, save };
}
