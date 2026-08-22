import type { EventGetOutput } from "@ticket-app/api/routers/organizer/event/get/route";

import { getDefaultStageSchedule, getStageDateValue } from "./stage-schedule";

export type DraftStage = {
  key: string;
  id?: string;
  name: string;
  venueName: string;
  stageDate: string;
  doorsOpenAt: string;
  startsAt: string;
};

export type DraftInventoryCategory = {
  key: string;
  id?: string;
  name: string;
};

export type DraftRateType = {
  key: string;
  id?: string;
  name: string;
};

export type DraftInventoryCell = {
  stageKey: string;
  inventoryCategoryKey: string;
  capacity: number;
  savedCapacity: number;
};

export type DraftOfferRate = {
  rateTypeKey: string;
  price: number;
};

export type DraftOffer = {
  key: string;
  id?: string;
  isPass: boolean;
  stageKeys: string[];
  inventoryCategoryKey: string;
  maxQuantityPerOrder: number;
  rates: DraftOfferRate[];
};

export type DraftSaleWindow = {
  key: string;
  id?: string;
  name: string;
  method: "FIRST_COME" | "LOTTERY";
  publishesAt: string;
  applicationStartsAt: string;
  applicationEndsAt: string;
  lotteryMode: "AUTO" | "MANUAL";
  notifyLotteryResultAt: string;
  isSmsAuthRequired: boolean;
  canceledAt?: string;
  // 受付を取りやめるときの理由。保存済みの受付は削除できないためキャンセルで表す（ADR 0004）
  cancelReason?: string;
  offers: DraftOffer[];
};

export type EventDraft = {
  eventId?: string;
  // イベントページの公開期間。datetime-local の値（未設定なら空文字）（ADR 0012）
  publishesAt: string;
  closesAt: string;
  name: string;
  description: string;
  stages: DraftStage[];
  inventoryCategories: DraftInventoryCategory[];
  rateTypes: DraftRateType[];
  inventory: DraftInventoryCell[];
  saleWindows: DraftSaleWindow[];
};

export type WizardDraftAction =
  | {
      type: "SET_BASIC_INFO";
      name: string;
      description: string;
      publishesAt: string;
      closesAt: string;
    }
  | { type: "SET_EVENT_ID"; eventId: string }
  | { type: "ADD_STAGE" }
  | { type: "UPDATE_STAGE"; key: string; patch: Partial<DraftStage> }
  | { type: "REMOVE_STAGE"; key: string }
  | { type: "MARK_STAGE_SAVED"; key: string; id: string }
  | { type: "ADD_INVENTORY_CATEGORY" }
  | { type: "UPDATE_INVENTORY_CATEGORY"; key: string; patch: Partial<DraftInventoryCategory> }
  | { type: "REMOVE_INVENTORY_CATEGORY"; key: string }
  | { type: "MARK_INVENTORY_CATEGORY_SAVED"; key: string; id: string }
  | {
      type: "SET_INVENTORY_CELL";
      stageKey: string;
      inventoryCategoryKey: string;
      capacity: number;
    }
  | {
      type: "MARK_INVENTORY_SAVED";
      stageKey: string;
      inventoryCategoryKey: string;
      capacity: number;
    }
  | { type: "ADD_RATE_TYPE" }
  | { type: "UPDATE_RATE_TYPE"; key: string; patch: Partial<DraftRateType> }
  | { type: "REMOVE_RATE_TYPE"; key: string }
  | { type: "MARK_RATE_TYPE_SAVED"; key: string; id: string }
  | { type: "ADD_SALE_WINDOW" }
  | { type: "UPDATE_SALE_WINDOW"; key: string; patch: Partial<DraftSaleWindow> }
  | { type: "REMOVE_SALE_WINDOW"; key: string }
  | { type: "MARK_SALE_WINDOW_SAVED"; key: string; id: string }
  | { type: "ADD_OFFER"; saleWindowKey: string; offer: DraftOffer }
  | { type: "UPDATE_OFFER"; saleWindowKey: string; key: string; patch: Partial<DraftOffer> }
  | { type: "REMOVE_OFFER"; saleWindowKey: string; key: string }
  | { type: "MARK_OFFER_SAVED"; saleWindowKey: string; key: string; id: string }
  | { type: "HYDRATE"; draft: EventDraft };

