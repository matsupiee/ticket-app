import { useReducer } from "react";

import type { EventGetOutput } from "@ticket-app/api/routers/organizer/event/get/route";

import { client } from "@/lib/orpc";

import { buildSalesSettingInput } from "../_utils/build-sales-setting-input";
import { buildDraftFromEvent, eventDraftReducer } from "../_utils/event-draft-reducer";

// 在庫種別・在庫・料金種別・販売受付の設定ページで共有するフック。
// これらは event.editSalesSetting 1本で保存するため、どのページから保存しても
// 販売設定の全体をその時点の目的状態として送る。
export function useEditSalesSetting(input: { eventOrganizerId: string; event: EventGetOutput }) {
  const [draft, dispatch] = useReducer(eventDraftReducer, undefined, () =>
    buildDraftFromEvent(input.event),
  );

  async function save() {
    await client.organizer.event.editSalesSetting(
      buildSalesSettingInput({
        draft,
        eventOrganizerId: input.eventOrganizerId,
        eventId: input.event.id,
      }),
    );
  }

  return { draft, dispatch, save };
}
