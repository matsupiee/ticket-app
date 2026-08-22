import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../index";

// 販売設定（在庫種別・在庫・料金種別・販売受付・販売商品）をまとめて受け取る（ADR 0011）。
//
// 未保存の在庫種別・料金種別はまだIDを持たないが、在庫や販売商品からは参照する必要がある。
// そのためクライアントが決めた `key` で相互参照し、サーバー側で実IDへ解決する。
// 既存行は `key` に実IDを入れて送ってもよい（`id` があればそちらを優先して更新する）。
const inventoryCategorySchema = z.object({
  key: z.string().min(1),
  id: z.string().min(1).optional(),
  kind: z.enum(["ENTRY_NUMBER", "RESERVED_SEAT"]),
  name: z.string().min(1),
  description: z.string(),
  displayOrder: z.number().int().min(0),
  // 整理番号の接頭辞。kind が ENTRY_NUMBER のときだけ設定できる（ADR 0008）
  entryNumberPrefix: z
    .string()
    .regex(/^[0-9A-Z]{1,4}$/)
    .optional(),
});

const rateTypeSchema = z.object({
  key: z.string().min(1),
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  displayOrder: z.number().int().min(0),
});

// 公演 × 在庫種別ごとの在庫数。差分ではなく「あるべき枚数」を送る。
// 減らす場合に販売済み・確保済みの枠は削除できないため、サーバー側で拒否することがある（ADR 0004）
const inventorySchema = z.object({
  stageId: z.string().min(1),
  inventoryCategoryKey: z.string().min(1),
  capacity: z.number().int().min(0),
});

const saleOfferSchema = z.object({
  key: z.string().min(1),
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string(),
  maxQuantityPerOrder: z.number().int().min(1),
  quantityStep: z.number().int().min(1),
  displayOrder: z.number().int().min(0),
  rates: z.array(
    z.object({
      rateTypeKey: z.string().min(1),
      price: z.number().int().min(0),
    }),
  ),
  // 通し券は複数公演ぶんの利用権を持つ。単券は1件（ADR 0001）
  entitlements: z.array(
    z.object({
      stageId: z.string().min(1),
      inventoryCategoryKey: z.string().min(1),
    }),
  ),
});

const saleWindowSchema = z.object({
  key: z.string().min(1),
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  // 省略すると即座に公開済み扱いになるため、クライアント側で必ず入れる（ADR 0004）
  publishesAt: z.string().min(1),
  applicationStartsAt: z.string().min(1),
  applicationEndsAt: z.string().min(1),
  isSmsAuthRequired: z.boolean(),
  saleMethod: z.enum(["FIRST_COME", "LOTTERY"]),
  // 抽選のときだけ使う。autoLotteryStartsAt が無い場合は手動抽選
  autoLotteryStartsAt: z.string().min(1).optional(),
  notifiesLotteryResultAt: z.string().min(1).optional(),
  maxLotteryItemCount: z.number().int().min(1).optional(),
  // 受付の削除はできないので、取りやめるときは理由つきでキャンセルする（ADR 0004）
  cancelReason: z.string().min(1).optional(),
  offers: z.array(saleOfferSchema),
});

const eventEditSalesSettingInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  eventId: z.string().min(1),
  inventoryCategories: z.array(inventoryCategorySchema),
  rateTypes: z.array(rateTypeSchema),
  inventories: z.array(inventorySchema),
  saleWindows: z.array(saleWindowSchema),
});

const eventEditSalesSettingOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type EventEditSalesSettingInput = z.infer<typeof eventEditSalesSettingInputSchema>;
export type EventEditSalesSettingOutput = z.infer<typeof eventEditSalesSettingOutputSchema>;

export const eventEditSalesSettingRoute = protectedProcedure
  .route({
    method: "PUT",
    path: "/organizer/events/{eventId}/sales-setting",
    summary: "Edit organizer event sales setting",
  })
  .input(eventEditSalesSettingInputSchema)
  .output(eventEditSalesSettingOutputSchema)
  .handler(handler);
