import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../index";

// 主催者のイベント詳細。イベント詳細ページ（ハブ）と各設定ページがこの1本から復元できることを条件に、
// 必要なものだけを返す（ADR 0012）。日時はすべてISO文字列。
const eventGetOutputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  // 公開期間。publishesAt が null なら下書き（ADR 0012）
  publishesAt: z.string().nullable(),
  closesAt: z.string().nullable(),
  stages: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      venueId: z.string().min(1),
      venueName: z.string().min(1),
      doorsOpenAt: z.string().min(1),
      startsAt: z.string().min(1),
    }),
  ),
  inventoryCategories: z.array(
    z.object({
      id: z.string().min(1),
      kind: z.enum(["ENTRY_NUMBER", "RESERVED_SEAT"]),
      name: z.string().min(1),
      description: z.string(),
      displayOrder: z.number().int().min(0),
      entryNumberPrefix: z.string().nullable(),
    }),
  ),
  rateTypes: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      displayOrder: z.number().int().min(0),
    }),
  ),
  inventoryPools: z.array(
    z.object({
      id: z.string().min(1),
      stageId: z.string().min(1),
      inventoryCategoryId: z.string().min(1),
      capacity: z.number().int().min(0),
      availableQuantity: z.number().int().min(0),
    }),
  ),
  saleWindows: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      publishesAt: z.string().nullable(),
      applicationStartsAt: z.string().min(1),
      applicationEndsAt: z.string().min(1),
      isSmsAuthRequired: z.boolean(),
      saleMethod: z.enum(["FIRST_COME", "LOTTERY"]),
      autoLotteryStartsAt: z.string().nullable(),
      notifiesLotteryResultAt: z.string().nullable(),
      maxLotteryItemCount: z.number().int().min(1).nullable(),
      canceledAt: z.string().nullable(),
      cancelReason: z.string().nullable(),
      offers: z.array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          description: z.string(),
          maxQuantityPerOrder: z.number().int().min(1),
          quantityStep: z.number().int().min(1),
          displayOrder: z.number().int().min(0),
          rates: z.array(
            z.object({
              id: z.string().min(1),
              rateTypeId: z.string().min(1),
              price: z.number().int().min(0),
            }),
          ),
          entitlements: z.array(
            z.object({
              id: z.string().min(1),
              inventoryPoolId: z.string().min(1),
              stageId: z.string().min(1),
              inventoryCategoryId: z.string().min(1),
            }),
          ),
          soldQuantity: z.number().int().min(0),
          availableQuantity: z.number().int().min(0),
          minPrice: z.number().int().min(0),
        }),
      ),
    }),
  ),
  sales: z.object({
    grossSales: z.number().int().min(0),
    ticketsSold: z.number().int().min(0),
  }),
});

const eventGetInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  eventId: z.string().min(1),
});

export type EventGetInput = z.infer<typeof eventGetInputSchema>;
export type EventGetOutput = z.infer<typeof eventGetOutputSchema>;

export const eventGetRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/organizer/events/{eventId}",
    summary: "Get organizer event",
  })
  .input(eventGetInputSchema)
  .output(eventGetOutputSchema)
  .handler(handler);
