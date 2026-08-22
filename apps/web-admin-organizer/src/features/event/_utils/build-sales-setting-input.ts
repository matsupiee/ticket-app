import type { EventEditSalesSettingInput } from "@ticket-app/api/routers/organizer/event/edit-sales-setting/route";

import type { EventDraft } from "./event-draft-reducer";

// ドラフトを editSalesSetting の入力へ変換する。
// 在庫種別・料金種別はまだIDを持たないことがあるため、ドラフトの key で相互参照させる（key はAPI側で実IDに解決される）。
export function buildSalesSettingInput(input: {
  draft: EventDraft;
  eventOrganizerId: string;
  eventId: string;
}): EventEditSalesSettingInput {
  const { draft, eventOrganizerId, eventId } = input;
  // 公演は基本情報の保存時に確定済みなので、実IDを持つものだけを在庫・販売商品から参照できる
  const stageIdByKey = new Map(
    draft.stages.flatMap((stage) => (stage.id ? [[stage.key, stage.id] as const] : [])),
  );

  return {
    eventOrganizerId,
    eventId,
    inventoryCategories: draft.inventoryCategories
      .filter((inventoryCategory) => inventoryCategory.name)
      .map((inventoryCategory, index) => ({
        key: inventoryCategory.key,
        id: inventoryCategory.id,
        // 指定席は座席レイアウトの選択UIが無いので整理番号方式だけを作る（ADR 0004）
        kind: "ENTRY_NUMBER" as const,
        name: inventoryCategory.name,
        description: "",
        displayOrder: index,
      })),
    rateTypes: draft.rateTypes
      .filter((rateType) => rateType.name)
      .map((rateType, index) => ({
        key: rateType.key,
        id: rateType.id,
        name: rateType.name,
        displayOrder: index,
      })),
    inventories: draft.inventory.flatMap((cell) => {
      const stageId = stageIdByKey.get(cell.stageKey);

      return stageId
        ? [
            {
              stageId,
              inventoryCategoryKey: cell.inventoryCategoryKey,
              capacity: cell.capacity,
            },
          ]
        : [];
    }),
    saleWindows: draft.saleWindows.map((saleWindow) => ({
      key: saleWindow.key,
      id: saleWindow.id,
      name: saleWindow.name,
      publishesAt: saleWindow.publishesAt || saleWindow.applicationStartsAt,
      applicationStartsAt: saleWindow.applicationStartsAt,
      applicationEndsAt: saleWindow.applicationEndsAt,
      isSmsAuthRequired: saleWindow.isSmsAuthRequired,
      saleMethod: saleWindow.method,
      // 自動抽選は申込終了と同時に始める。手動抽選のときは開始日時を持たせない
      autoLotteryStartsAt:
        saleWindow.method === "LOTTERY" && saleWindow.lotteryMode === "AUTO"
          ? saleWindow.applicationEndsAt
          : undefined,
      notifiesLotteryResultAt:
        saleWindow.method === "LOTTERY" ? saleWindow.notifyLotteryResultAt || undefined : undefined,
      cancelReason: saleWindow.canceledAt ? saleWindow.cancelReason || undefined : undefined,
      offers: saleWindow.offers.map((offer, index) => ({
        key: offer.key,
        id: offer.id,
        name: buildOfferName({ draft, offer }),
        description: "",
        maxQuantityPerOrder: offer.maxQuantityPerOrder,
        quantityStep: 1,
        displayOrder: index,
        rates: offer.rates.map((rate) => ({
          rateTypeKey: rate.rateTypeKey,
          price: rate.price,
        })),
        entitlements: offer.stageKeys.flatMap((stageKey) => {
          const stageId = stageIdByKey.get(stageKey);

          return stageId ? [{ stageId, inventoryCategoryKey: offer.inventoryCategoryKey }] : [];
        }),
      })),
    })),
  };
}

function buildOfferName(input: {
  draft: EventDraft;
  offer: EventDraft["saleWindows"][number]["offers"][number];
}) {
  const inventoryCategoryName =
    input.draft.inventoryCategories.find(
      (inventoryCategory) => inventoryCategory.key === input.offer.inventoryCategoryKey,
    )?.name ?? "";

  return input.offer.isPass ? `通し券 ${inventoryCategoryName}` : inventoryCategoryName;
}
