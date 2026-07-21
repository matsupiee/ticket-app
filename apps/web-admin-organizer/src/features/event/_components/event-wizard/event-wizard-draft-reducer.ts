import type { GetEventOutput } from "@ticket-app/api/routers/organizer/event/get/route";

export type DraftPerformance = {
  key: string;
  id?: string;
  name: string;
  doorsOpenAt: string;
  startsAt: string;
};

export type DraftSeatCategory = {
  key: string;
  id?: string;
  name: string;
  active: boolean;
};

export type DraftRateType = {
  key: string;
  id?: string;
  name: string;
};

export type DraftInventoryCell = {
  performanceKey: string;
  seatCategoryKey: string;
  capacity: number;
  savedCapacity: number;
};

export type DraftPriceCell = {
  seatCategoryKey: string;
  rateTypeKey: string;
  price: number;
};

export type DraftOfferRate = {
  rateTypeKey: string;
  price: number;
};

export type DraftOffer = {
  key: string;
  id?: string;
  isPass: boolean;
  performanceKeys: string[];
  seatCategoryKey: string;
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
  offers: DraftOffer[];
};

export type WizardDraft = {
  eventId?: string;
  name: string;
  description: string;
  venueName: string;
  performances: DraftPerformance[];
  seatCategories: DraftSeatCategory[];
  rateTypes: DraftRateType[];
  inventory: DraftInventoryCell[];
  standardPrices: DraftPriceCell[];
  saleWindows: DraftSaleWindow[];
};

export type WizardDraftAction =
  | { type: "SET_BASIC_INFO"; name: string; description: string }
  | { type: "SET_EVENT_ID"; eventId: string }
  | { type: "SET_VENUE_NAME"; venueName: string }
  | { type: "ADD_PERFORMANCE" }
  | { type: "UPDATE_PERFORMANCE"; key: string; patch: Partial<DraftPerformance> }
  | { type: "REMOVE_PERFORMANCE"; key: string }
  | { type: "MARK_PERFORMANCE_SAVED"; key: string; id: string }
  | { type: "ADD_SEAT_CATEGORY" }
  | { type: "UPDATE_SEAT_CATEGORY"; key: string; patch: Partial<DraftSeatCategory> }
  | { type: "REMOVE_SEAT_CATEGORY"; key: string }
  | { type: "MARK_SEAT_CATEGORY_SAVED"; key: string; id: string }
  | {
      type: "SET_INVENTORY_CELL";
      performanceKey: string;
      seatCategoryKey: string;
      capacity: number;
    }
  | {
      type: "MARK_INVENTORY_SAVED";
      performanceKey: string;
      seatCategoryKey: string;
      capacity: number;
    }
  | { type: "ADD_RATE_TYPE" }
  | { type: "UPDATE_RATE_TYPE"; key: string; patch: Partial<DraftRateType> }
  | { type: "REMOVE_RATE_TYPE"; key: string }
  | { type: "MARK_RATE_TYPE_SAVED"; key: string; id: string }
  | { type: "SET_PRICE_CELL"; seatCategoryKey: string; rateTypeKey: string; price: number }
  | { type: "ADD_SALE_WINDOW" }
  | { type: "UPDATE_SALE_WINDOW"; key: string; patch: Partial<DraftSaleWindow> }
  | { type: "REMOVE_SALE_WINDOW"; key: string }
  | { type: "MARK_SALE_WINDOW_SAVED"; key: string; id: string }
  | { type: "ADD_OFFER"; saleWindowKey: string; offer: DraftOffer }
  | { type: "UPDATE_OFFER"; saleWindowKey: string; key: string; patch: Partial<DraftOffer> }
  | { type: "REMOVE_OFFER"; saleWindowKey: string; key: string }
  | { type: "MARK_OFFER_SAVED"; saleWindowKey: string; key: string; id: string }
  | { type: "HYDRATE"; draft: WizardDraft };

