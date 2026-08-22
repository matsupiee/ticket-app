import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../index";

// イベント作成は基本情報と公演までを1回で受け取る（ADR 0010）。
// 在庫種別・在庫・料金種別・販売受付は editSalesSetting が担当する。
const stageSchema = z.object({
  name: z.string().min(1),
  // 既存の Venue を指定する場合は venueId、新規なら venueName から作成・再利用する（ADR 0004）
  venueId: z.string().min(1).optional(),
  venueName: z.string().min(1),
  doorsOpenAt: z.string().min(1),
  startsAt: z.string().min(1),
});

const eventCreateInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  // イベントページの公開期間。作成時点では未設定（下書き）でよい（ADR 0012）
  publishesAt: z.string().min(1).nullable(),
  closesAt: z.string().min(1).nullable(),
  // 会場も日程も未定の段階でイベントだけ作れるよう、空配列を許容する
  stages: z.array(stageSchema),
});

const eventCreateOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type EventCreateInput = z.infer<typeof eventCreateInputSchema>;
export type EventCreateOutput = z.infer<typeof eventCreateOutputSchema>;

export const eventCreateRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/organizer/events",
    summary: "Create organizer event",
  })
  .input(eventCreateInputSchema)
  .output(eventCreateOutputSchema)
  .handler(handler);
