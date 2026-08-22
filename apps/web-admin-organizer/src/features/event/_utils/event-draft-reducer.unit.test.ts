import { afterEach, describe, expect, it, vi } from "vitest";

import type { EventGetOutput } from "@ticket-app/api/routers/organizer/event/get/route";

import {
  buildDraftFromEvent,
  buildEmptyDraft,
  eventDraftReducer,
  type EventDraft,
} from "./event-draft-reducer";

describe("eventDraftReducer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ADD_STAGEでデフォルト日程入りの公演を追加し、一意なkeyを振る", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 21, 10, 0));
    const draft = buildEmptyDraft();

    const next = eventDraftReducer(draft, { type: "ADD_STAGE" });
    const nextNext = eventDraftReducer(next, { type: "ADD_STAGE" });

    expect(nextNext.stages).toHaveLength(2);
    expect(nextNext.stages[0]?.key).not.toBe(nextNext.stages[1]?.key);
    expect(nextNext.stages[0]).toMatchObject({
      name: "",
      venueName: "",
      stageDate: "2026-07-28",
      doorsOpenAt: "2026-07-28T18:00",
      startsAt: "2026-07-28T18:00",
    });
  });

  it("UPDATE_STAGEは指定したkeyの公演だけを更新する", () => {
    const draft = withTwoStages();

    const next = eventDraftReducer(draft, {
      type: "UPDATE_STAGE",
      key: "perf-1",
      patch: { name: "DAY 1" },
    });

    expect(next.stages.find((p) => p.key === "perf-1")?.name).toBe("DAY 1");
    expect(next.stages.find((p) => p.key === "perf-2")?.name).toBe("");
  });

  it("REMOVE_STAGEは公演と、その公演に紐づく在庫セルの両方を削除する", () => {
    const draft: EventDraft = {
      ...withTwoStages(),
      inventoryCategories: [{ key: "seat-1", name: "S席" }],
      inventory: [
        { stageKey: "perf-1", inventoryCategoryKey: "seat-1", capacity: 10, savedCapacity: 0 },
        { stageKey: "perf-2", inventoryCategoryKey: "seat-1", capacity: 20, savedCapacity: 0 },
      ],
    };

    const next = eventDraftReducer(draft, { type: "REMOVE_STAGE", key: "perf-1" });

    expect(next.stages.map((p) => p.key)).toEqual(["perf-2"]);
    expect(next.inventory).toEqual([
      { stageKey: "perf-2", inventoryCategoryKey: "seat-1", capacity: 20, savedCapacity: 0 },
    ]);
  });

  it("SET_INVENTORY_CELLは存在しないセルを新規作成し、既存セルは値だけ更新する", () => {
    const draft = buildEmptyDraft();

    const created = eventDraftReducer(draft, {
      type: "SET_INVENTORY_CELL",
      stageKey: "perf-1",
      inventoryCategoryKey: "seat-1",
      capacity: 30,
    });
    expect(created.inventory).toEqual([
      { stageKey: "perf-1", inventoryCategoryKey: "seat-1", capacity: 30, savedCapacity: 0 },
    ]);

    const updated = eventDraftReducer(created, {
      type: "SET_INVENTORY_CELL",
      stageKey: "perf-1",
      inventoryCategoryKey: "seat-1",
      capacity: 45,
    });
    expect(updated.inventory).toEqual([
      { stageKey: "perf-1", inventoryCategoryKey: "seat-1", capacity: 45, savedCapacity: 0 },
    ]);
  });

  it("MARK_INVENTORY_SAVEDはcapacityとsavedCapacityを一致させる", () => {
    const draft: EventDraft = {
      ...buildEmptyDraft(),
      inventory: [
        { stageKey: "perf-1", inventoryCategoryKey: "seat-1", capacity: 50, savedCapacity: 20 },
      ],
    };

    const next = eventDraftReducer(draft, {
      type: "MARK_INVENTORY_SAVED",
      stageKey: "perf-1",
      inventoryCategoryKey: "seat-1",
      capacity: 50,
    });

    expect(next.inventory[0]).toEqual({
      stageKey: "perf-1",
      inventoryCategoryKey: "seat-1",
      capacity: 50,
      savedCapacity: 50,
    });
  });

  it("REMOVE_INVENTORY_CATEGORYは席種と、それに紐づく在庫セルも削除する", () => {
    const draft: EventDraft = {
      ...buildEmptyDraft(),
      inventoryCategories: [
        { key: "seat-1", name: "S席" },
        { key: "seat-2", name: "A席" },
      ],
      rateTypes: [{ key: "rate-1", name: "大人" }],
      inventory: [
        { stageKey: "perf-1", inventoryCategoryKey: "seat-1", capacity: 10, savedCapacity: 0 },
        { stageKey: "perf-1", inventoryCategoryKey: "seat-2", capacity: 20, savedCapacity: 0 },
      ],
    };

    const next = eventDraftReducer(draft, { type: "REMOVE_INVENTORY_CATEGORY", key: "seat-1" });

    expect(next.inventoryCategories.map((s) => s.key)).toEqual(["seat-2"]);
    expect(next.inventory.map((cell) => cell.inventoryCategoryKey)).toEqual(["seat-2"]);
  });

  it("ADD_OFFER/UPDATE_OFFER/REMOVE_OFFERは指定した販売受付配下のofferだけを操作する", () => {
    const draft: EventDraft = {
      ...buildEmptyDraft(),
      saleWindows: [buildSaleWindow("sw-1"), buildSaleWindow("sw-2")],
    };

    const offer = {
      key: "offer-1",
      isPass: false,
      stageKeys: ["perf-1"],
      inventoryCategoryKey: "seat-1",
      maxQuantityPerOrder: 4,
      rates: [],
    };

    const added = eventDraftReducer(draft, { type: "ADD_OFFER", saleWindowKey: "sw-1", offer });
    expect(added.saleWindows.find((w) => w.key === "sw-1")?.offers).toHaveLength(1);
    expect(added.saleWindows.find((w) => w.key === "sw-2")?.offers).toHaveLength(0);

    const updated = eventDraftReducer(added, {
      type: "UPDATE_OFFER",
      saleWindowKey: "sw-1",
      key: "offer-1",
      patch: { maxQuantityPerOrder: 2 },
    });
    expect(updated.saleWindows.find((w) => w.key === "sw-1")?.offers[0]?.maxQuantityPerOrder).toBe(
      2,
    );

    const removed = eventDraftReducer(updated, {
      type: "REMOVE_OFFER",
      saleWindowKey: "sw-1",
      key: "offer-1",
    });
    expect(removed.saleWindows.find((w) => w.key === "sw-1")?.offers).toHaveLength(0);
  });

  it("REMOVE_STAGEは、その公演だけを対象にしていたofferを削除し、通し券からは対象公演を外すだけにする", () => {
    const draft: EventDraft = {
      ...withTwoStages(),
      saleWindows: [
        {
          ...buildSaleWindow("sw-1"),
          offers: [
            {
              key: "offer-single",
              isPass: false,
              stageKeys: ["perf-1"],
              inventoryCategoryKey: "seat-1",
              maxQuantityPerOrder: 4,
              rates: [],
            },
            {
              key: "offer-pass",
              isPass: true,
              stageKeys: ["perf-1", "perf-2"],
              inventoryCategoryKey: "seat-1",
              maxQuantityPerOrder: 2,
              rates: [],
            },
          ],
        },
      ],
    };

    const next = eventDraftReducer(draft, { type: "REMOVE_STAGE", key: "perf-1" });

    const offers = next.saleWindows[0]?.offers ?? [];
    expect(offers.map((offer) => offer.key)).toEqual(["offer-pass"]);
    expect(offers[0]?.stageKeys).toEqual(["perf-2"]);
  });

  it("REMOVE_INVENTORY_CATEGORYは、その席種を対象にしていたofferを丸ごと削除する", () => {
    const draft: EventDraft = {
      ...buildEmptyDraft(),
      inventoryCategories: [{ key: "seat-1", name: "S席" }],
      saleWindows: [
        {
          ...buildSaleWindow("sw-1"),
          offers: [
            {
              key: "offer-1",
              isPass: false,
              stageKeys: ["perf-1"],
              inventoryCategoryKey: "seat-1",
              maxQuantityPerOrder: 4,
              rates: [],
            },
          ],
        },
      ],
    };

    const next = eventDraftReducer(draft, { type: "REMOVE_INVENTORY_CATEGORY", key: "seat-1" });

    expect(next.saleWindows[0]?.offers).toEqual([]);
  });

  it("ADD_SALE_WINDOWはpublishesAtを空欄にせず現在時刻で初期化する(意図せぬ即時一般公開を防ぐ)", () => {
    const draft = buildEmptyDraft();

    const next = eventDraftReducer(draft, { type: "ADD_SALE_WINDOW" });

    expect(next.saleWindows[0]?.publishesAt).not.toBe("");
    expect(next.saleWindows[0]?.publishesAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("MARK_STAGE_SAVED/MARK_INVENTORY_CATEGORY_SAVED/MARK_RATE_TYPE_SAVEDは、対象のkeyだけにサーバーIDを設定する", () => {
    const draft: EventDraft = {
      ...withTwoStages(),
      inventoryCategories: [
        { key: "seat-1", name: "S席" },
        { key: "seat-2", name: "A席" },
      ],
      rateTypes: [
        { key: "rate-1", name: "大人" },
        { key: "rate-2", name: "子供" },
      ],
    };

    const afterStage = eventDraftReducer(draft, {
      type: "MARK_STAGE_SAVED",
      key: "perf-1",
      id: "stage-server-id",
    });
    expect(afterStage.stages.find((p) => p.key === "perf-1")?.id).toBe("stage-server-id");
    expect(afterStage.stages.find((p) => p.key === "perf-2")?.id).toBeUndefined();

    const afterInventoryCategory = eventDraftReducer(draft, {
      type: "MARK_INVENTORY_CATEGORY_SAVED",
      key: "seat-1",
      id: "inventory-category-server-id",
    });
    expect(afterInventoryCategory.inventoryCategories.find((s) => s.key === "seat-1")?.id).toBe(
      "inventory-category-server-id",
    );
    expect(
      afterInventoryCategory.inventoryCategories.find((s) => s.key === "seat-2")?.id,
    ).toBeUndefined();

    const afterRateType = eventDraftReducer(draft, {
      type: "MARK_RATE_TYPE_SAVED",
      key: "rate-1",
      id: "rate-type-server-id",
    });
    expect(afterRateType.rateTypes.find((r) => r.key === "rate-1")?.id).toBe("rate-type-server-id");
    expect(afterRateType.rateTypes.find((r) => r.key === "rate-2")?.id).toBeUndefined();
  });

  it("MARK_SALE_WINDOW_SAVED/MARK_OFFER_SAVEDは、対象の販売受付・offerだけにサーバーIDを設定する", () => {
    const draft: EventDraft = {
      ...buildEmptyDraft(),
      saleWindows: [
        {
          ...buildSaleWindow("sw-1"),
          offers: [
            {
              key: "offer-1",
              isPass: false,
              stageKeys: ["perf-1"],
              inventoryCategoryKey: "seat-1",
              maxQuantityPerOrder: 4,
              rates: [],
            },
          ],
        },
        buildSaleWindow("sw-2"),
      ],
    };

    const afterSaleWindow = eventDraftReducer(draft, {
      type: "MARK_SALE_WINDOW_SAVED",
      key: "sw-1",
      id: "sale-window-server-id",
    });
    expect(afterSaleWindow.saleWindows.find((w) => w.key === "sw-1")?.id).toBe(
      "sale-window-server-id",
    );
    expect(afterSaleWindow.saleWindows.find((w) => w.key === "sw-2")?.id).toBeUndefined();

    const afterOffer = eventDraftReducer(draft, {
      type: "MARK_OFFER_SAVED",
      saleWindowKey: "sw-1",
      key: "offer-1",
      id: "offer-server-id",
    });
    expect(afterOffer.saleWindows.find((w) => w.key === "sw-1")?.offers[0]?.id).toBe(
      "offer-server-id",
    );
  });

  it("HYDRATEはドラフト全体を渡された内容に置き換える", () => {
    const draft = buildEmptyDraft();
    const hydrated: EventDraft = {
      ...buildEmptyDraft(),
      eventId: "event-1",
      name: "既存イベント",
    };

    const next = eventDraftReducer(draft, { type: "HYDRATE", draft: hydrated });

    expect(next).toEqual(hydrated);
  });

  it("buildDraftFromEventは日またぎ公演を開場日の月日と時刻に復元する", () => {
    const draft = buildDraftFromEvent({
      ...buildMinimalEvent(),
      stages: [
        {
          id: "stage-overnight",
          name: "深夜公演",
          venueName: "有明アリーナ",
          venueId: "venue-1",
          doorsOpenAt: localIso(2026, 9, 12, 23, 30),
          startsAt: localIso(2026, 9, 13, 0, 0),
        },
      ],
    });

    expect(draft.stages[0]).toMatchObject({
      venueName: "有明アリーナ",
      stageDate: "2026-09-12",
      doorsOpenAt: "2026-09-12T23:30",
      startsAt: "2026-09-13T00:00",
    });
  });
});

function withTwoStages(): EventDraft {
  return {
    ...buildEmptyDraft(),
    stages: [
      {
        key: "perf-1",
        name: "",
        venueName: "",
        stageDate: "",
        doorsOpenAt: "",
        startsAt: "",
      },
      {
        key: "perf-2",
        name: "",
        venueName: "",
        stageDate: "",
        doorsOpenAt: "",
        startsAt: "",
      },
    ],
  };
}

function buildSaleWindow(key: string) {
  return {
    key,
    name: "",
    method: "FIRST_COME" as const,
    publishesAt: "",
    applicationStartsAt: "",
    applicationEndsAt: "",
    lotteryMode: "AUTO" as const,
    notifyLotteryResultAt: "",
    isSmsAuthRequired: false,
    offers: [],
  };
}

function buildMinimalEvent(): EventGetOutput {
  return {
    id: "event-1",
    name: "既存イベント",
    description: "既存イベントの説明",
    publishesAt: null,
    closesAt: null,
    inventoryCategories: [],
    rateTypes: [],
    inventoryPools: [],
    stages: [],
    saleWindows: [],
    sales: {
      grossSales: 0,
      ticketsSold: 0,
    },
  };
}

function localIso(year: number, month: number, day: number, hours: number, minutes: number) {
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}
