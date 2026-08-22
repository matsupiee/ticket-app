import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../index";

// 基本情報と公演の編集。イベント作成フォームと同じ範囲を扱う（ADR 0010）。
const stageSchema = z.object({
  // 既存公演を更新する場合だけ stageId を渡す。省略時は新規作成する
  stageId: z.string().min(1).optional(),
  name: z.string().min(1),
  venueId: z.string().min(1).optional(),
  venueName: z.string().min(1),
  doorsOpenAt: z.string().min(1),
  startsAt: z.string().min(1),
});

const eventEditBasicInfoInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  eventId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  // イベントページの公開期間。null は「未設定」を表し、publishesAt が null の間は下書き（ADR 0012）
  publishesAt: z.string().min(1).nullable(),
  closesAt: z.string().min(1).nullable(),
  // 送られた配列をその時点の目的状態として扱う。ただし公演の削除は未対応（ADR 0004）なので、
  // 既存公演のIDが欠けていても削除はせず、含まれているものだけを更新する。
  stages: z.array(stageSchema),
});

const eventEditBasicInfoOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type EventEditBasicInfoInput = z.infer<typeof eventEditBasicInfoInputSchema>;
export type EventEditBasicInfoOutput = z.infer<typeof eventEditBasicInfoOutputSchema>;

export const eventEditBasicInfoRoute = protectedProcedure
  .route({
    method: "PATCH",
    path: "/organizer/events/{eventId}/basic-info",
    summary: "Edit organizer event basic info and stages",
  })
  .input(eventEditBasicInfoInputSchema)
  .output(eventEditBasicInfoOutputSchema)
  .handler(handler);
