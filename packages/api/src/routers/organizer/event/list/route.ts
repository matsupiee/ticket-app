import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../index";

// 主催者のイベント一覧。一覧に出す情報とダッシュボードの集計だけを返す（ADR 0012）。
// 1件ずつの設定内容は get が担当する。
const eventListInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  // イベント名・説明の部分一致で絞り込む
  query: z.string().min(1).optional(),
});

const eventListOutputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      description: z.string(),
      publishesAt: z.string().nullable(),
      closesAt: z.string().nullable(),
      // 一覧では最初の公演の日程と会場だけ出す
      firstStage: z
        .object({
          startsAt: z.string().min(1),
          venueName: z.string().min(1),
        })
        .nullable(),
      stageCount: z.number().int().min(0),
      saleMethods: z.array(z.enum(["FIRST_COME", "LOTTERY"])),
      grossSales: z.number().int().min(0),
      ticketsSold: z.number().int().min(0),
    }),
  ),
  summary: z.object({
    eventCount: z.number().int().min(0),
    // 現在公開中のイベント数
    publishedEventCount: z.number().int().min(0),
    grossSales: z.number().int().min(0),
    ticketsSold: z.number().int().min(0),
  }),
});

export type EventListInput = z.infer<typeof eventListInputSchema>;
export type EventListOutput = z.infer<typeof eventListOutputSchema>;

export const eventListRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/organizer/events",
    summary: "List organizer events",
  })
  .input(eventListInputSchema)
  .output(eventListOutputSchema)
  .handler(handler);