// 削除した公演を対象公演から除外する。対象公演が0件になったofferは(通し券が全対象公演を失うため)削除する。
function removeOffersReferencingStage(
  saleWindows: DraftSaleWindow[],
  stageKey: string,
): DraftSaleWindow[] {
  return saleWindows.map((saleWindow) => ({
    ...saleWindow,
    offers: saleWindow.offers
      .map((offer) => ({
        ...offer,
        stageKeys: offer.stageKeys.filter((key) => key !== stageKey),
      }))
      .filter((offer) => offer.stageKeys.length > 0),
  }));
}

export function eventDraftReducer(draft: EventDraft, action: WizardDraftAction): EventDraft {
  switch (action.type) {
    case "SET_BASIC_INFO":
      return {
        ...draft,
        name: action.name,
        description: action.description,
        publishesAt: action.publishesAt,
        closesAt: action.closesAt,
      };
    case "SET_EVENT_ID":
      return { ...draft, eventId: action.eventId };
    case "ADD_STAGE":
      return {
        ...draft,
        stages: [
          ...draft.stages,
          {
            key: crypto.randomUUID(),
            name: "",
            venueName: "",
            ...getDefaultStageSchedule(),
          },
        ],
      };
    case "UPDATE_STAGE":
      return {
        ...draft,
        stages: draft.stages.map((stage) =>
          stage.key === action.key ? { ...stage, ...action.patch } : stage,
        ),
      };
    case "REMOVE_STAGE":
      return {
        ...draft,
        stages: draft.stages.filter((stage) => stage.key !== action.key),
        inventory: draft.inventory.filter((cell) => cell.stageKey !== action.key),
        // 削除した公演を参照するofferは対象公演から除外し、対象公演が0件になるofferごと削除する。
        // (通し券が全対象公演を失って不整合な状態のまま残ることを防ぐ)
        saleWindows: removeOffersReferencingStage(draft.saleWindows, action.key),
      };
    case "MARK_STAGE_SAVED":
      return {
        ...draft,
        stages: draft.stages.map((stage) =>
          stage.key === action.key ? { ...stage, id: action.id } : stage,
        ),
      };
    case "ADD_INVENTORY_CATEGORY":
      return {
        ...draft,
        inventoryCategories: [...draft.inventoryCategories, { key: crypto.randomUUID(), name: "" }],
      };
    case "UPDATE_INVENTORY_CATEGORY":
      return {
        ...draft,
        inventoryCategories: draft.inventoryCategories.map((inventoryCategory) =>
          inventoryCategory.key === action.key
            ? { ...inventoryCategory, ...action.patch }
            : inventoryCategory,
        ),
      };
    case "REMOVE_INVENTORY_CATEGORY":
      return {
        ...draft,
        inventoryCategories: draft.inventoryCategories.filter(
          (inventoryCategory) => inventoryCategory.key !== action.key,
        ),
        inventory: draft.inventory.filter((cell) => cell.inventoryCategoryKey !== action.key),
        // offerは単一の席種に紐づくため、削除した席種を参照するofferは丸ごと削除する。
        saleWindows: draft.saleWindows.map((saleWindow) => ({
          ...saleWindow,
          offers: saleWindow.offers.filter((offer) => offer.inventoryCategoryKey !== action.key),
        })),
      };
    case "MARK_INVENTORY_CATEGORY_SAVED":
      return {
        ...draft,
        inventoryCategories: draft.inventoryCategories.map((inventoryCategory) =>
          inventoryCategory.key === action.key
            ? { ...inventoryCategory, id: action.id }
            : inventoryCategory,
        ),
      };
    case "SET_INVENTORY_CELL": {
      const exists = draft.inventory.some(
        (cell) =>
          cell.stageKey === action.stageKey &&
          cell.inventoryCategoryKey === action.inventoryCategoryKey,
      );

      return {
        ...draft,
        inventory: exists
          ? draft.inventory.map((cell) =>
              cell.stageKey === action.stageKey &&
              cell.inventoryCategoryKey === action.inventoryCategoryKey
                ? { ...cell, capacity: action.capacity }
                : cell,
            )
          : [
              ...draft.inventory,
              {
                stageKey: action.stageKey,
                inventoryCategoryKey: action.inventoryCategoryKey,
                capacity: action.capacity,
                savedCapacity: 0,
              },
            ],
      };
    }
    case "MARK_INVENTORY_SAVED":
      return {
        ...draft,
        inventory: draft.inventory.map((cell) =>
          cell.stageKey === action.stageKey &&
          cell.inventoryCategoryKey === action.inventoryCategoryKey
            ? { ...cell, capacity: action.capacity, savedCapacity: action.capacity }
            : cell,
        ),
      };
    case "ADD_RATE_TYPE":
      return {
        ...draft,
        rateTypes: [...draft.rateTypes, { key: crypto.randomUUID(), name: "" }],
      };
    case "UPDATE_RATE_TYPE":
      return {
        ...draft,
        rateTypes: draft.rateTypes.map((rateType) =>
          rateType.key === action.key ? { ...rateType, ...action.patch } : rateType,
        ),
      };
    case "REMOVE_RATE_TYPE":
      return {
        ...draft,
        rateTypes: draft.rateTypes.filter((rateType) => rateType.key !== action.key),
      };
    case "MARK_RATE_TYPE_SAVED":
      return {
        ...draft,
        rateTypes: draft.rateTypes.map((rateType) =>
          rateType.key === action.key ? { ...rateType, id: action.id } : rateType,
        ),
      };
    case "ADD_SALE_WINDOW":
      return {
        ...draft,
        saleWindows: [
          ...draft.saleWindows,
          {
            key: crypto.randomUUID(),
            name: "",
            method: "FIRST_COME",
            // 公開日時は空欄のまま保存すると即座に一般公開扱いになる(fan向け可視性判定がnullを
            // 公開済みとみなすため)。organizerが未入力のまま気づかず保存しないよう、現在時刻を
            // 初期値として明示しておく(必要なら未来日時に変更できる)。
            publishesAt: toDateTimeLocalValue(new Date().toISOString()),
            applicationStartsAt: "",
            applicationEndsAt: "",
            lotteryMode: "AUTO",
            notifyLotteryResultAt: "",
            isSmsAuthRequired: false,
            offers: [],
          },
        ],
      };
    case "UPDATE_SALE_WINDOW":
      return {
        ...draft,
        saleWindows: draft.saleWindows.map((saleWindow) =>
          saleWindow.key === action.key ? { ...saleWindow, ...action.patch } : saleWindow,
        ),
      };
    case "REMOVE_SALE_WINDOW":
      return {
        ...draft,
        saleWindows: draft.saleWindows.filter((saleWindow) => saleWindow.key !== action.key),
      };
    case "MARK_SALE_WINDOW_SAVED":
      return {
        ...draft,
        saleWindows: draft.saleWindows.map((saleWindow) =>
          saleWindow.key === action.key ? { ...saleWindow, id: action.id } : saleWindow,
        ),
      };
    case "ADD_OFFER":
      return {
        ...draft,
        saleWindows: draft.saleWindows.map((saleWindow) =>
          saleWindow.key === action.saleWindowKey
            ? { ...saleWindow, offers: [...saleWindow.offers, action.offer] }
            : saleWindow,
        ),
      };
    case "UPDATE_OFFER":
      return {
        ...draft,
        saleWindows: draft.saleWindows.map((saleWindow) =>
          saleWindow.key === action.saleWindowKey
            ? {
                ...saleWindow,
                offers: saleWindow.offers.map((offer) =>
                  offer.key === action.key ? { ...offer, ...action.patch } : offer,
                ),
              }
            : saleWindow,
        ),
      };
    case "REMOVE_OFFER":
      return {
        ...draft,
        saleWindows: draft.saleWindows.map((saleWindow) =>
          saleWindow.key === action.saleWindowKey
            ? {
                ...saleWindow,
                offers: saleWindow.offers.filter((offer) => offer.key !== action.key),
              }
            : saleWindow,
        ),
      };
    case "MARK_OFFER_SAVED":
      return {
        ...draft,
        saleWindows: draft.saleWindows.map((saleWindow) =>
          saleWindow.key === action.saleWindowKey
            ? {
                ...saleWindow,
                offers: saleWindow.offers.map((offer) =>
                  offer.key === action.key ? { ...offer, id: action.id } : offer,
                ),
              }
            : saleWindow,
        ),
      };
    case "HYDRATE":
      return action.draft;
    default:
      return draft;
  }
}

