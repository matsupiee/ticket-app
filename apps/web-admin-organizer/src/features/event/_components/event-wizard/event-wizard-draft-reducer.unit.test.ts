import { describe, expect, it } from "vitest";

import {
  buildEmptyDraft,
  wizardDraftReducer,
  type WizardDraft,
} from "./event-wizard-draft-reducer";

describe("wizardDraftReducer", () => {
  it("ADD_PERFORMANCEで空の公演を追加し、一意なkeyを振る", () => {
    const draft = buildEmptyDraft();

    const next = wizardDraftReducer(draft, { type: "ADD_PERFORMANCE" });
    const nextNext = wizardDraftReducer(next, { type: "ADD_PERFORMANCE" });

    expect(nextNext.performances).toHaveLength(2);
    expect(nextNext.performances[0]?.key).not.toBe(nextNext.performances[1]?.key);
    expect(nextNext.performances[0]).toMatchObject({ name: "", doorsOpenAt: "", startsAt: "" });
  });

  it("UPDATE_PERFORMANCEは指定したkeyの公演だけを更新する", () => {
    const draft = withTwoPerformances();

    const next = wizardDraftReducer(draft, {
      type: "UPDATE_PERFORMANCE",
      key: "perf-1",
      patch: { name: "DAY 1" },
    });

    expect(next.performances.find((p) => p.key === "perf-1")?.name).toBe("DAY 1");
    expect(next.performances.find((p) => p.key === "perf-2")?.name).toBe("");
  });

  it("REMOVE_PERFORMANCEは公演と、その公演に紐づく在庫セルの両方を削除する", () => {
    const draft: WizardDraft = {
      ...withTwoPerformances(),
      seatCategories: [{ key: "seat-1", name: "S席", active: true }],
      inventory: [
        { performanceKey: "perf-1", seatCategoryKey: "seat-1", capacity: 10, savedCapacity: 0 },
        { performanceKey: "perf-2", seatCategoryKey: "seat-1", capacity: 20, savedCapacity: 0 },
      ],
    };

    const next = wizardDraftReducer(draft, { type: "REMOVE_PERFORMANCE", key: "perf-1" });

    expect(next.performances.map((p) => p.key)).toEqual(["perf-2"]);
    expect(next.inventory).toEqual([
      { performanceKey: "perf-2", seatCategoryKey: "seat-1", capacity: 20, savedCapacity: 0 },
    ]);
  });

  it("SET_INVENTORY_CELLは存在しないセルを新規作成し、既存セルは値だけ更新する", () => {
    const draft = buildEmptyDraft();

    const created = wizardDraftReducer(draft, {
      type: "SET_INVENTORY_CELL",
      performanceKey: "perf-1",
      seatCategoryKey: "seat-1",
      capacity: 30,
    });
    expect(created.inventory).toEqual([
      { performanceKey: "perf-1", seatCategoryKey: "seat-1", capacity: 30, savedCapacity: 0 },
    ]);

    const updated = wizardDraftReducer(created, {
      type: "SET_INVENTORY_CELL",
      performanceKey: "perf-1",
      seatCategoryKey: "seat-1",
      capacity: 45,
    });
    expect(updated.inventory).toEqual([
      { performanceKey: "perf-1", seatCategoryKey: "seat-1", capacity: 45, savedCapacity: 0 },
    ]);
  });

  it("MARK_INVENTORY_SAVEDはcapacityとsavedCapacityを一致させる", () => {
    const draft: WizardDraft = {
      ...buildEmptyDraft(),
      inventory: [
        { performanceKey: "perf-1", seatCategoryKey: "seat-1", capacity: 50, savedCapacity: 20 },
      ],
    };

    const next = wizardDraftReducer(draft, {
      type: "MARK_INVENTORY_SAVED",
      performanceKey: "perf-1",
      seatCategoryKey: "seat-1",
      capacity: 50,
    });

    expect(next.inventory[0]).toEqual({
      performanceKey: "perf-1",
      seatCategoryKey: "seat-1",
      capacity: 50,
      savedCapacity: 50,
    });
  });

  it("REMOVE_SEAT_CATEGORYは席種と、それに紐づく在庫・標準価格セルも削除する", () => {
    const draft: WizardDraft = {
      ...buildEmptyDraft(),
      seatCategories: [
        { key: "seat-1", name: "S席", active: true },
        { key: "seat-2", name: "A席", active: true },
      ],
      rateTypes: [{ key: "rate-1", name: "大人" }],
      inventory: [
        { performanceKey: "perf-1", seatCategoryKey: "seat-1", capacity: 10, savedCapacity: 0 },
        { performanceKey: "perf-1", seatCategoryKey: "seat-2", capacity: 20, savedCapacity: 0 },
      ],
      standardPrices: [
        { seatCategoryKey: "seat-1", rateTypeKey: "rate-1", price: 1000 },
        { seatCategoryKey: "seat-2", rateTypeKey: "rate-1", price: 2000 },
      ],
    };

    const next = wizardDraftReducer(draft, { type: "REMOVE_SEAT_CATEGORY", key: "seat-1" });

    expect(next.seatCategories.map((s) => s.key)).toEqual(["seat-2"]);
    expect(next.inventory.map((cell) => cell.seatCategoryKey)).toEqual(["seat-2"]);
    expect(next.standardPrices.map((cell) => cell.seatCategoryKey)).toEqual(["seat-2"]);
  });

  it("ADD_OFFER/UPDATE_OFFER/REMOVE_OFFERは指定した販売受付配下のofferだけを操作する", () => {
    const draft: WizardDraft = {
      ...buildEmptyDraft(),
      saleWindows: [buildSaleWindow("sw-1"), buildSaleWindow("sw-2")],
    };

    const offer = {
      key: "offer-1",
      isPass: false,
      performanceKeys: ["perf-1"],
      seatCategoryKey: "seat-1",
      maxQuantityPerOrder: 4,
      rates: [],
    };

    const added = wizardDraftReducer(draft, { type: "ADD_OFFER", saleWindowKey: "sw-1", offer });
    expect(added.saleWindows.find((w) => w.key === "sw-1")?.offers).toHaveLength(1);
    expect(added.saleWindows.find((w) => w.key === "sw-2")?.offers).toHaveLength(0);

    const updated = wizardDraftReducer(added, {
      type: "UPDATE_OFFER",
      saleWindowKey: "sw-1",
      key: "offer-1",
      patch: { maxQuantityPerOrder: 2 },
    });
    expect(updated.saleWindows.find((w) => w.key === "sw-1")?.offers[0]?.maxQuantityPerOrder).toBe(
      2,
    );

    const removed = wizardDraftReducer(updated, {
      type: "REMOVE_OFFER",
      saleWindowKey: "sw-1",
      key: "offer-1",
    });
    expect(removed.saleWindows.find((w) => w.key === "sw-1")?.offers).toHaveLength(0);
  });

  it("REMOVE_PERFORMANCEは、その公演だけを対象にしていたofferを削除し、通し券からは対象公演を外すだけにする", () => {
    const draft: WizardDraft = {
      ...withTwoPerformances(),
      saleWindows: [
        {
          ...buildSaleWindow("sw-1"),
          offers: [
            {
              key: "offer-single",
              isPass: false,
              performanceKeys: ["perf-1"],
              seatCategoryKey: "seat-1",
              maxQuantityPerOrder: 4,
              rates: [],
            },
            {
              key: "offer-pass",
              isPass: true,
              performanceKeys: ["perf-1", "perf-2"],
              seatCategoryKey: "seat-1",
              maxQuantityPerOrder: 2,
              rates: [],
            },
          ],
        },
      ],
    };

    const next = wizardDraftReducer(draft, { type: "REMOVE_PERFORMANCE", key: "perf-1" });

    const offers = next.saleWindows[0]?.offers ?? [];
    expect(offers.map((offer) => offer.key)).toEqual(["offer-pass"]);
    expect(offers[0]?.performanceKeys).toEqual(["perf-2"]);
  });

  it("REMOVE_SEAT_CATEGORYは、その席種を対象にしていたofferを丸ごと削除する", () => {
    const draft: WizardDraft = {
      ...buildEmptyDraft(),
      seatCategories: [{ key: "seat-1", name: "S席", active: true }],
      saleWindows: [
        {
          ...buildSaleWindow("sw-1"),
          offers: [
            {
              key: "offer-1",
              isPass: false,
              performanceKeys: ["perf-1"],
              seatCategoryKey: "seat-1",
              maxQuantityPerOrder: 4,
              rates: [],
            },
          ],
        },
      ],
    };

    const next = wizardDraftReducer(draft, { type: "REMOVE_SEAT_CATEGORY", key: "seat-1" });

    expect(next.saleWindows[0]?.offers).toEqual([]);
  });

  it("ADD_SALE_WINDOWはpublishesAtを空欄にせず現在時刻で初期化する(意図せぬ即時一般公開を防ぐ)", () => {
    const draft = buildEmptyDraft();

    const next = wizardDraftReducer(draft, { type: "ADD_SALE_WINDOW" });

    expect(next.saleWindows[0]?.publishesAt).not.toBe("");
    expect(next.saleWindows[0]?.publishesAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("MARK_PERFORMANCE_SAVED/MARK_SEAT_CATEGORY_SAVED/MARK_RATE_TYPE_SAVEDは、対象のkeyだけにサーバーIDを設定する", () => {
    const draft: WizardDraft = {
      ...withTwoPerformances(),
      seatCategories: [
        { key: "seat-1", name: "S席", active: true },
        { key: "seat-2", name: "A席", active: true },
      ],
      rateTypes: [
        { key: "rate-1", name: "大人" },
        { key: "rate-2", name: "子供" },
      ],
    };

    const afterPerformance = wizardDraftReducer(draft, {
      type: "MARK_PERFORMANCE_SAVED",
      key: "perf-1",
      id: "performance-server-id",
    });
    expect(afterPerformance.performances.find((p) => p.key === "perf-1")?.id).toBe(
      "performance-server-id",
    );
    expect(afterPerformance.performances.find((p) => p.key === "perf-2")?.id).toBeUndefined();

    const afterSeatCategory = wizardDraftReducer(draft, {
      type: "MARK_SEAT_CATEGORY_SAVED",
      key: "seat-1",
      id: "seat-category-server-id",
    });
    expect(afterSeatCategory.seatCategories.find((s) => s.key === "seat-1")?.id).toBe(
      "seat-category-server-id",
    );
    expect(afterSeatCategory.seatCategories.find((s) => s.key === "seat-2")?.id).toBeUndefined();

    const afterRateType = wizardDraftReducer(draft, {
      type: "MARK_RATE_TYPE_SAVED",
      key: "rate-1",
      id: "rate-type-server-id",
    });
    expect(afterRateType.rateTypes.find((r) => r.key === "rate-1")?.id).toBe("rate-type-server-id");
    expect(afterRateType.rateTypes.find((r) => r.key === "rate-2")?.id).toBeUndefined();
  });

  it("MARK_SALE_WINDOW_SAVED/MARK_OFFER_SAVEDは、対象の販売受付・offerだけにサーバーIDを設定する", () => {
    const draft: WizardDraft = {
      ...buildEmptyDraft(),
      saleWindows: [
        {
          ...buildSaleWindow("sw-1"),
          offers: [
            {
              key: "offer-1",
              isPass: false,
              performanceKeys: ["perf-1"],
              seatCategoryKey: "seat-1",
              maxQuantityPerOrder: 4,
              rates: [],
            },
          ],
        },
        buildSaleWindow("sw-2"),
      ],
    };

    const afterSaleWindow = wizardDraftReducer(draft, {
      type: "MARK_SALE_WINDOW_SAVED",
      key: "sw-1",
      id: "sale-window-server-id",
    });
    expect(afterSaleWindow.saleWindows.find((w) => w.key === "sw-1")?.id).toBe(
      "sale-window-server-id",
    );
    expect(afterSaleWindow.saleWindows.find((w) => w.key === "sw-2")?.id).toBeUndefined();

    const afterOffer = wizardDraftReducer(draft, {
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
    const hydrated: WizardDraft = {
      ...buildEmptyDraft(),
      eventId: "event-1",
      name: "既存イベント",
    };

    const next = wizardDraftReducer(draft, { type: "HYDRATE", draft: hydrated });

    expect(next).toEqual(hydrated);
  });
});

function withTwoPerformances(): WizardDraft {
  return {
    ...buildEmptyDraft(),
    performances: [
      { key: "perf-1", name: "", doorsOpenAt: "", startsAt: "" },
      { key: "perf-2", name: "", doorsOpenAt: "", startsAt: "" },
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