// 削除した公演を対象公演から除外する。対象公演が0件になったofferは(通し券が全対象公演を失うため)削除する。
function removeOffersReferencingPerformance(
  saleWindows: DraftSaleWindow[],
  performanceKey: string,
): DraftSaleWindow[] {
  return saleWindows.map((saleWindow) => ({
    ...saleWindow,
    offers: saleWindow.offers
      .map((offer) => ({
        ...offer,
        performanceKeys: offer.performanceKeys.filter((key) => key !== performanceKey),
      }))
      .filter((offer) => offer.performanceKeys.length > 0),
  }));
}

export function wizardDraftReducer(draft: WizardDraft, action: WizardDraftAction): WizardDraft {
  switch (action.type) {
    case "SET_BASIC_INFO":
      return { ...draft, name: action.name, description: action.description };
    case "SET_EVENT_ID":
      return { ...draft, eventId: action.eventId };
    case "SET_VENUE_NAME":
      return { ...draft, venueName: action.venueName };
    case "ADD_PERFORMANCE":
      return {
        ...draft,
        performances: [
          ...draft.performances,
          { key: crypto.randomUUID(), name: "", doorsOpenAt: "", startsAt: "" },
        ],
      };
    case "UPDATE_PERFORMANCE":
      return {
        ...draft,
        performances: draft.performances.map((performance) =>
          performance.key === action.key ? { ...performance, ...action.patch } : performance,
        ),
      };
    case "REMOVE_PERFORMANCE":
      return {
        ...draft,
        performances: draft.performances.filter((performance) => performance.key !== action.key),
        inventory: draft.inventory.filter((cell) => cell.performanceKey !== action.key),
        // 削除した公演を参照するofferは対象公演から除外し、対象公演が0件になるofferごと削除する。
        // (通し券が全対象公演を失って不整合な状態のまま残ることを防ぐ)
        saleWindows: removeOffersReferencingPerformance(draft.saleWindows, action.key),
      };
    case "MARK_PERFORMANCE_SAVED":
      return {
        ...draft,
        performances: draft.performances.map((performance) =>
          performance.key === action.key ? { ...performance, id: action.id } : performance,
        ),
      };
    case "ADD_SEAT_CATEGORY":
      return {
        ...draft,
        seatCategories: [
          ...draft.seatCategories,
          { key: crypto.randomUUID(), name: "", active: true },
        ],
      };
    case "UPDATE_SEAT_CATEGORY":
      return {
        ...draft,
        seatCategories: draft.seatCategories.map((seatCategory) =>
          seatCategory.key === action.key ? { ...seatCategory, ...action.patch } : seatCategory,
        ),
      };
    case "REMOVE_SEAT_CATEGORY":
      return {
        ...draft,
        seatCategories: draft.seatCategories.filter(
          (seatCategory) => seatCategory.key !== action.key,
        ),
        inventory: draft.inventory.filter((cell) => cell.seatCategoryKey !== action.key),
        standardPrices: draft.standardPrices.filter((cell) => cell.seatCategoryKey !== action.key),
        // offerは単一の席種に紐づくため、削除した席種を参照するofferは丸ごと削除する。
        saleWindows: draft.saleWindows.map((saleWindow) => ({
          ...saleWindow,
          offers: saleWindow.offers.filter((offer) => offer.seatCategoryKey !== action.key),
        })),
      };
    case "MARK_SEAT_CATEGORY_SAVED":
      return {
        ...draft,
        seatCategories: draft.seatCategories.map((seatCategory) =>
          seatCategory.key === action.key ? { ...seatCategory, id: action.id } : seatCategory,
        ),
      };
    case "SET_INVENTORY_CELL": {
      const exists = draft.inventory.some(
        (cell) =>
          cell.performanceKey === action.performanceKey &&
          cell.seatCategoryKey === action.seatCategoryKey,
      );

      return {
        ...draft,
        inventory: exists
          ? draft.inventory.map((cell) =>
              cell.performanceKey === action.performanceKey &&
              cell.seatCategoryKey === action.seatCategoryKey
                ? { ...cell, capacity: action.capacity }
                : cell,
            )
          : [
              ...draft.inventory,
              {
                performanceKey: action.performanceKey,
                seatCategoryKey: action.seatCategoryKey,
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
          cell.performanceKey === action.performanceKey &&
          cell.seatCategoryKey === action.seatCategoryKey
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
        standardPrices: draft.standardPrices.filter((cell) => cell.rateTypeKey !== action.key),
      };
    case "MARK_RATE_TYPE_SAVED":
      return {
        ...draft,
        rateTypes: draft.rateTypes.map((rateType) =>
          rateType.key === action.key ? { ...rateType, id: action.id } : rateType,
        ),
      };
    case "SET_PRICE_CELL": {
      const exists = draft.standardPrices.some(
        (cell) =>
          cell.seatCategoryKey === action.seatCategoryKey &&
          cell.rateTypeKey === action.rateTypeKey,
      );

      return {
        ...draft,
        standardPrices: exists
          ? draft.standardPrices.map((cell) =>
              cell.seatCategoryKey === action.seatCategoryKey &&
              cell.rateTypeKey === action.rateTypeKey
                ? { ...cell, price: action.price }
                : cell,
            )
          : [
              ...draft.standardPrices,
              {
                seatCategoryKey: action.seatCategoryKey,
                rateTypeKey: action.rateTypeKey,
                price: action.price,
              },
            ],
      };
    }
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

export function buildEmptyDraft(): WizardDraft {
  return {
    name: "",
    description: "",
    venueName: "",
    performances: [],
    seatCategories: [],
    rateTypes: [],
    inventory: [],
    standardPrices: [],
    saleWindows: [],
  };
}

export function buildDraftFromEvent(event: GetEventOutput): WizardDraft {
  // 編集モードでは公演・席種・料金種別の実IDをそのままローカルkeyとして使う(既に確定しているため)。
  return {
    eventId: event.id,
    name: event.name,
    description: event.description,
    venueName: event.performances[0]?.venueName ?? "",
    performances: event.performances.map((performance) => ({
      key: performance.id,
      id: performance.id,
      name: performance.name,
      doorsOpenAt: toDateTimeLocalValue(performance.doorsOpenAt),
      startsAt: toDateTimeLocalValue(performance.startsAt),
    })),
    seatCategories: event.seatCategories.map((seatCategory) => ({
      key: seatCategory.id,
      id: seatCategory.id,
      name: seatCategory.name,
      active: seatCategory.active,
    })),
    rateTypes: event.rateTypes.map((rateType) => ({
      key: rateType.id,
      id: rateType.id,
      name: rateType.name,
    })),
    inventory: event.inventoryPools.map((pool) => ({
      performanceKey: pool.performanceId,
      seatCategoryKey: pool.seatCategoryId,
      capacity: pool.capacity,
      savedCapacity: pool.capacity,
    })),
    standardPrices: [],
    saleWindows: event.saleWindows.map((saleWindow) => ({
      key: saleWindow.id,
      id: saleWindow.id,
      name: saleWindow.name,
      method: saleWindow.saleMethod,
      publishesAt: saleWindow.publishesAt ? toDateTimeLocalValue(saleWindow.publishesAt) : "",
      applicationStartsAt: toDateTimeLocalValue(saleWindow.opensAt),
      applicationEndsAt: toDateTimeLocalValue(saleWindow.closesAt),
      lotteryMode: saleWindow.lotteryMode,
      notifyLotteryResultAt: saleWindow.notifyLotteryResultAt
        ? toDateTimeLocalValue(saleWindow.notifyLotteryResultAt)
        : "",
      isSmsAuthRequired: saleWindow.isSmsAuthRequired,
      canceledAt: saleWindow.canceledAt,
      offers: saleWindow.offers.map((offer) => ({
        key: offer.id,
        id: offer.id,
        isPass: offer.entitlements.length > 1,
        performanceKeys: offer.entitlements.map((entitlement) => entitlement.performanceId),
        seatCategoryKey: offer.entitlements[0]?.seatCategoryId ?? "",
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
