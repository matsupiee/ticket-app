import { useReducer } from "react";

import type { GetEventOutput } from "@ticket-app/api/routers/organizer/event/get/route";

import { client } from "@/lib/orpc";

import {
  buildDraftFromEvent,
  buildEmptyDraft,
  wizardDraftReducer,
  type DraftOffer,
  type WizardDraft,
} from "./event-wizard-draft-reducer";

export function useEventWizardDraft(input: {
  mode: "create" | "edit";
  eventOrganizerId: string;
  initialEvent?: GetEventOutput;
}) {
  const [draft, dispatch] = useReducer(wizardDraftReducer, undefined, () =>
    input.initialEvent ? buildDraftFromEvent(input.initialEvent) : buildEmptyDraft(),
  );

  async function saveBasicInfo() {
    if (draft.eventId) {
      await client.organizer.event.update({
        eventOrganizerId: input.eventOrganizerId,
        eventId: draft.eventId,
        name: draft.name,
        description: draft.description,
      });
      return draft.eventId;
    }

    const created = await client.organizer.event.create({
      eventOrganizerId: input.eventOrganizerId,
      name: draft.name,
      description: draft.description,
    });
    dispatch({ type: "SET_EVENT_ID", eventId: created.id });
    return created.id;
  }

  // 戻り値の Map は、この保存呼び出し内で確定したIDを持つ。
  // React の dispatch は非同期に反映されるため、同一 saveStep 呼び出し内で後続の保存処理が
  // 直後にIDを必要とする場合は、draft を読み直すのではなくこの戻り値を使う。
  async function savePerformances(eventId: string) {
    const idByKey = new Map<string, string>();

    for (const performance of draft.performances) {
      const result = await client.organizer.event.upsertPerformance({
        eventOrganizerId: input.eventOrganizerId,
        eventId,
        performanceId: performance.id,
        name: performance.name,
        venueName: performance.venueName,
        doorsOpenAt: performance.doorsOpenAt,
        startsAt: performance.startsAt,
        admissionMethod: "NUMBERED_ENTRY",
      });
      idByKey.set(performance.key, result.id);
      if (!performance.id) {
        dispatch({ type: "MARK_PERFORMANCE_SAVED", key: performance.key, id: result.id });
      }
    }

    return idByKey;
  }

  async function saveSeatCategories(eventId: string) {
    const idByKey = new Map<string, string>();

    for (const [index, seatCategory] of draft.seatCategories.entries()) {
      const result = await client.organizer.event.upsertSeatCategory({
        eventOrganizerId: input.eventOrganizerId,
        eventId,
        seatCategoryId: seatCategory.id,
        name: seatCategory.name,
        description: "",
        active: seatCategory.active,
        displayOrder: index,
      });
      idByKey.set(seatCategory.key, result.id);
      if (!seatCategory.id) {
        dispatch({ type: "MARK_SEAT_CATEGORY_SAVED", key: seatCategory.key, id: result.id });
      }
    }

    return idByKey;
  }

  async function saveInventory(
    eventId: string,
    performanceIdByKey: Map<string, string>,
    seatCategoryIdByKey: Map<string, string>,
  ) {
    for (const cell of draft.inventory) {
      const performanceId = performanceIdByKey.get(cell.performanceKey);
      const seatCategoryId = seatCategoryIdByKey.get(cell.seatCategoryKey);
      const delta = cell.capacity - cell.savedCapacity;

      if (!performanceId || !seatCategoryId || delta === 0) {
        continue;
      }

      await client.organizer.event.adjustInventory({
        eventOrganizerId: input.eventOrganizerId,
        eventId,
        performanceId,
        seatCategoryId,
        admissionMethod: "NUMBERED_ENTRY",
        seatAllocationMethod: "IMMEDIATE",
        capacityDelta: delta,
        reason: "ウィザードでの在庫設定",
      });
      dispatch({
        type: "MARK_INVENTORY_SAVED",
        performanceKey: cell.performanceKey,
        seatCategoryKey: cell.seatCategoryKey,
        capacity: cell.capacity,
      });
    }
  }

  async function saveRateTypes(eventId: string) {
    const idByKey = new Map<string, string>();

    for (const [index, rateType] of draft.rateTypes.entries()) {
      const result = await client.organizer.event.upsertRateType({
        eventOrganizerId: input.eventOrganizerId,
        eventId,
        rateTypeId: rateType.id,
        name: rateType.name,
        displayOrder: index,
      });
      idByKey.set(rateType.key, result.id);
      if (!rateType.id) {
        dispatch({ type: "MARK_RATE_TYPE_SAVED", key: rateType.key, id: result.id });
      }
    }

    return idByKey;
  }

  async function saveSaleWindows(
    eventId: string,
    performanceIdByKey: Map<string, string>,
    seatCategoryIdByKey: Map<string, string>,
    rateTypeIdByKey: Map<string, string>,
  ) {
    for (const saleWindow of draft.saleWindows) {
      if (saleWindow.canceledAt) {
        continue;
      }

      const savedWindow = await client.organizer.event.upsertSaleWindow({
        eventOrganizerId: input.eventOrganizerId,
        eventId,
        saleWindowId: saleWindow.id,
        name: saleWindow.name,
        publishesAt: saleWindow.publishesAt || undefined,
        applicationStartsAt: saleWindow.applicationStartsAt,
        applicationEndsAt: saleWindow.applicationEndsAt,
        isSmsAuthRequired: saleWindow.isSmsAuthRequired,
        method: saleWindow.method,
        lotteryMode: saleWindow.lotteryMode,
        notifyLotteryResultAt:
          saleWindow.method === "LOTTERY"
            ? saleWindow.notifyLotteryResultAt || undefined
            : undefined,
      });
      if (!saleWindow.id) {
        dispatch({ type: "MARK_SALE_WINDOW_SAVED", key: saleWindow.key, id: savedWindow.id });
      }

      for (const [index, offer] of saleWindow.offers.entries()) {
        const performanceIds = offer.performanceKeys
          .map((key) => performanceIdByKey.get(key))
          .filter((id): id is string => Boolean(id));
        const seatCategoryId = seatCategoryIdByKey.get(offer.seatCategoryKey);

        if (performanceIds.length === 0 || !seatCategoryId) {
          continue;
        }

        const savedOffer = await client.organizer.event.upsertSaleOffer({
          eventOrganizerId: input.eventOrganizerId,
          eventId,
          saleWindowId: savedWindow.id,
          saleOfferId: offer.id,
          name: buildOfferName({
            offer,
            seatCategoryName: findSeatCategoryName(draft, offer.seatCategoryKey),
          }),
          description: "",
          maxQuantityPerOrder: offer.maxQuantityPerOrder,
          displayOrder: index,
          rates: offer.rates
            .map((rate) => ({
              rateTypeId: rateTypeIdByKey.get(rate.rateTypeKey),
              price: rate.price,
            }))
            .filter((rate): rate is { rateTypeId: string; price: number } =>
              Boolean(rate.rateTypeId),
            )
            .map((rate) => ({
              rateTypeId: rate.rateTypeId,
              price: rate.price,
              currency: "JPY",
              minQuantity: 1,
              maxQuantity: offer.maxQuantityPerOrder,
              quantityStep: 1,
              displayOrder: 0,
            })),
          entitlements: performanceIds.map((performanceId) => ({ performanceId, seatCategoryId })),
        });
        if (!offer.id) {
          dispatch({
            type: "MARK_OFFER_SAVED",
            saleWindowKey: saleWindow.key,
            key: offer.key,
            id: savedOffer.id,
          });
        }
      }
    }
  }

  function existingIdMap<T extends { key: string; id?: string }>(items: T[]) {
    const map = new Map<string, string>();
    for (const item of items) {
      if (item.id) {
        map.set(item.key, item.id);
      }
    }
    return map;
  }

  async function saveStep(step: number) {
    const eventId = step === 1 ? await saveBasicInfo() : draft.eventId;

    if (!eventId) {
      throw new Error("イベントの基本情報が未保存です");
    }

    if (step === 2) {
      await savePerformances(eventId);
    } else if (step === 3) {
      const seatCategoryIdByKey = await saveSeatCategories(eventId);
      await saveInventory(eventId, existingIdMap(draft.performances), seatCategoryIdByKey);
    } else if (step === 4) {
      await saveRateTypes(eventId);
    } else if (step === 5) {
      await saveSaleWindows(
        eventId,
        existingIdMap(draft.performances),
        existingIdMap(draft.seatCategories),
        existingIdMap(draft.rateTypes),
      );
    }

    return eventId;
  }

  return { draft, dispatch, saveStep };
}

function findSeatCategoryName(draft: WizardDraft, seatCategoryKey: string) {
  return (
    draft.seatCategories.find((seatCategory) => seatCategory.key === seatCategoryKey)?.name ?? ""
  );
}

function buildOfferName(input: { offer: DraftOffer; seatCategoryName: string }) {
  return input.offer.isPass ? `通し券 ${input.seatCategoryName}` : input.seatCategoryName;
}