export function buildEmptyDraft(): EventDraft {
  return {
    name: "",
    description: "",
    publishesAt: "",
    closesAt: "",
    stages: [],
    inventoryCategories: [],
    rateTypes: [],
    inventory: [],
    saleWindows: [],
  };
}

export function buildDraftFromEvent(event: EventGetOutput): EventDraft {
  // 編集モードでは公演・席種・料金種別の実IDをそのままローカルkeyとして使う(既に確定しているため)。
  return {
    eventId: event.id,
    name: event.name,
    description: event.description,
    publishesAt: event.publishesAt ? toDateTimeLocalValue(event.publishesAt) : "",
    closesAt: event.closesAt ? toDateTimeLocalValue(event.closesAt) : "",
    stages: event.stages.map((stage) => {
      const doorsOpenAt = toDateTimeLocalValue(stage.doorsOpenAt);
      const startsAt = toDateTimeLocalValue(stage.startsAt);

      return {
        key: stage.id,
        id: stage.id,
        name: stage.name,
        venueName: stage.venueName,
        stageDate: getStageDateValue({ doorsOpenAt, startsAt }),
        doorsOpenAt,
        startsAt,
      };
    }),
    inventoryCategories: event.inventoryCategories.map((inventoryCategory) => ({
      key: inventoryCategory.id,
      id: inventoryCategory.id,
      name: inventoryCategory.name,
    })),
    rateTypes: event.rateTypes.map((rateType) => ({
      key: rateType.id,
      id: rateType.id,
      name: rateType.name,
    })),
    inventory: event.inventoryPools.map((pool) => ({
      stageKey: pool.stageId,
      inventoryCategoryKey: pool.inventoryCategoryId,
      capacity: pool.capacity,
      savedCapacity: pool.capacity,
    })),
    saleWindows: event.saleWindows.map((saleWindow) => ({
      key: saleWindow.id,
      id: saleWindow.id,
      name: saleWindow.name,
      method: saleWindow.saleMethod,
      publishesAt: saleWindow.publishesAt ? toDateTimeLocalValue(saleWindow.publishesAt) : "",
      applicationStartsAt: toDateTimeLocalValue(saleWindow.applicationStartsAt),
      applicationEndsAt: toDateTimeLocalValue(saleWindow.applicationEndsAt),
      // 自動抽選の開始日時が入っていれば自動、無ければ手動とみなす（ADR 0011）
      lotteryMode: saleWindow.autoLotteryStartsAt ? ("AUTO" as const) : ("MANUAL" as const),
      notifyLotteryResultAt: saleWindow.notifiesLotteryResultAt
        ? toDateTimeLocalValue(saleWindow.notifiesLotteryResultAt)
        : "",
      isSmsAuthRequired: saleWindow.isSmsAuthRequired,
      canceledAt: saleWindow.canceledAt ?? undefined,
      cancelReason: saleWindow.cancelReason ?? undefined,
      offers: saleWindow.offers.map((offer) => ({
        key: offer.id,
        id: offer.id,
        isPass: offer.entitlements.length > 1,
        stageKeys: offer.entitlements.map((entitlement) => entitlement.stageId),
        inventoryCategoryKey: offer.entitlements[0]?.inventoryCategoryId ?? "",
        maxQuantityPerOrder: offer.maxQuantityPerOrder,
        rates: offer.rates.map((rate) => ({
          rateTypeKey: rate.rateTypeId,
          price: rate.price,
        })),
      })),
    })),
  };
}

function toDateTimeLocalValue(isoValue: string) {
  const date = new Date(isoValue);
  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
